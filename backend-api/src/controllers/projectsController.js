const multer = require('multer');
const { validateProject } = require('../validations/projectValidations');
const projectsService = require('../services/projectsService');
const {
  MAX_IMAGE_SIZE,
  validateImageFile,
} = require('../services/projectImageStorageService');

const uploadProjectImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 11,
    fields: 12,
    fieldSize: 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, GIF, and WebP images are supported');
      error.code = 'UNSUPPORTED_IMAGE_TYPE';
      return callback(error);
    }
    return callback(null, true);
  },
}).fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'otherImages', maxCount: 10 },
]);

const parseProjectImages = (req, res, next) => {
  uploadProjectImages(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Each image must be 5 MB or smaller'
          : ['LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code)
            ? 'A maximum of 10 other images and one cover image can be uploaded'
            : 'Invalid project image upload';
      return res.status(status).json({ error: message });
    }
    if (error.code === 'UNSUPPORTED_IMAGE_TYPE') {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  });
};

const createProject = async (req, res) => {
  const validation = validateProject(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const files = req.files || {};
  try {
    const allImages = [...(files.coverImage || []), ...(files.otherImages || [])];
    for (const image of allImages) {
      const imageValidation = validateImageFile(image);
      if (imageValidation.error) {
        return res.status(400).json({ error: imageValidation.error });
      }
    }

    const createdProject = await projectsService.createProject(
      req.authenticatedUser.id,
      validation.value,
      files
    );
    return res.status(201).json({
      project: {
        id: createdProject.id,
        ...validation.value,
      },
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Supabase Storage S3 credentials')) {
      console.error('Project image storage is not configured:', error.message);
      return res.status(503).json({ error: error.message });
    }
    console.error('Failed to create project:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }
};

const getProjects = async (req, res) => {
  try {
    const projects = await projectsService.getProjectsForUser(req.authenticatedUser.id);
    return res.json({ projects });
  } catch (error) {
    console.error('Failed to load projects:', error);
    return res.status(500).json({ error: 'Failed to load projects' });
  }
};

const getProject = async (req, res) => {
  try {
    const project = await projectsService.getProjectForUser(
      req.authenticatedUser.id,
      req.params.id
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    return res.json({ project });
  } catch (error) {
    console.error('Failed to load project:', error);
    return res.status(500).json({ error: 'Failed to load project' });
  }
};

const updateProject = async (req, res) => {
  const validation = validateProject(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  let removeImageUrls = [];
  if (req.body.removeImageUrls) {
    try {
      removeImageUrls = JSON.parse(req.body.removeImageUrls);
    } catch {
      return res.status(400).json({ error: 'Invalid image removal list' });
    }
    if (
      !Array.isArray(removeImageUrls) ||
      removeImageUrls.some((imageUrl) => typeof imageUrl !== 'string') ||
      new Set(removeImageUrls).size !== removeImageUrls.length
    ) {
      return res.status(400).json({ error: 'Invalid image removal list' });
    }
  }

  const files = req.files || {};
  const images = [...(files.coverImage || []), ...(files.otherImages || [])];
  for (const image of images) {
    const imageValidation = validateImageFile(image);
    if (imageValidation.error) {
      return res.status(400).json({ error: imageValidation.error });
    }
  }

  try {
    const project = await projectsService.updateProjectForUser(
      req.authenticatedUser.id,
      req.params.id,
      validation.value,
      files,
      removeImageUrls
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    return res.json({ project: { id: project.id, ...validation.value } });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Supabase Storage S3 credentials')) {
      console.error('Project image storage is not configured:', error.message);
      return res.status(503).json({ error: error.message });
    }
    if (error.status === 503) {
      return res.status(503).json({ error: error.message });
    }
    console.error('Failed to update project:', error);
    return res.status(500).json({ error: 'Failed to update project' });
  }
};

module.exports = {
  createProject,
  getProject,
  getProjects,
  parseProjectImages,
  updateProject,
};
