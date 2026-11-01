const test = require('node:test');
const assert = require('node:assert/strict');
const requireAdmin = require('./requireAdmin');

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

test('allows an authenticated administrator', () => {
  let nextCalled = false;
  const response = createResponse();

  requireAdmin(
    { authenticatedUser: { role: ' ADMIN ' } },
    response,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, 200);
});

test('rejects non-admin users', () => {
  const response = createResponse();
  requireAdmin({ authenticatedUser: { role: 'engineer' } }, response, () => {
    assert.fail('next should not be called');
  });

  assert.equal(response.statusCode, 403);
  assert.match(response.body.error, /administrator/i);
});
