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
       SELECT p.id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $1
     FROM "daybook-dev-db".projects AS p
     WHERE p.engineer_id = $1 AND p.id = $2
     RETURNING ${paymentFields}`,
    [
      userId,
      projectId,
        payment.type || 'income',
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

const updateProjectPaymentForUser = async (userId, projectId, paymentId, payment) => {
  const result = await query(
    `UPDATE "daybook-dev-db".project_transactions AS t
     SET title = $4, description = $5, amount = $6, transaction_date = $7,
         category = $8, party_name = $9, payment_method = $10,
         reference_number = $11, status = $12
     FROM "daybook-dev-db".projects AS p
     WHERE t.project_id = p.id AND p.engineer_id = $1 AND p.id = $2 AND t.id = $3
     RETURNING t.id, t.project_id, t.type, t.title, t.description, t.amount,
               t.transaction_date, t.category, t.party_name, t.payment_method,
               t.reference_number, t.status, t.created_by, t.created_at`,
    [
      userId,
      projectId,
      paymentId,
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

const deleteProjectPaymentForUser = async (userId, projectId, paymentId) => {
  const result = await query(
    `DELETE FROM "daybook-dev-db".project_transactions AS t
     USING "daybook-dev-db".projects AS p
     WHERE t.project_id = p.id AND p.engineer_id = $1 AND p.id = $2 AND t.id = $3
     RETURNING t.id`,
    [userId, projectId, paymentId]
  );
  return result.rows[0] || null;
};

module.exports = {
  createProjectPaymentForUser,
  deleteProjectPaymentForUser,
  getProjectPaymentsForUser,
  updateProjectPaymentForUser,
};
