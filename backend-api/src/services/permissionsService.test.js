const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const { pool } = require('../config/db');
const permissionsService = require('./permissionsService');

test('lists permission rows in key order using the confirmed columns', async (t) => {
  const originalQuery = pool.query;
  let statement;
  pool.query = async (sql, params) => {
    statement = { sql, params };
    return { rows: [{ id: 'perm-1', permission_key: 'PROJECT_READ', plan_ids: ['BASIC'], role_ids: ['role-1'] }] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const permissions = await permissionsService.getAdminPermissions();
  assert.equal(permissions[0].permission_key, 'PROJECT_READ');
  assert.match(statement.sql, /SELECT id, permission_key, plan_ids, role_ids, description, is_active/);
  assert.match(statement.sql, /ORDER BY permission_key/);
  assert.equal(statement.params, undefined);
});

test('validates catalogs and persists plan codes and role IDs as JSON', async (t) => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (/FROM "daybook-dev-db"\.roles/.test(sql)) {
      return { rows: [{ id: 'role-1' }] };
    }
    if (/FROM "daybook-dev-db"\.subscription_plans/.test(sql)) {
      return { rows: [{ plan_code: 'BASIC' }] };
    }
    return {
      rows: [{
        id: 'perm-1',
        permission_key: params[0],
        plan_ids: JSON.parse(params[1]),
        role_ids: JSON.parse(params[2]),
        description: params[3],
        is_active: params[4],
      }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const permission = await permissionsService.createAdminPermission({
    permissionKey: 'PROJECT_READ',
    roleIds: ['role-1'],
    planCodes: ['BASIC'],
    description: 'Read projects',
    isActive: false,
  });

  assert.equal(permission.id, 'perm-1');
  assert.match(calls[0].sql, /id::text = ANY\(\$1::text\[\]\)/);
  assert.match(calls[0].sql, /role_code::text\)\) <> 'ADMIN'/);
  assert.match(calls[1].sql, /plan_code = ANY\(\$1::text\[\]\)/);
  assert.match(calls[1].sql, /<> 'ADMIN'/);
  assert.match(calls[2].sql, /plan_ids, role_ids, description, is_active/);
  assert.match(calls[2].sql, /\$2::json, \$3::json/);
  assert.deepEqual(calls[2].params, [
    'PROJECT_READ',
    '["BASIC"]',
    '["role-1"]',
    'Read projects',
    false,
  ]);
});

test('rejects assignments missing from catalogs, including administrator entries', async (t) => {
  const originalQuery = pool.query;
  let insertAttempted = false;
  pool.query = async (sql) => {
    if (/INSERT INTO/.test(sql)) insertAttempted = true;
    if (/FROM "daybook-dev-db"\.roles/.test(sql)) return { rows: [] };
    if (/FROM "daybook-dev-db"\.subscription_plans/.test(sql)) return { rows: [] };
    return { rows: [] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  await assert.rejects(
    permissionsService.createAdminPermission({
      permissionKey: 'PROJECT_READ',
      roleIds: ['admin-id'],
      planCodes: ['BASIC'],
      description: '',
      isActive: true,
    }),
    { code: 'INVALID_ROLE_ASSIGNMENT' }
  );
  assert.equal(insertAttempted, false);
});

test('rejects empty assignments before catalog queries or persistence', async (t) => {
  const originalQuery = pool.query;
  let queryCount = 0;
  pool.query = async () => {
    queryCount += 1;
    return { rows: [] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  for (const [roleIds, planCodes, errorCode] of [
    [[], ['BASIC'], 'INVALID_ROLE_ASSIGNMENT'],
    [['role-1'], [], 'INVALID_PLAN_ASSIGNMENT'],
  ]) {
    await assert.rejects(
      permissionsService.createAdminPermission({
        permissionKey: 'PROJECT_READ',
        roleIds,
        planCodes,
        description: '',
        isActive: true,
      }),
      { code: errorCode }
    );
  }
  assert.equal(queryCount, 0);
});

test('updates JSON assignments without changing the permission key and matches IDs as text', async (t) => {
  const originalQuery = pool.query;
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (/FROM "daybook-dev-db"\.roles/.test(sql)) return { rows: [{ id: 'role-2' }] };
    if (/FROM "daybook-dev-db"\.subscription_plans/.test(sql)) return { rows: [{ plan_code: 'PRO' }] };
    return {
      rows: [{
        id: '9223372036854775807',
        permission_key: 'PROJECT_READ',
        plan_ids: JSON.parse(params[0]),
        role_ids: JSON.parse(params[1]),
        description: params[2],
        is_active: params[3],
      }],
    };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  const permission = await permissionsService.updateAdminPermission(
    '9223372036854775807',
    {
      roleIds: ['role-2'],
      planCodes: ['PRO'],
      description: 'Updated access',
      isActive: false,
    }
  );

  assert.equal(permission.permission_key, 'PROJECT_READ');
  assert.deepEqual(permission.role_ids, ['role-2']);
  assert.deepEqual(permission.plan_ids, ['PRO']);
  assert.match(calls[2].sql, /SET plan_ids = \$1::json,\s*role_ids = \$2::json/);
  assert.match(calls[2].sql, /WHERE id::text = \$5::text/);
  assert.doesNotMatch(calls[2].sql, /SET[^]*permission_key\s*=/);
  assert.deepEqual(calls[2].params, [
    '["PRO"]',
    '["role-2"]',
    'Updated access',
    false,
    '9223372036854775807',
  ]);
});

test('rejects unavailable update assignments before updating', async (t) => {
  const originalQuery = pool.query;
  let updateAttempted = false;
  pool.query = async (sql) => {
    if (/UPDATE "daybook-dev-db"\.permissions/.test(sql)) updateAttempted = true;
    if (/FROM "daybook-dev-db"\.roles/.test(sql)) return { rows: [] };
    return { rows: [] };
  };
  t.after(() => {
    pool.query = originalQuery;
  });

  await assert.rejects(
    permissionsService.updateAdminPermission('perm-1', {
      roleIds: ['admin-id'],
      planCodes: ['PRO'],
      description: '',
      isActive: true,
    }),
    { code: 'INVALID_ROLE_ASSIGNMENT' }
  );
  assert.equal(updateAttempted, false);
});
