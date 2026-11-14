const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const db = require('../../src/config/db');
const labourWorkersService = require('../../src/services/labourWorkersService');

test('searches active workers by escaped name within their owner scope', async (t) => {
  const workers = [{ id: 'worker-1', name: 'Ravi Kumar' }];
  let statement;
  let parameters;
  const originalPoolQuery = db.pool.query;
  db.pool.query = async (sql, params) => {
    statement = sql;
    parameters = params;
    return { rows: workers };
  };
  t.after(() => {
    db.pool.query = originalPoolQuery;
  });

  const result =
    await labourWorkersService.searchActiveLabourWorkersForUser(
      'user-1',
      'Ravi_%'
    );

  assert.deepEqual(result, workers);
  assert.match(statement, /w\.created_by = \$1/);
  assert.match(statement, /w\.is_active IS TRUE/);
  assert.match(statement, /w\.name ILIKE \$2/);
  assert.match(statement, /w\.user_id/);
  assert.match(statement, /\(w\.user_id IS NOT NULL\) AS has_application_user/);
  assert.doesNotMatch(statement, /JOIN "daybook-dev-db"\.users/);
  assert.match(statement, /LIMIT 10/);
  assert.deepEqual(parameters, ['user-1', '%Ravi\\_\\%%']);
});

const assignmentInput = {
  labourId: null,
  labourName: 'Asha Patel',
  mobileNumber: '9876543210',
  email: 'asha@example.test',
  workType: 'INDIVIDUAL',
  skillType: 'Mason',
  address: '18 Market Road',
  workDescription: 'Wall repair',
  startDate: '2026-11-20',
  expectedEndDate: '2026-11-22',
  rate: 250,
  rateUnit: 'Per day',
  estimatedQuantity: 3,
  comments: 'Work safely',
};

const stubClient = (t, respond) => {
  const calls = [];
  let released = false;
  const client = {
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      return respond(sql, params, calls);
    },
    release: () => {
      released = true;
    },
  };
  const originalConnect = db.pool.connect;
  db.pool.connect = async () => client;
  t.after(() => {
    db.pool.connect = originalConnect;
  });
  return {
    calls,
    wasReleased: () => released,
  };
};

test('creates a new worker and assignment in one committed transaction', async (t) => {
  const savedAssignment = {
    id: 'assignment-1',
    labour_id: 'worker-new',
    labour_name: 'Asha Patel',
    estimated_amount: '750',
  };
  const fake = stubClient(t, async (sql, params) => {
    if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
    if (sql.includes('FROM "daybook-dev-db".projects')) {
      return { rows: [{ id: 'project-1' }] };
    }
    if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
    if (
      sql.includes('FROM "daybook-dev-db".labour_workers') &&
      sql.includes('mobile = $2')
    ) {
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO "daybook-dev-db".labour_workers')) {
      assert.deepEqual(params, [
        'Asha Patel',
        '9876543210',
        'asha@example.test',
        'INDIVIDUAL',
        'Mason',
        '18 Market Road',
        'owner-1',
      ]);
      assert.match(sql, /is_active, created_by, updated_by/);
      return { rows: [{ id: 'worker-new' }] };
    }
    if (sql.includes('INSERT INTO "daybook-dev-db".project_labour_assignments')) {
      assert.match(sql, /estimated_amount/);
      assert.match(sql, /\$7::numeric \* \$9::numeric/);
      assert.deepEqual(params.slice(0, 9), [
        'project-1',
        'worker-new',
        'INDIVIDUAL',
        'Wall repair',
        '2026-11-20',
        '2026-11-22',
        250,
        'Per day',
        3,
      ]);
      const savedComment = JSON.parse(params[9]);
      assert.deepEqual(Object.keys(savedComment).sort(), [
        'comment',
        'timestamp',
        'user',
      ]);
      assert.equal(savedComment.comment, 'Work safely');
      assert.equal(savedComment.user, 'Taylor Day');
      assert.equal(new Date(savedComment.timestamp).toISOString(), savedComment.timestamp);
      return { rows: [{ id: 'assignment-1' }] };
    }
    if (sql.includes('WHERE a.id = $1')) return { rows: [savedAssignment] };
    assert.fail(`Unexpected query: ${sql}`);
  });

  const result =
    await labourWorkersService.createProjectLabourAssignmentForUser(
      'owner-1',
      'project-1',
      assignmentInput,
      'Taylor Day'
    );

  assert.deepEqual(result, savedAssignment);
  assert.equal(fake.calls[0].sql, 'BEGIN');
  assert.equal(fake.calls.at(-1).sql, 'COMMIT');
  assert.equal(fake.calls.some(({ sql }) => sql === 'ROLLBACK'), false);
  assert.equal(fake.wasReleased(), true);
});

