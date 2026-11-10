const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const projectEventsService = require('../../src/services/projectEventsService');
const { parseProjectDocuments } = require('../../src/controllers/projectsController');
const {
  createProjectEvent,
  getProjectEvents,
} = require('../../src/controllers/projectEventsController');

const projectId = '123e4567-e89b-42d3-a456-426614174000';
const eventBody = {
  title: 'Foundation inspection',
  event_type: 'INSPECTION',
  start_date: '2026-11-10',
};

const createResponse = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('loads persisted project events for the authenticated project owner', async (t) => {
  const originalGet = projectEventsService.getProjectEventsForUser;
  const events = [{ id: 'event-1', title: 'Foundation inspection' }];
  let getArgs;
  projectEventsService.getProjectEventsForUser = async (...args) => {
    getArgs = args;
    return events;
  };
  t.after(() => {
    projectEventsService.getProjectEventsForUser = originalGet;
  });

  const response = createResponse();
  await getProjectEvents(
    {
      params: { id: projectId },
      authenticatedUser: { id: 'user-1' },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(getArgs, ['user-1', projectId]);
  assert.deepEqual(response.body.events, events);
});

test('creates a project event for the authenticated user', async (t) => {
  const originalCreate = projectEventsService.createProjectEventForUser;
  let createArgs;
  projectEventsService.createProjectEventForUser = async (...args) => {
    createArgs = args;
    return { id: 'event-1', ...args[2], created_by: args[0] };
  };
  t.after(() => {
    projectEventsService.createProjectEventForUser = originalCreate;
  });

  const response = createResponse();
  const files = [{ originalname: 'inspection.pdf', buffer: Buffer.from('file') }];
  await createProjectEvent(
    {
      params: { id: projectId },
      authenticatedUser: { id: 'user-1' },
      body: eventBody,
      files,
    },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createArgs[0], 'user-1');
  assert.equal(createArgs[1], projectId);
  assert.equal(createArgs[2].event_status, 'PLANNED');
  assert.equal(createArgs[2].priority, 'NORMAL');
  assert.equal(createArgs[3], files);
  assert.equal(response.body.event.created_by, 'user-1');
});

test('parses multipart event fields and attachment before validating', async (t) => {
  const originalCreate = projectEventsService.createProjectEventForUser;
  projectEventsService.createProjectEventForUser = async (userId, id, event, files) => ({
    id: 'event-1',
    ...event,
    created_by: userId,
    received_files: files.map((file) => file.originalname),
  });
  t.after(() => {
    projectEventsService.createProjectEventForUser = originalCreate;
  });

  const app = express();
  app.use(express.json());
  app.post(
    '/projects/:id/events',
    parseProjectDocuments,
    (req, res, next) => {
      req.authenticatedUser = { id: 'user-1' };
      next();
    },
    createProjectEvent
  );
  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const body = new FormData();
  Object.entries({
    title: 'Foundation stone',
    description: 'Foundation stone laid',
    event_type: 'MILESTONE',
    event_status: 'COMPLETED',
    project_phase: 'FOUNDATION',
    start_date: '2026-08-01',
    end_date: '2026-08-01',
    priority: 'HIGH',
  }).forEach(([key, value]) => body.append(key, value));
  body.append('files', new Blob(['event attachment']), 'foundation-stone.pdf');

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/projects/${projectId}/events`,
    { method: 'POST', body }
  );
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.event.title, 'Foundation stone');
  assert.deepEqual(result.event.received_files, ['foundation-stone.pdf']);
});

test('rejects invalid project IDs and event details without persisting', async (t) => {
  const originalCreate = projectEventsService.createProjectEventForUser;
  projectEventsService.createProjectEventForUser = async () => {
    assert.fail('invalid event must not be persisted');
  };
  t.after(() => {
    projectEventsService.createProjectEventForUser = originalCreate;
  });

  const invalidProjectResponse = createResponse();
  await createProjectEvent(
    { params: { id: 'not-a-uuid' }, body: eventBody },
    invalidProjectResponse
  );
  assert.equal(invalidProjectResponse.statusCode, 400);

  const invalidEventResponse = createResponse();
  await createProjectEvent(
    { params: { id: projectId }, body: { ...eventBody, end_date: '2026-11-09' } },
    invalidEventResponse
  );
  assert.equal(invalidEventResponse.statusCode, 400);
});

test('returns 404 when the project is not owned by the authenticated user', async (t) => {
  const originalCreate = projectEventsService.createProjectEventForUser;
  projectEventsService.createProjectEventForUser = async () => null;
  t.after(() => {
    projectEventsService.createProjectEventForUser = originalCreate;
  });

  const response = createResponse();
  await createProjectEvent(
    {
      params: { id: projectId },
      authenticatedUser: { id: 'user-1' },
      body: eventBody,
    },
    response
  );

  assert.equal(response.statusCode, 404);
});
