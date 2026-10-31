const multer = require('multer');
const { validateProject } = require('../validations/projectValidations');
const projectsService = require('../services/projectsService');
const {
  MAX_DOCUMENT_SIZE,
  MAX_IMAGE_SIZE,
  validateImageFile,
} = require('../services/projectImageStorageService');

const uploadProjectDocuments = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 10,
    fields: 8,
    fieldSize: 1024 * 1024,
  },
}).array('files', 10);

const parseProjectDocuments = (req, res, next) => {
  uploadProjectDocuments(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Each document must be 20 MB or smaller'
          : ['LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code)
            ? 'A maximum of 10 documents can be uploaded at once'
            : 'Invalid document upload';
      return res.status(status).json({ error: message });
    }
    return next(error);
  });
};

const getProjectDocuments = async (req, res) => {
  try {
    const documents = await projectsService.getProjectDocumentsForUser(
      req.authenticatedUser.id,
      req.params.id
    );
    return res.json({ documents });
  } catch (error) {
    console.error('Failed to load project documents:', error);
    return res.status(500).json({ error: 'Failed to load project documents' });
  }
};

const downloadProjectDocument = async (req, res) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const { id: projectId, documentId } = req.params;
  if (!uuidPattern.test(projectId) || !uuidPattern.test(documentId)) {
    return res.status(400).json({ error: 'Valid project and document IDs are required' });
  }

  try {
    const download = await projectsService.getProjectDocumentDownloadForUser(
      req.authenticatedUser.id,
      projectId,
      documentId
    );
    if (!download) return res.status(404).json({ error: 'Project document not found' });

    const storedFilename = decodeURIComponent(new URL(download.file_path).pathname.split('/').pop() || '');
    const extension = storedFilename.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] || '';
    const title = download.title || storedFilename || 'document';
    const filename = (extension && title.toLowerCase().endsWith(extension.toLowerCase())
      ? title
      : `${title}${extension}`)
      .replace(/[\\/\u0000-\u001f"]/g, '_')
      .trim();
    const encodedFilename = encodeURIComponent(filename);
    res.set({
      'Content-Type': download.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodedFilename}`,
      ...(download.contentLength ? { 'Content-Length': download.contentLength } : {}),
      'X-Content-Type-Options': 'nosniff',
    });

    download.body.on('error', (error) => {
      console.error('Failed to stream project document:', error);
      if (res.headersSent) res.destroy(error);
      else res.status(502).end();
    });
    return download.body.pipe(res);
  } catch (error) {
    if (error.message.includes('Supabase Storage S3 credentials')) {
      console.error('Project document storage is not configured:', error.message);
      return res.status(503).json({ error: error.message });
    }
    console.error('Failed to download project document:', error);
    return res.status(502).json({ error: 'Failed to download project document' });
  }
};

const deleteProjectDocument = async (req, res) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const { id: projectId, documentId } = req.params;
  if (!uuidPattern.test(projectId) || !uuidPattern.test(documentId)) {
    return res.status(400).json({ error: 'Valid project and document IDs are required' });
  }

  try {
    const result = await projectsService.deleteDraftProjectDocumentForUser(
      req.authenticatedUser.id,
      projectId,
      documentId
    );
    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Project document not found' });
    }
    if (result.status === 'not_draft') {
      return res.status(409).json({ error: 'Only draft documents can be deleted' });
    }
    return res.json({ success: true });
  } catch (error) {
    if (error.status === 503) {
      return res.status(503).json({ error: error.message });
    }
    if (error.message.includes('Supabase Storage S3 credentials')) {
      console.error('Project document storage is not configured:', error.message);
      return res.status(503).json({ error: error.message });
    }
    console.error('Failed to delete project document:', error);
    return res.status(500).json({ error: 'Failed to delete project document' });
  }
};

const updateProjectDocument = async (req, res) => {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const { id: projectId, documentId } = req.params;
  const { title, description, category, referenceNumber, date, reviewStatus, visibility } =
    req.body || {};
  const files = req.files || [];
  const validDate =
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) &&
    new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) === date;

  if (!uuidPattern.test(projectId) || !uuidPattern.test(documentId)) {
    return res.status(400).json({ error: 'Valid project and document IDs are required' });
  }
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Document title is required' });
  }
  if (title.trim().length > 255) {
    return res.status(400).json({ error: 'Document title cannot exceed 255 characters' });
  }
  if (
    ![
      'Legal & Approvals',
      'Drawings & Designs',
      'Contract & Commercial',
      'Quality & Testing',
      'Safety & Compliance',
      'Site Progress & Reports',
      'Other',
    ].includes(category)
  ) {
    return res.status(400).json({ error: 'A valid document category is required' });
  }
  if (files.length > 1) {
    return res.status(400).json({ error: 'Replace a document with one file at a time' });
  }
  if (date && !validDate) {
    return res.status(400).json({ error: 'Enter a valid document date' });
  }

  try {
    const result = await projectsService.updateProjectDocumentForUser(
      req.authenticatedUser.id,
      projectId,
      documentId,
      {
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        category,
        referenceNumber: typeof referenceNumber === 'string' ? referenceNumber.trim() : '',
        date: date || '',
        reviewStatus: typeof reviewStatus === 'string' ? reviewStatus.trim() : '',
        visibility: typeof visibility === 'string' ? visibility.trim() : '',
      },
      files[0]
    );
    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Project document not found' });
    }
    if (result.status === 'review_status_locked') {
      return res.status(409).json({
        error: 'This document review status cannot be changed to the selected status',
      });
    }
    return res.json({ document: result.document });
  } catch (error) {
    if (error.status === 503) {
      return res.status(503).json({ error: error.message });
    }
    if (error.message.includes('Supabase Storage S3 credentials')) {
      console.error('Project document storage is not configured:', error.message);
      return res.status(503).json({ error: error.message });
    }
    console.error('Failed to update project document:', error);
    return res.status(500).json({ error: 'Failed to update project document' });
  }
};

const createProjectDocuments = async (req, res) => {
  const projectId = req.params.id;
  const { title, description, category, referenceNumber, date, reviewStatus, visibility } =
    req.body || {};
  const files = req.files || [];
  const validDate =
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) &&
    new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) === date;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
    return res.status(400).json({ error: 'A valid project ID is required' });
  }
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Document title is required' });
  }
  if (title.trim().length > 255) {
    return res.status(400).json({ error: 'Document title cannot exceed 255 characters' });
  }
  if (
    ![
      'Legal & Approvals',
      'Drawings & Designs',
      'Contract & Commercial',
      'Quality & Testing',
      'Safety & Compliance',
      'Site Progress & Reports',
      'Other',
    ].includes(category)
  ) {
    return res.status(400).json({ error: 'A valid document category is required' });
  }
  if (!files.length) {
    return res.status(400).json({ error: 'Select at least one document file' });
  }
  if (date && !validDate) {
    return res.status(400).json({ error: 'Enter a valid document date' });
  }

  try {
    const documents = await projectsService.uploadProjectDocumentsForUser(
      req.authenticatedUser.id,
      projectId,
      {
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        category,
        referenceNumber: typeof referenceNumber === 'string' ? referenceNumber.trim() : '',
        date: date || '',
        reviewStatus: typeof reviewStatus === 'string' ? reviewStatus.trim() : '',
        visibility: typeof visibility === 'string' ? visibility.trim() : '',
      },
      files
    );
    if (!documents) return res.status(404).json({ error: 'Project not found' });
    return res.status(201).json({ documents });
  } catch (error) {
    if (error.message.includes('Supabase Storage S3 credentials')) {
      console.error('Project document storage is not configured:', error.message);
      return res.status(503).json({ error: error.message });
    }
    console.error('Failed to upload project documents:', error);
    return res.status(500).json({ error: 'Failed to upload project documents' });
  }
};

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
  createProjectDocuments,
  deleteProjectDocument,
  downloadProjectDocument,
  getProjectDocuments,
  updateProjectDocument,
  getProject,
  getProjects,
  parseProjectDocuments,
  parseProjectImages,
  updateProject,
};
