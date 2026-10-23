const { pool } = require('../config/db');
const {
  deleteProjectImage,
  deleteProjectImageByUrl,
  toPublicImageUrl,
  uploadProjectImage,
} = require('./projectImageStorageService');

const projectStatusLabels = {
  'in discussion': 'In discussion',
  planning: 'Planning',
  ongoing: 'Ongoing',
  completed: 'Completed',
};

const createProject = async (engineerId, project, files) => {
  const client = await pool.connect();
  const uploadedImages = [];
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const result = await client.query(
      `INSERT INTO "daybook-dev-db".projects
         (engineer_id, name, description, project_type, status, start_date,
          expected_completion_date, actual_completion_date, address, project_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        engineerId,
        project.name,
        project.description,
        project.project_type,
        project.status,
        project.start_date,
        project.expected_completion_date,
        project.actual_completion_date,
        project.address,
        project.project_info,
      ]
    );
    const projectId = result.rows[0].id;
    const coverImage = files.coverImage?.[0];
    const otherImages = files.otherImages || [];
    const images = [
      ...(coverImage ? [{ file: coverImage, isCover: true, displayOrder: 0 }] : []),
      ...otherImages.map((file, index) => ({
        file,
        isCover: false,
        displayOrder: index + 1,
      })),
    ];

    for (const image of images) {
      const storedImage = await uploadProjectImage(projectId, image.file);
      uploadedImages.push(storedImage);
      const title = image.file.originalname.replace(/\\/g, '/').split('/').pop().slice(0, 255);
      await client.query(
        `INSERT INTO "daybook-dev-db".project_images
           (project_id, image_url, title, description, display_order, is_cover, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [projectId, storedImage.imageUrl, title, null, image.displayOrder, image.isCover]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return { id: projectId };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back project creation:', rollbackError);
      }
    }

    for (const image of uploadedImages) {
      try {
        await deleteProjectImage(image.key);
      } catch (cleanupError) {
        console.error('Failed to clean up project image after creation failure:', cleanupError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

const getProjectsForUser = async (userId) => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.project_type, p.status,
            COALESCE(cover.image_url, first_other.image_url) AS cover_image
     FROM "daybook-dev-db".projects AS p
     LEFT JOIN LATERAL (
       SELECT image_url
       FROM "daybook-dev-db".project_images
       WHERE project_id = p.id AND is_cover = TRUE
       ORDER BY display_order ASC, created_at ASC
       LIMIT 1
     ) AS cover ON TRUE
     LEFT JOIN LATERAL (
       SELECT image_url
       FROM "daybook-dev-db".project_images
       WHERE project_id = p.id AND is_cover IS NOT TRUE
       ORDER BY display_order ASC, created_at ASC
       LIMIT 1
     ) AS first_other ON TRUE
     WHERE p.engineer_id = $1
     ORDER BY p.id DESC`,
    [userId]
  );
  return result.rows.map((project) => ({
    ...project,
    cover_image: project.cover_image
      ? toPublicImageUrl(project.cover_image)
      : null,
  }));
};

const getProjectForUser = async (userId, projectId) => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.description, p.project_type, p.status,
            p.start_date, p.expected_completion_date, p.actual_completion_date,
            p.address, p.project_info,
            COALESCE(cover.image_url, first_other.image_url) AS cover_image
     FROM "daybook-dev-db".projects AS p
     LEFT JOIN LATERAL (
       SELECT image_url
       FROM "daybook-dev-db".project_images
       WHERE project_id = p.id AND is_cover = TRUE
       ORDER BY display_order ASC, created_at ASC
       LIMIT 1
     ) AS cover ON TRUE
     LEFT JOIN LATERAL (
       SELECT image_url
       FROM "daybook-dev-db".project_images
       WHERE project_id = p.id AND is_cover IS NOT TRUE
       ORDER BY display_order ASC, created_at ASC
       LIMIT 1
     ) AS first_other ON TRUE
     WHERE p.engineer_id = $1 AND p.id = $2
     LIMIT 1`,
    [userId, projectId]
  );
  const project = result.rows[0];
  if (!project) return null;
  const imagesResult = await pool.query(
    `SELECT image_url, title, is_cover, display_order
     FROM "daybook-dev-db".project_images
     WHERE project_id = $1
     ORDER BY display_order ASC, created_at ASC`,
    [projectId]
  );

  return {
    ...project,
    status: projectStatusLabels[project.status?.toLowerCase()] ?? project.status,
    cover_image: project.cover_image ? toPublicImageUrl(project.cover_image) : null,
    start_date: project.start_date?.toISOString?.().slice(0, 10) ?? project.start_date,
    expected_completion_date:
      project.expected_completion_date?.toISOString?.().slice(0, 10) ??
      project.expected_completion_date,
    actual_completion_date:
      project.actual_completion_date?.toISOString?.().slice(0, 10) ??
      project.actual_completion_date,
    images: imagesResult.rows.map((image) => ({
      ...image,
      image_url: toPublicImageUrl(image.image_url),
    })),
  };
};

const updateProjectForUser = async (userId, projectId, project, files, removeImageUrls) => {
  const client = await pool.connect();
  const uploadedImages = [];
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const ownedProject = await client.query(
      `SELECT id FROM "daybook-dev-db".projects
       WHERE engineer_id = $1 AND id = $2
       FOR UPDATE`,
      [userId, projectId]
    );
    if (!ownedProject.rows[0]) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return null;
    }

    const currentImagesResult = await client.query(
      `SELECT image_url, is_cover, display_order
       FROM "daybook-dev-db".project_images
       WHERE project_id = $1
       FOR UPDATE`,
      [projectId]
    );
    const currentImages = currentImagesResult.rows;
    const coverFile = files.coverImage?.[0];
    const imageUrlsToRemove = new Set(removeImageUrls);
    if (coverFile) {
      currentImages
        .filter((image) => image.is_cover === true)
        .forEach((image) => imageUrlsToRemove.add(toPublicImageUrl(image.image_url)));
    }

    const imagesToRemove = currentImages.filter((image) =>
      imageUrlsToRemove.has(toPublicImageUrl(image.image_url))
    );
    if (imagesToRemove.length !== imageUrlsToRemove.size) {
      const error = new Error('One or more selected images do not belong to this project');
      error.status = 400;
      throw error;
    }

    const remainingOtherImages = currentImages.filter(
      (image) => !imageUrlsToRemove.has(image.image_url) && image.is_cover !== true
    );
    const newOtherImages = files.otherImages || [];
    if (remainingOtherImages.length + newOtherImages.length > 10) {
      const error = new Error('A maximum of 10 other images can be kept on a project');
      error.status = 400;
      throw error;
    }

    const updateResult = await client.query(
      `UPDATE "daybook-dev-db".projects
       SET name = $3, description = $4, project_type = $5, status = $6,
           start_date = $7, expected_completion_date = $8,
           actual_completion_date = $9, address = $10, project_info = $11
       WHERE engineer_id = $1 AND id = $2
       RETURNING id`,
      [
        userId,
        projectId,
        project.name,
        project.description,
        project.project_type,
        project.status,
        project.start_date,
        project.expected_completion_date,
        project.actual_completion_date,
        project.address,
        project.project_info,
      ]
    );

    if (imagesToRemove.length) {
      await client.query(
        `DELETE FROM "daybook-dev-db".project_images
         WHERE project_id = $1 AND image_url = ANY($2::text[])`,
        [projectId, imagesToRemove.map((image) => image.image_url)]
      );
    }

    const imagesToInsert = [
      ...(coverFile ? [{ file: coverFile, isCover: true, displayOrder: 0 }] : []),
      ...newOtherImages.map((file, index) => ({
        file,
        isCover: false,
        displayOrder: remainingOtherImages.length + index + 1,
      })),
    ];
    for (const image of imagesToInsert) {
      const storedImage = await uploadProjectImage(projectId, image.file);
      uploadedImages.push(storedImage);
      const title = image.file.originalname.replace(/\\/g, '/').split('/').pop().slice(0, 255);
      await client.query(
        `INSERT INTO "daybook-dev-db".project_images
           (project_id, image_url, title, description, display_order, is_cover, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [projectId, storedImage.imageUrl, title, null, image.displayOrder, image.isCover]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    for (const image of imagesToRemove) {
      try {
        await deleteProjectImageByUrl(image.image_url);
      } catch (error) {
        console.error('Failed to delete removed project image from storage:', error);
        const cleanupError = new Error(
          'Project was updated, but one or more removed images could not be deleted from storage'
        );
        cleanupError.status = 503;
        throw cleanupError;
      }
    }

    return updateResult.rows[0] ?? null;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back project update:', rollbackError);
      }
      for (const image of uploadedImages) {
        try {
          await deleteProjectImage(image.key);
        } catch (cleanupError) {
          console.error('Failed to clean up project image after update failure:', cleanupError);
        }
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createProject,
  getProjectForUser,
  getProjectsForUser,
  updateProjectForUser,
};