test('associates an existing active worker and avoids duplicate mobile records', async (t) => {
  const savedAssignment = { id: 'assignment-2', labour_id: 'worker-existing' };
  const fake = stubClient(t, async (sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
    if (sql.includes('FROM "daybook-dev-db".projects')) {
      return { rows: [{ id: 'project-1' }] };
    }
    if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
    if (
      sql.includes('FROM "daybook-dev-db".labour_workers') &&
      sql.includes('mobile = $2')
    ) {
      assert.match(sql, /created_by = \$1/);
      assert.match(sql, /is_active IS TRUE/);
      assert.match(sql, /FOR UPDATE/);
      return { rows: [{ id: 'worker-existing' }] };
    }
    if (sql.includes('INSERT INTO "daybook-dev-db".project_labour_assignments')) {
      assert.equal(sql.includes('INSERT INTO "daybook-dev-db".labour_workers'), false);
      assert.equal(fake.calls.at(-1).params[1], 'worker-existing');
      return { rows: [{ id: 'assignment-2' }] };
    }
    if (sql.includes('WHERE a.id = $1')) return { rows: [savedAssignment] };
    assert.fail(`Unexpected query: ${sql}`);
  });

  await labourWorkersService.createProjectLabourAssignmentForUser(
    'owner-1',
    'project-1',
    assignmentInput
  );
  assert.equal(
    fake.calls.filter(({ sql }) =>
      sql.includes('INSERT INTO "daybook-dev-db".labour_workers')
    ).length,
    0
  );
  assert.equal(fake.calls.at(-1).sql, 'COMMIT');
});

test('associates a selected worker only within the authenticated owner scope', async (t) => {
  const input = {
    ...assignmentInput,
    labourId: 'worker-selected',
  };
  const fake = stubClient(t, async (sql, params) => {
    if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
    if (sql.includes('FROM "daybook-dev-db".projects')) {
      assert.deepEqual(params, ['owner-1', 'project-1']);
      return { rows: [{ id: 'project-1' }] };
    }
    if (
      sql.includes('FROM "daybook-dev-db".labour_workers') &&
      sql.includes('id = $1')
    ) {
      assert.deepEqual(params, ['worker-selected', 'owner-1']);
      assert.match(sql, /created_by = \$2/);
      assert.match(sql, /is_active IS TRUE/);
      return { rows: [{ id: 'worker-selected' }] };
    }
    if (sql.includes('INSERT INTO "daybook-dev-db".project_labour_assignments')) {
      assert.equal(params[1], 'worker-selected');
      return { rows: [{ id: 'assignment-3' }] };
    }
    if (sql.includes('WHERE a.id = $1')) {
      return { rows: [{ id: 'assignment-3', labour_id: 'worker-selected' }] };
    }
    assert.fail(`Unexpected query: ${sql}`);
  });

  const result =
    await labourWorkersService.createProjectLabourAssignmentForUser(
      'owner-1',
      'project-1',
      input
    );
  assert.equal(result.labour_id, 'worker-selected');
  assert.equal(fake.calls.at(-1).sql, 'COMMIT');
});

