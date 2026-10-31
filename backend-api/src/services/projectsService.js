const { pool } = require('../config/db');
const {
  deleteProjectImage,
  deleteProjectImageByUrl,
  downloadProjectDocumentByUrl,
  toPublicImageUrl,
  uploadProjectDocument,
  uploadProjectImage,
} = require('./projectImageStorageService');

const projectStatusLabels = {
  'in discussion': 'In discussion',
  planning: 'Planning',
  ongoing: 'Ongoing',
  completed: 'Completed',
};

const createProject = async (engineerId, project, files) => {
  if (!engineerId) {
    throw new Error('An authenticated user ID is required to create a project');
  }

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
        `INSERT INTO "daybook-dev-db".project_documents
           (project_id, file_path, file_type, title, reference_number, display_order,
            is_cover, visibility, created_by, is_active)
         VALUES ($1, $2, 'image', $3, '0', $4, $5, 'Public', $6, TRUE)`,
        [projectId, storedImage.imageUrl, title, image.displayOrder, image.isCover, engineerId]
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
            COALESCE(cover.file_path, first_other.file_path) AS cover_image
     FROM "daybook-dev-db".projects AS p
     LEFT JOIN LATERAL (
       SELECT file_path
       FROM "daybook-dev-db".project_documents
       WHERE project_id = p.id AND file_type IN ('image', 'images') AND is_cover = TRUE
       ORDER BY display_order ASC, created_at ASC
       LIMIT 1
     ) AS cover ON TRUE
     LEFT JOIN LATERAL (
       SELECT file_path
       FROM "daybook-dev-db".project_documents
       WHERE project_id = p.id AND file_type IN ('image', 'images') AND is_cover IS NOT TRUE
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
            COALESCE(cover.file_path, first_other.file_path) AS cover_image
     FROM "daybook-dev-db".projects AS p
     LEFT JOIN LATERAL (
       SELECT file_path
       FROM "daybook-dev-db".project_documents
       WHERE project_id = p.id AND file_type IN ('image', 'images') AND is_cover = TRUE
       ORDER BY display_order ASC, created_at ASC
       LIMIT 1
     ) AS cover ON TRUE
     LEFT JOIN LATERAL (
       SELECT file_path
       FROM "daybook-dev-db".project_documents
       WHERE project_id = p.id AND file_type IN ('image', 'images') AND is_cover IS NOT TRUE
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
    `SELECT file_path AS image_url, title, is_cover, display_order
     FROM "daybook-dev-db".project_documents
     WHERE project_id = $1 AND file_type IN ('image', 'images')
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

const getProjectDocumentsForUser = async (userId, projectId) => {
  const result = await pool.query(
    `SELECT d.id, d.file_path, d.title, d.description, d.file_type,
            d.reference_number, d.display_order, d.review_status,
            d.review_comments, d.reviewed_by, d.reviewed_at, d.visibility,
            d.document_date, d.expiry_date, d.created_by, d.created_at
     FROM "daybook-dev-db".project_documents AS d
     INNER JOIN "daybook-dev-db".projects AS p ON p.id = d.project_id
     WHERE p.engineer_id = $1 AND d.project_id = $2
       AND d.is_active = TRUE AND d.file_type NOT IN ('image', 'images')
     ORDER BY d.created_at DESC, d.display_order ASC`,
    [userId, projectId]
  );

  return result.rows;
};

const getProjectDocumentDownloadForUser = async (userId, projectId, documentId) => {
  if (!userId) {
    throw new Error('An authenticated user ID is required to download a project document');
  }

  const result = await pool.query(
    `SELECT d.file_path, d.title
     FROM "daybook-dev-db".project_documents AS d
     INNER JOIN "daybook-dev-db".projects AS p ON p.id = d.project_id
     WHERE p.engineer_id = $1 AND d.project_id = $2 AND d.id = $3
       AND d.is_active = TRUE AND d.file_type NOT IN ('image', 'images')
     LIMIT 1`,
    [userId, projectId, documentId]
  );
  const document = result.rows[0];
  if (!document) return null;

  return {
    title: document.title,
    file_path: document.file_path,
    ...await downloadProjectDocumentByUrl(document.file_path),
  };
};

const deleteDraftProjectDocumentForUser = async (userId, projectId, documentId) => {
  if (!userId) {
    throw new Error('An authenticated user ID is required to delete a project document');
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const result = await client.query(
      `SELECT d.id, d.file_path, d.review_status
       FROM "daybook-dev-db".project_documents AS d
       INNER JOIN "daybook-dev-db".projects AS p ON p.id = d.project_id
       WHERE p.engineer_id = $1 AND d.project_id = $2 AND d.id = $3
         AND d.is_active = TRUE AND d.file_type NOT IN ('image', 'images')
       FOR UPDATE OF d`,
      [userId, projectId, documentId]
    );
    const document = result.rows[0];
    if (!document) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return { status: 'not_found' };
    }

    if (document.review_status?.toUpperCase() !== 'DRAFT') {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return { status: 'not_draft' };
    }

    await client.query(
      `DELETE FROM "daybook-dev-db".project_documents
       WHERE id = $1`,
      [documentId]
    );

    try {
      await deleteProjectImageByUrl(document.file_path);
    } catch (error) {
      console.error('Failed to delete project document from storage:', error);
      error.status = 503;
      throw error;
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return { status: 'deleted' };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back project document deletion:', rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

const updateProjectDocumentForUser = async (
  userId,
  projectId,
  documentId,
  document,
  replacementFile
) => {
  if (!userId) {
    throw new Error('An authenticated user ID is required to update a project document');
  }

  const client = await pool.connect();
  let uploadedFile;
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const currentResult = await client.query(
      `SELECT d.id, d.file_path, d.review_status
       FROM "daybook-dev-db".project_documents AS d
       INNER JOIN "daybook-dev-db".projects AS p ON p.id = d.project_id
       WHERE p.engineer_id = $1 AND d.project_id = $2 AND d.id = $3
         AND d.is_active = TRUE AND d.file_type NOT IN ('image', 'images')
       FOR UPDATE OF d`,
      [userId, projectId, documentId]
    );
    const currentDocument = currentResult.rows[0];
    if (!currentDocument) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return { status: 'not_found' };
    }

    const currentReviewStatus = currentDocument.review_status || 'DRAFT';
    const normalizedCurrentStatus = currentReviewStatus.toUpperCase();
    const normalizedRequestedStatus = document.reviewStatus?.trim().toUpperCase();
    const lockedReviewStatuses = new Set(['APPROVED', 'REJECTED', 'ARCHIVED']);
    if (
      (lockedReviewStatuses.has(normalizedCurrentStatus) &&
        normalizedRequestedStatus &&
        normalizedRequestedStatus !== normalizedCurrentStatus) ||
      (normalizedCurrentStatus !== 'DRAFT' && normalizedRequestedStatus === 'DRAFT')
    ) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return { status: 'review_status_locked' };
    }

    const reviewStatus = lockedReviewStatuses.has(normalizedCurrentStatus)
      ? currentReviewStatus
      : document.reviewStatus || currentReviewStatus;

    if (replacementFile) {
      uploadedFile = await uploadProjectDocument(projectId, replacementFile);
    }
    const result = await client.query(
      `UPDATE "daybook-dev-db".project_documents
       SET file_path = COALESCE($2, file_path),
           title = $3,
           description = NULLIF($4, ''),
           file_type = $5,
           reference_number = COALESCE(NULLIF($6, ''), 'V1.0'),
           review_status = $7,
           visibility = COALESCE(NULLIF($8, ''), 'PROJECT_TEAM'),
           document_date = NULLIF($9, '')::date
       WHERE id = $1
       RETURNING id, file_path, title, description, file_type, reference_number,
                 display_order, review_status, review_comments, reviewed_by,
                 reviewed_at, visibility, document_date, expiry_date, created_by,
                 created_at`,
      [
        documentId,
        uploadedFile?.fileUrl || null,
        document.title,
        document.description || '',
        document.category,
        document.referenceNumber || '',
        reviewStatus,
        document.visibility || '',
        document.date || '',
      ]
    );

    if (uploadedFile) {
      await deleteProjectImageByUrl(currentDocument.file_path);
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return { status: 'updated', document: result.rows[0] };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back project document update:', rollbackError);
      }
    }
    if (uploadedFile) {
      try {
        await deleteProjectImage(uploadedFile.key);
      } catch (cleanupError) {
        console.error('Failed to clean up replacement document after update failure:', cleanupError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

const uploadProjectDocumentsForUser = async (userId, projectId, document, files) => {
  if (!userId) {
    throw new Error('An authenticated user ID is required to upload project documents');
  }

  const client = await pool.connect();
  const uploadedFiles = [];
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

    const savedDocuments = [];
    for (const file of files) {
      const storedFile = await uploadProjectDocument(projectId, file);
      uploadedFiles.push(storedFile);
      const result = await client.query(
        `INSERT INTO "daybook-dev-db".project_documents
           (project_id, file_path, title, description, file_type, reference_number,
            review_status, visibility, document_date, created_by)
         VALUES ($1, $2, $3, $4, $5, COALESCE(NULLIF($6, ''), 'V1.0'),
                 COALESCE(NULLIF($7, ''), 'DRAFT'),
                 COALESCE(NULLIF($8, ''), 'PROJECT_TEAM'), NULLIF($9, '')::date, $10)
         RETURNING id, file_path, title, description, file_type, reference_number,
                   display_order, review_status, review_comments, reviewed_by,
                   reviewed_at, visibility, document_date, expiry_date, created_by,
                   created_at`,
        [
          projectId,
          storedFile.fileUrl,
          document.title,
          document.description || null,
          document.category,
          document.referenceNumber || '',
          document.reviewStatus || '',
          document.visibility || '',
          document.date || '',
          userId,
        ]
      );
      savedDocuments.push(result.rows[0]);
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return savedDocuments;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back project document upload:', rollbackError);
      }
    }

    for (const file of uploadedFiles) {
      try {
        await deleteProjectImage(file.key);
      } catch (cleanupError) {
        console.error('Failed to clean up project document after upload failure:', cleanupError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

const updateProjectForUser = async (userId, projectId, project, files, removeImageUrls) => {
  if (!userId) {
    throw new Error('An authenticated user ID is required to update a project');
  }

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
      `SELECT file_path, is_cover, display_order
       FROM "daybook-dev-db".project_documents
       WHERE project_id = $1 AND file_type IN ('image', 'images')
       FOR UPDATE`,
      [projectId]
    );
    const currentImages = currentImagesResult.rows;
    const coverFile = files.coverImage?.[0];
    const imageUrlsToRemove = new Set(removeImageUrls);
    if (coverFile) {
      currentImages
        .filter((image) => image.is_cover === true)
        .forEach((image) => imageUrlsToRemove.add(toPublicImageUrl(image.file_path)));
    }

    const imagesToRemove = currentImages.filter((image) =>
      imageUrlsToRemove.has(toPublicImageUrl(image.file_path))
    );
    if (imagesToRemove.length !== imageUrlsToRemove.size) {
      const error = new Error('One or more selected images do not belong to this project');
      error.status = 400;
      throw error;
    }

    const remainingOtherImages = currentImages.filter(
      (image) =>
        !imageUrlsToRemove.has(toPublicImageUrl(image.file_path)) &&
        image.is_cover !== true
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
        `DELETE FROM "daybook-dev-db".project_documents
         WHERE project_id = $1 AND file_type IN ('image', 'images') AND file_path = ANY($2::text[])`,
        [projectId, imagesToRemove.map((image) => image.file_path)]
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
        `INSERT INTO "daybook-dev-db".project_documents
           (project_id, file_path, file_type, title, reference_number, display_order,
            is_cover, visibility, created_by, is_active)
         VALUES ($1, $2, 'image', $3, '0', $4, $5, 'Public', $6, TRUE)`,
        [projectId, storedImage.imageUrl, title, image.displayOrder, image.isCover, userId]
      );
    }

    await client.query('COMMIT');
    transactionStarted = false;

    for (const image of imagesToRemove) {
      try {
        await deleteProjectImageByUrl(image.file_path);
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
  deleteDraftProjectDocumentForUser,
  getProjectDocumentsForUser,
  getProjectDocumentDownloadForUser,
  updateProjectDocumentForUser,
  getProjectForUser,
  getProjectsForUser,
  uploadProjectDocumentsForUser,
  updateProjectForUser,
};
