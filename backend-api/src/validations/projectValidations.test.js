const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProject } = require('./projectValidations');

const validProject = {
  name: 'Riverside Apartment',
  project_type: 'Apartment',
};

test('requires project name and supported project type', () => {
  assert.equal(validateProject({ project_type: 'Apartment' }).error, 'Project name is required');
  assert.equal(validateProject({ ...validProject, project_type: 'Unknown' }).error, 'A valid project type is required');
});

test('defaults status and optional fields consistently with the projects table', () => {
  const result = validateProject(validProject);

  assert.equal(result.error, undefined);
  assert.equal(result.value.status, 'planning');
  assert.equal(result.value.description, null);
  assert.equal(result.value.start_date, null);
  assert.equal(result.value.expected_completion_date, null);
  assert.equal(result.value.actual_completion_date, null);
  assert.equal(result.value.address, null);
  assert.equal(result.value.project_info, null);
});

test('normalizes supported statuses and rejects invalid dates', () => {
  assert.equal(
    validateProject({ ...validProject, status: 'In discussion' }).value.status,
    'in discussion'
  );
  assert.equal(
    validateProject({ ...validProject, status: 'Unknown' }).error,
    'A valid project status is required'
  );
  assert.match(
    validateProject({ ...validProject, start_date: '2026-02-30' }).error,
    /start date/
  );
});
