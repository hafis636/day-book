const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';

const { pool } = require('../config/db');
const storage = require('./projectImageStorageService');
const deletedUrls = [];
const uploadedFiles = [];
const downloadedUrls = [];
storage.deleteProjectImageByUrl = async (url) => deletedUrls.push(url);
storage.deleteProjectImage = async () => {};
storage.uploadProjectDocument = async () => {
  const uploaded = {
    key: 'projects/project-1/documents/new-file.pdf',
    fileUrl: 'https://storage.example/new-file.pdf',
  };
  uploadedFiles.push(uploaded);
  return uploaded;
};
storage.downloadProjectDocumentByUrl = async (url) => {
  downloadedUrls.push(url);
  return {
    body: { streamed: true },
    contentType: 'application/pdf',
    contentLength: 42,
  };
};
const projectsService = require('./projectsService');

const makeClient = (document) => {
  const calls = [];
  const client = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('SELECT d.id, d.file_path')) {
        return { rows: document ? [document] : [] };
      }
      if (sql.includes('RETURNING id, file_path, title')) {
        return {
          rows: [
            {
              id: 'document-1',
              file_path: 'https://storage.example/new-file.pdf',
              title: 'Revised plan',
            },
          ],
        };
      }
      return { rows: [] };
    },
    release: () => {},
  };
  return { client, calls };
};

test('delete enforces project ownership and draft-only restrictions', async () => {
  const { client, calls } = makeClient({
    id: 'document-1',
    file_path: 'https://storage.example/approved.pdf',
    review_status: 'APPROVED',
  });
  pool.connect = async () => client;
  deletedUrls.length = 0;

  const result = await projectsService.deleteDraftProjectDocumentForUser(
    'engineer-1',
    'project-1',
    'document-1'
  );

  assert.deepEqual(result, { status: 'not_draft' });
  assert.match(calls[1].sql, /p\.engineer_id = \$1/);
  assert.deepEqual(calls[1].params, ['engineer-1', 'project-1', 'document-1']);
  assert.equal(calls.some(({ sql }) => sql.includes('DELETE FROM')), false);
  assert.deepEqual(deletedUrls, []);
});

test('delete removes the stored file and permanently deletes a draft record', async () => {
  const { client, calls } = makeClient({
    id: 'document-1',
    file_path: 'https://storage.example/draft.pdf',
    review_status: 'DRAFT',
  });
  pool.connect = async () => client;
  deletedUrls.length = 0;

  const result = await projectsService.deleteDraftProjectDocumentForUser(
    'engineer-1',
    'project-1',
    'document-1'
  );

  assert.deepEqual(result, { status: 'deleted' });
  assert.deepEqual(deletedUrls, ['https://storage.example/draft.pdf']);
  assert.ok(calls.some(({ sql }) => sql.includes('DELETE FROM "daybook-dev-db".project_documents')));
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
  assert.equal(calls.some(({ sql }) => sql.includes('SET is_active = FALSE')), false);
});

test('document updates are available for reviewed documents and replace the old file', async () => {
  const { client, calls } = makeClient({
    id: 'document-1',
    file_path: 'https://storage.example/approved.pdf',
    review_status: 'APPROVED',
  });
  pool.connect = async () => client;
  deletedUrls.length = 0;
  uploadedFiles.length = 0;

  const result = await projectsService.updateProjectDocumentForUser(
    'engineer-1',
    'project-1',
    'document-1',
    {
      title: 'Revised plan',
      description: 'Updated drawing',
      category: 'Drawings & Designs',
      referenceNumber: 'D-2',
      date: '2026-10-30',
      reviewStatus: 'Approved',
      visibility: 'Project Team',
    },
    { originalname: 'new-file.pdf', mimetype: 'application/pdf', buffer: Buffer.from('new') }
  );

  assert.equal(result.status, 'updated');
  assert.match(calls[1].sql, /p\.engineer_id = \$1/);
  assert.match(calls[1].sql, /FOR UPDATE OF d/);
  assert.ok(calls.some(({ sql }) => sql.includes('UPDATE "daybook-dev-db".project_documents')));
  assert.deepEqual(deletedUrls, ['https://storage.example/approved.pdf']);
  assert.equal(uploadedFiles.length, 1);
});

test('document updates preserve locked review statuses', async () => {
  const { client, calls } = makeClient({
    id: 'document-1',
    file_path: 'https://storage.example/approved.pdf',
    review_status: 'APPROVED',
  });
  pool.connect = async () => client;

  const result = await projectsService.updateProjectDocumentForUser(
    'engineer-1',
    'project-1',
    'document-1',
    {
      title: 'Revised plan',
      category: 'Drawings & Designs',
      reviewStatus: 'Pending',
    },
    undefined
  );

  assert.deepEqual(result, { status: 'review_status_locked' });
  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.equal(calls.some(({ sql }) => sql.includes('UPDATE "daybook-dev-db".project_documents')), false);
});

test('document updates do not allow a non-draft status to return to Draft', async () => {
  const { client, calls } = makeClient({
    id: 'document-1',
    file_path: 'https://storage.example/pending.pdf',
    review_status: 'PENDING',
  });
  pool.connect = async () => client;

  const result = await projectsService.updateProjectDocumentForUser(
    'engineer-1',
    'project-1',
    'document-1',
    {
      title: 'Revised plan',
      category: 'Drawings & Designs',
      reviewStatus: 'Draft',
    },
    undefined
  );

  assert.deepEqual(result, { status: 'review_status_locked' });
  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.equal(calls.some(({ sql }) => sql.includes('UPDATE "daybook-dev-db".project_documents')), false);
});

test('download lookup verifies project ownership before retrieving the stored object', async () => {
  let query;
  pool.query = async (sql, params) => {
    query = { sql, params };
    return {
      rows: [
        {
          title: 'Plans',
          file_path: 'https://storage.example/projects/project-1/plan.pdf',
        },
      ],
    };
  };
  downloadedUrls.length = 0;

  const result = await projectsService.getProjectDocumentDownloadForUser(
    'engineer-1',
    'project-1',
    'document-1'
  );

  assert.match(query.sql, /p\.engineer_id = \$1/);
  assert.match(query.sql, /d\.id = \$3/);
  assert.deepEqual(query.params, ['engineer-1', 'project-1', 'document-1']);
  assert.deepEqual(downloadedUrls, ['https://storage.example/projects/project-1/plan.pdf']);
  assert.deepEqual(result, {
    title: 'Plans',
    file_path: 'https://storage.example/projects/project-1/plan.pdf',
    body: { streamed: true },
    contentType: 'application/pdf',
    contentLength: 42,
  });
});
