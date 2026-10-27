const test = require('node:test');
const assert = require('node:assert/strict');
const requireNonAdmin = require('./requireNonAdmin');

test('rejects admin users from the plans endpoint', () => {
  let nextCalled = false;
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  requireNonAdmin(
    { authenticatedUser: { role: ' Admin ' } },
    response,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(response.statusCode, 403);
  assert.match(response.body.error, /admin/i);
  assert.equal(nextCalled, false);
});

test('allows every non-admin authenticated role', () => {
  let nextCalled = false;

  requireNonAdmin(
    { authenticatedUser: { role: 'engineer' } },
    {},
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
});
