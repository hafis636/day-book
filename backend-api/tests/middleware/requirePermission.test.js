const test = require('node:test');
const assert = require('node:assert/strict');

const requirePermission = require('../../src/middleware/requirePermission');

test('allows an explicitly enabled permission', () => {
  const middleware = requirePermission('ADD_PROJECTS');
  const req = { authenticatedUser: { permissions: { ADD_PROJECTS: true } } };
  let nextCalled = false;
  const res = {
    status() {
      throw new Error('Enabled permission should not be rejected');
    },
  };

  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('rejects missing, false, or absent permissions', () => {
  const middleware = requirePermission('ADD_PROJECTS');

  for (const authenticatedUser of [
    { permissions: { ADD_PROJECTS: false } },
    { permissions: {} },
    {},
  ]) {
    const req = { authenticatedUser };
    let responseStatus;
    let responseBody;
    const res = {
      status(status) {
        responseStatus = status;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    middleware(req, res, () => {
      throw new Error('Disabled permission should not be allowed');
    });

    assert.equal(responseStatus, 403);
    assert.equal(responseBody.error, 'You do not have permission to perform this action');
  }
});
