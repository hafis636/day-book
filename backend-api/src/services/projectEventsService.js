const { pool, query } = require('../config/db');
const {
  deleteProjectImage,
  uploadProjectDocument,
} = require('./projectImageStorageService');

const getProjectEventsForUser = async (userId, projectId) => {
  const project = await query(
    `SELECT id
     FROM "daybook-dev-db".projects
     WHERE engineer_id = $1 AND id = $2`,
    [userId, projectId]
  );
  if (!project.rows[0]) return null;

  const result = await query(
    `SELECT e.id, e.project_id, e.title, e.description, e.event_type,
            e.event_status, e.project_phase, e.start_date, e.end_date,
            e.priority, e.assigned_to, e.created_by, e.updated_by,
            e.created_at, e.updated_at,
            COALESCE(
              json_agg(json_build_object(
                'id', d.id,
                'name', d.title,
                'file_path', d.file_path
              ))
                FILTER (WHERE d.id IS NOT NULL),
              '[]'::json
            ) AS files
     FROM "daybook-dev-db".project_events AS e
     LEFT JOIN "daybook-dev-db".project_documents AS d
       ON d.project_id = e.project_id
      AND d.file_type = 'event_file'
       AND d.event_id = e.id
      AND d.is_active = TRUE
     WHERE e.project_id = $1
     GROUP BY e.id
     ORDER BY e.start_date, e.created_at, e.id`,
    [projectId]
  );
  return result.rows;
};

const createProjectEventForUser = async (userId, projectId, event, files = []) => {
  const client = await pool.connect();
  const uploadedFiles = [];
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const result = await client.query(
      `INSERT INTO "daybook-dev-db".project_events
         (project_id, title, description, event_type, event_status, project_phase,
          start_date, end_date, priority, assigned_to, created_by)
       SELECT p.id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $1
       FROM "daybook-dev-db".projects AS p
       WHERE p.engineer_id = $1 AND p.id = $2
       RETURNING id, project_id, title, description, event_type, event_status,
                 project_phase, start_date, end_date, priority, assigned_to,
                 created_by, updated_by, created_at, updated_at`,
      [
        userId,
        projectId,
        event.title,
        event.description,
        event.event_type,
        event.event_status,
        event.project_phase,
        event.start_date,
        event.end_date,
        event.priority,
        event.assigned_to,
      ]
    );

    const savedEvent = result.rows[0];
    if (!savedEvent) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return null;
    }

    const savedFiles = [];
    for (const file of files) {
      const storedFile = await uploadProjectDocument(projectId, file);
      uploadedFiles.push(storedFile);
      const title = file.originalname.replace(/\\/g, '/').split('/').pop().slice(0, 255);
      const documentResult = await client.query(
        `INSERT INTO "daybook-dev-db".project_documents
           (project_id, file_path, title, file_type, reference_number,
              review_status, visibility, event_id, created_by, is_active)
         VALUES ($1, $2, $3, 'event_file', 'V1.0', 'DRAFT',
                   'PROJECT_TEAM', $4, $5, TRUE)
         RETURNING id, file_path, title`,
        [projectId, storedFile.fileUrl, title, savedEvent.id, userId]
      );
      savedFiles.push(documentResult.rows[0]);
    }

    await client.query('COMMIT');
    transactionStarted = false;
    return {
      ...savedEvent,
      files: savedFiles.map(({ id, title, file_path }) => ({
        id,
        name: title,
        file_path,
      })),
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back project event creation:', rollbackError);
      }
    }

    for (const file of uploadedFiles) {
      try {
        await deleteProjectImage(file.key);
      } catch (cleanupError) {
        console.error('Failed to clean up event file after creation failure:', cleanupError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { createProjectEventForUser, getProjectEventsForUser };
