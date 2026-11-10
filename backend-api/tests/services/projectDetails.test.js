const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const { pool } = require('../../src/config/db');
const projectsService = require('../../src/services/projectsService');

test('project detail includes payments, expenses, documents, and events', async (t) => {
  const originalQuery = pool.query;
  const transactions = [
    { id: 'payment-1', type: 'income' },
    { id: 'expense-1', type: 'expense' },
  ];
  const documents = [{ id: 'document-1', title: 'Project plan' }];
  const events = [{ id: 'event-1', title: 'Foundation complete', files: [] }];
  let documentQuery;

  pool.query = async (sql) => {
    if (sql.includes('FROM "daybook-dev-db".projects AS p')) {
      return {
        rows: [{
          id: 'project-1',
          name: 'Aqua Bay Apartments',
          start_date: '2026-07-31',
        }],
      };
    }
    if (sql.includes('SELECT file_path AS image_url')) {
      return { rows: [] };
    }
    if (sql.includes('SELECT id') && sql.includes('engineer_id = $1')) {
      return { rows: [{ id: 'project-1' }] };
    }
    if (sql.includes('FROM "daybook-dev-db".project_transactions')) {
      return { rows: transactions };
    }
    if (sql.includes('FROM "daybook-dev-db".project_documents AS d')) {
      documentQuery = sql;
      return { rows: documents };
    }
    if (sql.includes('FROM "daybook-dev-db".project_events AS e')) {
      return { rows: events };
    }
    throw new Error(`Unexpected project detail query: ${sql}`);
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const project = await projectsService.getProjectForUser('engineer-1', 'project-1');

  assert.deepEqual(project.payments, [transactions[0]]);
  assert.deepEqual(project.expenses, [transactions[1]]);
  assert.deepEqual(project.documents, documents);
  assert.deepEqual(project.events, events);
  assert.match(documentQuery, /d\.file_type NOT IN \('image', 'images', 'event_file'\)/);
});
