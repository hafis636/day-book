const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const router = require('../../src/routes/index');

test('protects role management routes with authentication and administrator checks', () => {
  const roleRoutes = router.stack
    .filter((layer) => layer.route?.path === '/admin/roles')
    .map((layer) => ({
      method: layer.route.methods.get
        ? 'get'
        : layer.route.methods.post
          ? 'post'
          : 'patch',
      handlers: layer.route.stack.map((item) => item.handle.name),
    }));

  assert.deepEqual(roleRoutes, [
    {
      method: 'get',
      handlers: ['requireAuthenticatedSession', 'requireAdmin', 'getAdminRoles'],
    },
    {
      method: 'post',
      handlers: ['requireAuthenticatedSession', 'requireAdmin', 'createAdminRole'],
    },
  ]);
});

test('protects role updates with authentication and administrator checks', () => {
  const updateRoute = router.stack.find(
    (layer) => layer.route?.path === '/admin/roles/:roleId'
  );

  assert.equal(updateRoute.route.methods.patch, true);
  assert.deepEqual(updateRoute.route.stack.map((item) => item.handle.name), [
    'requireAuthenticatedSession',
    'requireAdmin',
    'updateAdminRole',
  ]);
});

test('protects permission listing and creation with authentication and administrator checks', () => {
  const permissionRoutes = router.stack
    .filter((layer) => layer.route?.path === '/admin/permissions')
    .map((layer) => ({
      method: layer.route.methods.get ? 'get' : 'post',
      handlers: layer.route.stack.map((item) => item.handle.name),
    }));

  assert.deepEqual(permissionRoutes, [
    {
      method: 'get',
      handlers: ['requireAuthenticatedSession', 'requireAdmin', 'getAdminPermissions'],
    },
    {
      method: 'post',
      handlers: ['requireAuthenticatedSession', 'requireAdmin', 'createAdminPermission'],
    },
  ]);
});

test('protects permission updates with authentication and administrator checks', () => {
  const updateRoute = router.stack.find(
    (layer) => layer.route?.path === '/admin/permissions/:permissionId'
  );

  assert.equal(updateRoute.route.methods.patch, true);
  assert.deepEqual(updateRoute.route.stack.map((item) => item.handle.name), [
    'requireAuthenticatedSession',
    'requireAdmin',
    'updateAdminPermission',
  ]);
});

test('keeps the existing public roles endpoint available', () => {
  const publicRolesRoute = router.stack.find((layer) => layer.route?.path === '/roles');

  assert.equal(publicRolesRoute.route.methods.get, true);
  assert.deepEqual(publicRolesRoute.route.stack.map((item) => item.handle.name), ['getRoles']);
});

test('protects customer plan selection with authentication and non-admin checks', () => {
  const selectPlanRoute = router.stack.find(
    (layer) => layer.route?.path === '/plans/:planCode'
  );

  assert.equal(selectPlanRoute.route.methods.patch, true);
  assert.deepEqual(selectPlanRoute.route.stack.map((item) => item.handle.name), [
    'requireAuthenticatedSession',
    'requireNonAdmin',
    'selectPlan',
  ]);
});

test('requires ADD_DOCUMENT permission to upload project documents', () => {
  const uploadRoute = router.stack.find(
    (layer) => layer.route?.path === '/projects/:id/documents' && layer.route.methods.post
  );
  const permissionMiddleware = uploadRoute.route.stack[1].handle;
  let responseStatus;
  let responseBody;

  permissionMiddleware(
    { authenticatedUser: { permissions: { ADD_DOCUMENT: false } } },
    {
      status(status) {
        responseStatus = status;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    },
    () => {
      throw new Error('Document upload should require ADD_DOCUMENT permission');
    }
  );

  assert.equal(responseStatus, 403);
  assert.equal(responseBody.error, 'You do not have permission to perform this action');
});

test('protects review comment creation with authentication', () => {
  const reviewRoute = router.stack.find(
    (layer) => layer.route?.path === '/projects/:id/documents/:documentId/review-comments'
  );

  assert.equal(reviewRoute.route.methods.post, true);
  assert.equal(reviewRoute.route.stack.length, 3);
  assert.equal(reviewRoute.route.stack[0].handle.name, 'requireAuthenticatedSession');
  assert.equal(reviewRoute.route.stack[2].handle.name, 'addProjectDocumentReviewComment');
});

test('requires REVIEW_DOCUMENT permission to add review comments', () => {
  const reviewRoute = router.stack.find(
    (layer) => layer.route?.path === '/projects/:id/documents/:documentId/review-comments'
  );
  const permissionMiddleware = reviewRoute.route.stack[1].handle;
  let responseStatus;
  let responseBody;

  permissionMiddleware(
    { authenticatedUser: { permissions: { REVIEW_DOCUMENT: false } } },
    {
      status(status) {
        responseStatus = status;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    },
    () => {
      throw new Error('Review comments should require REVIEW_DOCUMENT permission');
    }
  );

  assert.equal(responseStatus, 403);
  assert.equal(responseBody.error, 'You do not have permission to perform this action');
});

test('creates review comments with the authenticated user name and timestamp', async () => {
  const reviewRoute = router.stack.find(
    (layer) => layer.route?.path === '/projects/:id/documents/:documentId/review-comments'
  );
  const handler = reviewRoute.route.stack[2].handle;
  const projectsService = require('../../src/services/projectsService');
  const originalAddComment = projectsService.addProjectDocumentReviewCommentForUser;
  let savedComment;
  projectsService.addProjectDocumentReviewCommentForUser = async (
    userId,
    projectId,
    documentId,
    comment
  ) => {
    savedComment = { userId, projectId, documentId, comment };
    return { review_comments: [comment] };
  };
  let responseBody;

  try {
    await handler(
      {
        params: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          documentId: '550e8400-e29b-41d4-a716-446655440001',
        },
        body: { comment: '  Please revise sheet two.  ' },
        authenticatedUser: {
          id: 'user-1',
          first_name: 'Taylor',
          last_name: 'Day',
        },
      },
      {
        json(body) {
          responseBody = body;
          return this;
        },
      }
    );
  } finally {
    projectsService.addProjectDocumentReviewCommentForUser = originalAddComment;
  }

  assert.equal(savedComment.userId, 'user-1');
  assert.equal(savedComment.comment.comment, 'Please revise sheet two.');
  assert.equal(savedComment.comment.added, 'Taylor Day');
  assert.deepEqual(Object.keys(savedComment.comment).sort(), ['added', 'added_on', 'comment']);
  assert.equal(
    new Date(savedComment.comment.added_on).toISOString(),
    savedComment.comment.added_on
  );
  assert.deepEqual(responseBody.review_comments, [savedComment.comment]);
});
