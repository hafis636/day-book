const { pool } = require('../config/db');
const {
  deleteProjectImage,
  uploadProjectImage,
} = require('./projectImageStorageService');

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

module.exports = { createProject };
