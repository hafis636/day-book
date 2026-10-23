const PROJECT_TYPES = new Set([
  'Residential House',
  'Villa',
  'Apartment',
  'Commercial Building',
  'Office',
  'Shop',
  'Hospital',
  'School',
  'Industrial',
  'Other',
]);

const PROJECT_STATUSES = new Map([
  ['In discussion', 'in discussion'],
  ['Planning', 'planning'],
  ['Ongoing', 'ongoing'],
  ['Completed', 'completed'],
]);

const DATE_FIELDS = [
  'start_date',
  'expected_completion_date',
  'actual_completion_date',
];

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validateProject = (body) => {
  const project = body || {};
  const name = typeof project.name === 'string' ? project.name.trim() : '';
  if (!name) return { error: 'Project name is required' };
  if (name.length > 255) return { error: 'Project name cannot exceed 255 characters' };

  if (!PROJECT_TYPES.has(project.project_type)) {
    return { error: 'A valid project type is required' };
  }

  let status = 'planning';
  if (project.status) {
    status = PROJECT_STATUSES.get(project.status);
    if (!status) return { error: 'A valid project status is required' };
  }

  const dates = {};
  for (const field of DATE_FIELDS) {
    const value = project[field] || null;
    if (value !== null && (typeof value !== 'string' || !isValidDate(value))) {
      return { error: `Enter a valid ${field.replaceAll('_', ' ')}` };
    }
    dates[field] = value;
  }

  const optionalTextFields = ['description', 'address', 'project_info'];
  const optionalText = {};
  for (const field of optionalTextFields) {
    const value = project[field] || null;
    if (value !== null && typeof value !== 'string') {
      return { error: `Invalid ${field.replaceAll('_', ' ')}` };
    }
    optionalText[field] = typeof value === 'string' ? value.trim() || null : null;
  }

  return {
    value: {
      name,
      project_type: project.project_type,
      status,
      ...dates,
      ...optionalText,
    },
  };
};

module.exports = { validateProject };
