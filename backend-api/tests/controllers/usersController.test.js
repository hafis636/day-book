const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const usersService = require('../../src/services/usersService');
const { loginUser } = require('../../src/controllers/usersController');

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

test('rejects login for an inactive non-admin role', async (t) => {
  const originalAuthenticate = usersService.authenticateUser;
  usersService.authenticateUser = async () => ({
    id: 'user-id',
    role: 'ENGINEERS',
    roleIsActive: false,
  });
  t.after(() => {
    usersService.authenticateUser = originalAuthenticate;
  });

  const response = createResponse();
  let nextCalled = false;
  await loginUser(
    { body: { username: 'ada@example.com', password: 'Password1!' } },
    response,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    error: 'Your Account is not active, Contact Administrator for support',
  });
  assert.equal(nextCalled, false);
});

test('allows an inactive admin role to log in', async (t) => {
  const originalAuthenticate = usersService.authenticateUser;
  usersService.authenticateUser = async () => ({
    id: 'admin-id',
    role: ' admin ',
    roleIsActive: false,
  });
  t.after(() => {
    usersService.authenticateUser = originalAuthenticate;
  });

  const response = createResponse();
  let nextCalled = false;
  await loginUser(
    { body: { username: 'admin@example.com', password: 'Password1!' } },
    response,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, 200);
});

test('allows an active non-admin role to log in', async (t) => {
  const originalAuthenticate = usersService.authenticateUser;
  usersService.authenticateUser = async () => ({
    id: 'user-id',
    role: 'ENGINEERS',
    roleIsActive: true,
  });
  t.after(() => {
    usersService.authenticateUser = originalAuthenticate;
  });

  const request = { body: { username: 'ada@example.com', password: 'Password1!' } };
  const response = createResponse();
  await loginUser(request, response, () => {});

  assert.equal(request.authenticatedUserId, 'user-id');
  assert.equal(response.statusCode, 200);
});
