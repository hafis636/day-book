const { query } = require('../config/db');

const paymentFields = `id, project_id, type, title, description, amount, transaction_date,
                       category, party_name, payment_method, reference_number, status,
                       created_by, created_at`;

const getProjectPaymentsForUser = async (userId, projectId) => {
  const project = await query(
    `SELECT id
     FROM "daybook-dev-db".projects
     WHERE engineer_id = $1 AND id = $2`,
    [userId, projectId]
  );
  if (!project.rows[0]) return null;

  const result = await query(
    `SELECT ${paymentFields}
     FROM "daybook-dev-db".project_transactions
     WHERE project_id = $1
     ORDER BY created_at DESC, id DESC`,
    [projectId]
  );
  return result.rows;
};

const createProjectPaymentForUser = async (userId, projectId, payment) => {
  const result = await query(
    `INSERT INTO "daybook-dev-db".project_transactions
       (project_id, type, title, description, amount, transaction_date, category,
        party_name, payment_method, reference_number, status, created_by)
     SELECT p.id, 'income', $3, $4, $5, $6, $7, $8, $9, $10, $11, $1
     FROM "daybook-dev-db".projects AS p
     WHERE p.engineer_id = $1 AND p.id = $2
     RETURNING ${paymentFields}`,
    [
      userId,
      projectId,
      payment.title,
      payment.description,
      payment.amount,
      payment.transaction_date,
      payment.category,
      payment.party_name,
      payment.payment_method,
      payment.reference_number,
      payment.status,
    ]
  );
  return result.rows[0] || null;
};

module.exports = { createProjectPaymentForUser, getProjectPaymentsForUser };
