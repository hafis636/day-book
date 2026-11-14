const { pool, query } = require('../config/db');

const assignmentFields = `
  a.id, a.project_id, a.labour_id, a.work_type, a.work_description,
  a.start_date, a.expected_end_date, a.rate, a.rate_unit,
  a.estimated_quantity, a.estimated_amount, a.status, a.comments,
  a.created_by, a.created_at, a.updated_by, a.updated_at,
  w.name AS labour_name, w.mobile, w.email, w.worker_type AS worker_type,
  w.skill_type, w.address`;

const createServiceError = (message, status = 404) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const searchActiveLabourWorkersForUser = async (userId, name) => {
  const searchTerm = name.replace(/[\\%_]/g, '\\$&');
  const result = await query(
    `SELECT w.id, w.name, w.mobile, w.email, w.worker_type AS work_type,
            w.skill_type, w.address, w.user_id,
            (w.user_id IS NOT NULL) AS has_application_user
     FROM "daybook-dev-db".labour_workers AS w
     WHERE w.created_by = $1
       AND w.is_active IS TRUE
       AND w.name ILIKE $2 ESCAPE '\\'
     ORDER BY w.name
     LIMIT 10`,
    [userId, `%${searchTerm}%`]
  );

  return result.rows;
};

const getProjectLabourAssignmentsForUser = async (userId, projectId) => {
  const project = await query(
    `SELECT id
     FROM "daybook-dev-db".projects
     WHERE engineer_id = $1 AND id = $2`,
    [userId, projectId]
  );
  if (!project.rows[0]) return null;

  const result = await query(
    `SELECT ${assignmentFields}
     FROM "daybook-dev-db".project_labour_assignments AS a
     LEFT JOIN "daybook-dev-db".labour_workers AS w ON w.id = a.labour_id
     WHERE a.project_id = $1
     ORDER BY a.created_at DESC, a.id DESC`,
    [projectId]
  );
  return result.rows;
};

const createProjectLabourAssignmentForUser = async (
  userId,
  projectId,
  assignment,
  userName
) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const projectResult = await client.query(
      `SELECT id
       FROM "daybook-dev-db".projects
       WHERE engineer_id = $1 AND id = $2
       FOR UPDATE`,
      [userId, projectId]
    );
    if (!projectResult.rows[0]) {
      throw createServiceError('Project not found');
    }

    let labourId = assignment.labourId;
    if (labourId) {
      const workerResult = await client.query(
        `SELECT id
         FROM "daybook-dev-db".labour_workers
         WHERE id = $1 AND created_by = $2 AND is_active IS TRUE
         FOR UPDATE`,
        [labourId, userId]
      );
      if (!workerResult.rows[0]) {
        throw createServiceError('Active labour worker not found');
      }
    } else {
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
        [userId, assignment.mobileNumber]
      );
      const existingWorker = await client.query(
        `SELECT id
         FROM "daybook-dev-db".labour_workers
         WHERE created_by = $1 AND mobile = $2 AND is_active IS TRUE
         ORDER BY created_at, id
         LIMIT 1
         FOR UPDATE`,
        [userId, assignment.mobileNumber]
      );

      if (existingWorker.rows[0]) {
        labourId = existingWorker.rows[0].id;
      } else {
        const workerResult = await client.query(
          `INSERT INTO "daybook-dev-db".labour_workers
             (name, mobile, email, worker_type, skill_type, address,
              is_active, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $7)
           RETURNING id`,
          [
            assignment.labourName,
            assignment.mobileNumber,
            assignment.email,
            assignment.workType,
            assignment.skillType,
            assignment.address,
            userId,
          ]
        );
        labourId = workerResult.rows[0].id;
      }
    }

    const inserted = await client.query(
      `INSERT INTO "daybook-dev-db".project_labour_assignments
         (project_id, labour_id, work_type, work_description, start_date,
          expected_end_date, rate, rate_unit, estimated_quantity,
          estimated_amount, status, comments, created_by, updated_by)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7::numeric, $8, $9::varchar,
          $7::numeric * $9::numeric, 'ACTIVE', $10::jsonb, $11, $11)
       RETURNING id`,
      [
        projectId,
        labourId,
        assignment.workType,
        assignment.workDescription,
        assignment.startDate,
        assignment.expectedEndDate || null,
        assignment.rate,
        assignment.rateUnit,
        assignment.estimatedQuantity,
        JSON.stringify({
          comment: assignment.comments || '',
          user: userName,
          timestamp: new Date().toISOString(),
        }),
        userId,
      ]
    );

    const savedResult = await client.query(
      `SELECT ${assignmentFields}
       FROM "daybook-dev-db".project_labour_assignments AS a
       LEFT JOIN "daybook-dev-db".labour_workers AS w ON w.id = a.labour_id
       WHERE a.id = $1`,
      [inserted.rows[0].id]
    );

    await client.query('COMMIT');
    transactionStarted = false;
    return savedResult.rows[0];
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back labour assignment creation:', rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createProjectLabourAssignmentForUser,
  getProjectLabourAssignmentsForUser,
  searchActiveLabourWorkersForUser,
};