test('rolls back worker creation if assignment insertion fails', async (t) => {
  const fake = stubClient(t, async (sql) => {
    if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
    if (sql.includes('FROM "daybook-dev-db".projects')) {
      return { rows: [{ id: 'project-1' }] };
    }
    if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
    if (
      sql.includes('FROM "daybook-dev-db".labour_workers') &&
      sql.includes('mobile = $2')
    ) {
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO "daybook-dev-db".labour_workers')) {
      return { rows: [{ id: 'worker-new' }] };
    }
    if (sql.includes('INSERT INTO "daybook-dev-db".project_labour_assignments')) {
      throw new Error('assignment insert failed');
    }
    assert.fail(`Unexpected query: ${sql}`);
  });

  await assert.rejects(
    labourWorkersService.createProjectLabourAssignmentForUser(
      'owner-1',
      'project-1',
      assignmentInput
    ),
    /assignment insert failed/
  );
  assert.equal(fake.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(fake.calls.some(({ sql }) => sql === 'COMMIT'), false);
  assert.equal(fake.wasReleased(), true);
});

test('does not create assignments for projects outside the owner scope', async (t) => {
  const fake = stubClient(t, async (sql) => {
    if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
    if (sql.includes('FROM "daybook-dev-db".projects')) return { rows: [] };
    assert.fail(`Unexpected query after failed project scope: ${sql}`);
  });

  await assert.rejects(
    labourWorkersService.createProjectLabourAssignmentForUser(
      'other-owner',
      'project-1',
      assignmentInput
    ),
    (error) => error.status === 404 && /Project not found/.test(error.message)
  );
  assert.equal(fake.calls.at(-1).sql, 'ROLLBACK');
});

test('lists joined assignments only after confirming project ownership', async (t) => {
  const assignments = [{ id: 'assignment-1', labour_name: 'Asha Patel' }];
  const calls = [];
  const originalPoolQuery = db.pool.query;
  db.pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes('FROM "daybook-dev-db".projects')) {
      return { rows: [{ id: 'project-1' }] };
    }
    return { rows: assignments };
  };
  t.after(() => {
    db.pool.query = originalPoolQuery;
  });

  const result =
    await labourWorkersService.getProjectLabourAssignmentsForUser(
      'owner-1',
      'project-1'
    );
  assert.deepEqual(result, assignments);
  assert.deepEqual(calls[0].params, ['owner-1', 'project-1']);
  assert.match(calls[0].sql, /engineer_id = \$1/);
  assert.match(calls[1].sql, /project_labour_assignments/);
  assert.match(calls[1].sql, /LEFT JOIN.*labour_workers/s);

  calls.length = 0;
  db.pool.query = async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [] };
  };
  const hidden = await labourWorkersService.getProjectLabourAssignmentsForUser(
    'other-owner',
    'project-1'
  );
  assert.equal(hidden, null);
  assert.equal(calls.length, 1);
});

test('rejects a selected worker that is inactive or owned by another user', async (t) => {
  const fake = stubClient(t, async (sql) => {
    if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
    if (sql.includes('FROM "daybook-dev-db".projects')) {
      return { rows: [{ id: 'project-1' }] };
    }
    if (sql.includes('FROM "daybook-dev-db".labour_workers')) {
      assert.match(sql, /created_by = \$2/);
      assert.match(sql, /is_active IS TRUE/);
      return { rows: [] };
    }
    assert.fail(`Unexpected query after invalid worker: ${sql}`);
  });

  await assert.rejects(
    labourWorkersService.createProjectLabourAssignmentForUser(
      'owner-1',
      'project-1',
      { ...assignmentInput, labourId: 'foreign-worker' }
    ),
    (error) =>
      error.status === 404 && /Active labour worker not found/.test(error.message)
  );
  assert.equal(fake.calls.at(-1).sql, 'ROLLBACK');
});
