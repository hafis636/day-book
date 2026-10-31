const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';

const projectsService = require('../services/projectsService');
const { downloadProjectDocument } = require('./projectsController');

class MockResponse extends Writable {
  constructor() {
    super();
    this.headers = {};
    this.statusCode = 200;
    this.chunks = [];
    this.started = false;
  }

  _write(chunk, encoding, callback) {
    this.started = true;
    this.chunks.push(chunk);
    callback();
  }

  set(headers) {
    Object.assign(this.headers, headers);
    return this;
  }

  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  }

  json(body) {
    this.body = body;
    this.end();
    return this;
  }

  get headersSent() {
    return this.started;
  }
}

test('download controller streams owned document with attachment headers', async (t) => {
  const originalDownload = projectsService.getProjectDocumentDownloadForUser;
  projectsService.getProjectDocumentDownloadForUser = async (...args) => {
    assert.deepEqual(args, [
      'engineer-1',
      '123e4567-e89b-42d3-a456-426614174000',
      '123e4567-e89b-42d3-a456-426614174001',
    ]);
    return {
      title: 'Plans',
      file_path: 'https://storage.example/projects/project-1/plan.pdf',
      contentType: 'application/pdf',
      contentLength: 4,
      body: Readable.from([Buffer.from('plan')]),
    };
  };
  t.after(() => {
    projectsService.getProjectDocumentDownloadForUser = originalDownload;
  });

  const response = new MockResponse();
  const finished = new Promise((resolve, reject) => {
    response.on('finish', resolve);
    response.on('error', reject);
  });
  await downloadProjectDocument(
    {
      params: {
        id: '123e4567-e89b-42d3-a456-426614174000',
        documentId: '123e4567-e89b-42d3-a456-426614174001',
      },
      authenticatedUser: { id: 'engineer-1' },
    },
    response
  );
  await finished;

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['Content-Type'], 'application/pdf');
  assert.equal(response.headers['Content-Length'], 4);
  assert.match(response.headers['Content-Disposition'], /^attachment;/);
  assert.match(response.headers['Content-Disposition'], /filename="Plans\.pdf"/);
  assert.equal(Buffer.concat(response.chunks).toString(), 'plan');
});
