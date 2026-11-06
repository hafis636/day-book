const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://localhost:5432/test';

const paymentsService = require('../../src/services/paymentsService');
const {
  createProjectPayment,
  deleteProjectPayment,
  getProjectPayments,
  updateProjectPayment,
} = require('../../src/controllers/paymentsController');

const projectId = '123e4567-e89b-42d3-a456-426614174000';
const paymentBody = {
  title: 'Materials payment',
  amount: 125.5,
  payment_method: 'cash',
  party_name: 'Supplier',
  status: 'advance',
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

test('creates a project payment for the authenticated user', async (t) => {
  const originalCreate = paymentsService.createProjectPaymentForUser;
  let createArgs;
  paymentsService.createProjectPaymentForUser = async (...args) => {
    createArgs = args;
    return { id: 'transaction-1', ...args[2], created_by: args[0] };
  };
  t.after(() => {
    paymentsService.createProjectPaymentForUser = originalCreate;
  });

  const response = createResponse();
  await createProjectPayment(
    {
      params: { id: projectId },
      authenticatedUser: { id: 'user-1' },
      body: paymentBody,
    },
    response
  );

  assert.equal(response.statusCode, 201);
  assert.equal(createArgs[0], 'user-1');
  assert.equal(createArgs[1], projectId);
  assert.equal(createArgs[2].amount, 125.5);
  assert.equal(response.body.payment.created_by, 'user-1');
});

test('rejects invalid project IDs and invalid payment details', async (t) => {
  const originalCreate = paymentsService.createProjectPaymentForUser;
  paymentsService.createProjectPaymentForUser = async () => {
    assert.fail('invalid payment must not be persisted');
  };
  t.after(() => {
    paymentsService.createProjectPaymentForUser = originalCreate;
  });

  const invalidProjectResponse = createResponse();
  await createProjectPayment(
    { params: { id: 'not-a-uuid' }, body: paymentBody },
    invalidProjectResponse
  );
  assert.equal(invalidProjectResponse.statusCode, 400);

  const invalidPaymentResponse = createResponse();
  await createProjectPayment(
    { params: { id: projectId }, body: { ...paymentBody, amount: -1 } },
    invalidPaymentResponse
  );
  assert.equal(invalidPaymentResponse.statusCode, 400);
});

test('returns 404 when the project is not owned by the authenticated user', async (t) => {
  const originalCreate = paymentsService.createProjectPaymentForUser;
  const originalGet = paymentsService.getProjectPaymentsForUser;
  paymentsService.createProjectPaymentForUser = async () => null;
  paymentsService.getProjectPaymentsForUser = async () => null;
  t.after(() => {
    paymentsService.createProjectPaymentForUser = originalCreate;
    paymentsService.getProjectPaymentsForUser = originalGet;
  });

  const createResponseValue = createResponse();
  await createProjectPayment(
    { params: { id: projectId }, authenticatedUser: { id: 'user-1' }, body: paymentBody },
    createResponseValue
  );
  assert.equal(createResponseValue.statusCode, 404);

  const listResponse = createResponse();
  await getProjectPayments(
    { params: { id: projectId }, authenticatedUser: { id: 'user-1' } },
    listResponse
  );
  assert.equal(listResponse.statusCode, 404);
});

test('updates a payment with validated details for the authenticated project owner', async (t) => {
  const originalUpdate = paymentsService.updateProjectPaymentForUser;
  let updateArgs;
  paymentsService.updateProjectPaymentForUser = async (...args) => {
    updateArgs = args;
    return { id: args[2], ...args[3] };
  };
  t.after(() => {
    paymentsService.updateProjectPaymentForUser = originalUpdate;
  });

  const response = createResponse();
  await updateProjectPayment(
    {
      params: {
        id: projectId,
        paymentId: '123e4567-e89b-42d3-a456-426614174001',
      },
      authenticatedUser: { id: 'user-1' },
      body: paymentBody,
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(updateArgs[0], 'user-1');
  assert.equal(updateArgs[1], projectId);
  assert.equal(updateArgs[3].party_name, 'Supplier');
});

test('deletes a payment only through the authenticated project owner', async (t) => {
  const originalDelete = paymentsService.deleteProjectPaymentForUser;
  let deleteArgs;
  paymentsService.deleteProjectPaymentForUser = async (...args) => {
    deleteArgs = args;
    return { id: args[2] };
  };
  t.after(() => {
    paymentsService.deleteProjectPaymentForUser = originalDelete;
  });

  const response = createResponse();
  await deleteProjectPayment(
    {
      params: {
        id: projectId,
        paymentId: '123e4567-e89b-42d3-a456-426614174001',
      },
      authenticatedUser: { id: 'user-1' },
    },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(deleteArgs, [
    'user-1',
    projectId,
    '123e4567-e89b-42d3-a456-426614174001',
  ]);
});
