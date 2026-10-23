const test = require('node:test');
const assert = require('node:assert/strict');
const rejectBrowserNavigation = require('./rejectBrowserNavigation');

const runMiddleware = (headers) => {
  let status;
  let nextCalled = false;
  const req = {
    get: (name) => headers[name],
  };
  const res = {
    sendStatus: (value) => {
      status = value;
      return res;
    },
  };

  rejectBrowserNavigation(req, res, () => {
    nextCalled = true;
  });

  return { status, nextCalled };
};

test('blocks browser top-level navigation to API URLs', () => {
  assert.deepEqual(
    runMiddleware({
      'sec-fetch-mode': 'navigate',
      'sec-fetch-dest': 'document',
    }),
    { status: 404, nextCalled: false }
  );
});

test('allows application fetch requests and clients without browser navigation headers', () => {
  assert.deepEqual(
    runMiddleware({
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
    }),
    { status: undefined, nextCalled: true }
  );
  assert.deepEqual(runMiddleware({}), { status: undefined, nextCalled: true });
});
