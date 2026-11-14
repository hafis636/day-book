const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const labourWorkersService = require('../../src/services/labourWorkersService');
const {
  createProjectLabourAssignment,
  getProjectLabourAssignments,
  searchLabourWorkers,
  validateAssignment,
} = require('../../src/controllers/labourWorkersController');

const projectId = '123e4567-e89b-42d3-a456-426614174000';
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

test('searches active labour workers for the authenticated user', async (t) => {
  const originalSearch =
    labourWorkersService.searchActiveLabourWorkersForUser;
  const workers = [{ id: 'worker-1', name: 'Ravi Kumar', mobile: '1234567890' }];
  let searchArgs;
  labourWorkersService.searchActiveLabourWorkersForUser = async (...args) => {
    searchArgs = args;
    return workers;
  };
  t.after(() => {
    labourWorkersService.searchActiveLabourWorkersForUser = originalSearch;
  });

  const response = createResponse();
  await searchLabourWorkers(
    {
      query: { name: '  Ravi  ' },
      authenticatedUser: { id: 'user-1' },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(searchArgs, ['user-1', 'Ravi']);
  assert.deepEqual(response.body.labourWorkers, workers);
});

test('rejects short labour name searches without querying the service', async (t) => {
  const originalSearch =
    labourWorkersService.searchActiveLabourWorkersForUser;
  labourWorkersService.searchActiveLabourWorkersForUser = async () => {
    assert.fail('short searches must not reach the service');
  };
  t.after(() => {
    labourWorkersService.searchActiveLabourWorkersForUser = originalSearch;
  });

  const response = createResponse();
  await searchLabourWorkers({ query: { name: 'ab' } }, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /at least 3 characters/);
});

test('validates required assignment fields, allowed types, quantities and dates', () => {
  const valid = {
    labourName: '  Asha Patel ',
    mobileNumber: ' 9876543210 ',
    workType: ' individual ',
    startDate: '2026-11-20',
    expectedEndDate: '2026-11-21',
    rate: '0',
    rateUnit: ' Per day ',
    estimatedQuantity: '2',
    comments: '  Site entry  ',
  };
  const result = validateAssignment(valid);

  assert.equal(result.error, undefined);
  assert.equal(result.value.labourName, 'Asha Patel');
  assert.equal(result.value.workType, 'INDIVIDUAL');
  assert.equal(result.value.rate, 0);
  assert.equal(result.value.comments, 'Site entry');
  assert.match(validateAssignment({ ...valid, mobileNumber: '1234567890' }).error, /valid 10-digit mobile number/);
  assert.match(validateAssignment({ ...valid, mobileNumber: '987654321' }).error, /valid 10-digit mobile number/);
  assert.match(validateAssignment({ ...valid, workType: 'VISITOR' }).error, /Work type/);
  assert.match(validateAssignment({ ...valid, rate: '-1' }).error, /Rate/);
  assert.match(validateAssignment({ ...valid, estimatedQuantity: '0' }).error, /quantity/);
  assert.match(validateAssignment({ ...valid, startDate: '2026-02-30' }).error, /start date/);
  assert.match(
    validateAssignment({ ...valid, expectedEndDate: '2026-11-19' }).error,
    /on or after/
  );
  assert.match(validateAssignment({ ...valid, comments: {} }).error, /comments must be a string/);
});

test('lists project assignments for the authenticated owner and hides other projects', async (t) => {
  const originalGet = labourWorkersService.getProjectLabourAssignmentsForUser;
  const assignments = [{ id: 'assignment-1' }];
  let getArgs;
  labourWorkersService.getProjectLabourAssignmentsForUser = async (...args) => {
    getArgs = args;
    return assignments;
  };
  t.after(() => {
    labourWorkersService.getProjectLabourAssignmentsForUser = originalGet;
  });

  const response = createResponse();
  await getProjectLabourAssignments(
    { params: { id: projectId }, authenticatedUser: { id: 'owner-1' } },
    response
  );
  assert.equal(response.statusCode, 200);
  assert.deepEqual(getArgs, ['owner-1', projectId]);
  assert.deepEqual(response.body.assignments, assignments);

  labourWorkersService.getProjectLabourAssignmentsForUser = async () => null;
  const hiddenProject = createResponse();
  await getProjectLabourAssignments(
    { params: { id: projectId }, authenticatedUser: { id: 'other-user' } },
    hiddenProject
  );
  assert.equal(hiddenProject.statusCode, 404);
});

test('creates an assignment using the authenticated user and only validated fields', async (t) => {
  const originalCreate =
    labourWorkersService.createProjectLabourAssignmentForUser;
  let createArgs;
  labourWorkersService.createProjectLabourAssignmentForUser = async (...args) => {
    createArgs = args;
    return { id: 'assignment-1', labour_name: args[2].labourName };
  };
  t.after(() => {
    labourWorkersService.createProjectLabourAssignmentForUser = originalCreate;
  });

  const response = createResponse();
  await createProjectLabourAssignment(
    {
      params: { id: projectId },
      authenticatedUser: {
        id: 'owner-1',
        first_name: 'Taylor',
        last_name: 'Day',
      },
      body: {
        labourName: ' Asha Patel ',
        mobileNumber: ' 9876543210 ',
        workType: 'INDIVIDUAL',
        startDate: '2026-11-20',
        rate: 250,
        rateUnit: 'Per day',
        estimatedQuantity: 2,
        comments: '',
        userId: 'forged-user-id',
        createApplicationUser: true,
      },
    },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createArgs[0], 'owner-1');
  assert.equal(createArgs[1], projectId);
  assert.equal(createArgs[2].labourName, 'Asha Patel');
  assert.equal('userId' in createArgs[2], false);
  assert.equal('createApplicationUser' in createArgs[2], false);
  assert.equal(createArgs[3], 'Taylor Day');
  assert.deepEqual(response.body.assignment, {
    id: 'assignment-1',
    labour_name: 'Asha Patel',
  });
});

test('rejects invalid project IDs and returns owner-scoped worker errors', async (t) => {
  const originalCreate =
    labourWorkersService.createProjectLabourAssignmentForUser;
  labourWorkersService.createProjectLabourAssignmentForUser = async () => {
    const error = new Error('Active labour worker not found');
    error.status = 404;
    throw error;
  };
  t.after(() => {
    labourWorkersService.createProjectLabourAssignmentForUser = originalCreate;
  });

  const invalidProject = createResponse();
  await createProjectLabourAssignment(
    { params: { id: 'not-a-uuid' }, body: {} },
    invalidProject
  );
  assert.equal(invalidProject.statusCode, 400);

  const workerNotFound = createResponse();
  await createProjectLabourAssignment(
    {
      params: { id: projectId },
      authenticatedUser: { id: 'owner-1' },
      body: {
        labourId: '223e4567-e89b-42d3-a456-426614174000',
        mobileNumber: '9876543210',
        workType: 'INDIVIDUAL',
        startDate: '2026-11-20',
        rate: 100,
        rateUnit: 'Per day',
        estimatedQuantity: 1,
      },
    },
    workerNotFound
  );
  assert.equal(workerNotFound.statusCode, 404);
});
