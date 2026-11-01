const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const router = require('./index');

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

test('keeps the existing public roles endpoint available', () => {
  const publicRolesRoute = router.stack.find((layer) => layer.route?.path === '/roles');

  assert.equal(publicRolesRoute.route.methods.get, true);
  assert.deepEqual(publicRolesRoute.route.stack.map((item) => item.handle.name), ['getRoles']);
});
