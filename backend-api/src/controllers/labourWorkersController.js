const labourWorkersService = require('../services/labourWorkersService');

const projectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const workTypes = new Set(['INDIVIDUAL', 'CONTRACTOR', 'PART TIME']);

const cleanString = (value) =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

const optionalString = (body, key, maxLength) => {
  const value = body[key];
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') {
    return { error: `${key} must be a string` };
  }
  const cleaned = cleanString(value);
  if (cleaned.length > maxLength) {
    return { error: `${key} cannot exceed ${maxLength} characters` };
  }
  return cleaned;
};

const parseDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

const parseNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
};

const validateAssignment = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A labour assignment is required' };
  }

  const labourId = body.labourId;
  if (
    labourId !== undefined &&
    labourId !== null &&
    labourId !== '' &&
    (typeof labourId !== 'string' || !projectIdPattern.test(labourId))
  ) {
    return { error: 'A valid labour ID is required' };
  }

  const labourName = optionalString(body, 'labourName', 255);
  const mobileNumber = optionalString(body, 'mobileNumber', 50);
  const email = optionalString(body, 'email', 255);
  const workTypeValue = optionalString(body, 'workType', 100);
  const skillType = optionalString(body, 'skillType', 255);
  const address = optionalString(body, 'address', 2000);
  const workDescription = optionalString(body, 'workDescription', 10000);
  const rateUnit = optionalString(body, 'rateUnit', 100);
  const comments = optionalString(body, 'comments', 10000);
  const stringValues = [
    labourName,
    mobileNumber,
    email,
    workTypeValue,
    skillType,
    address,
    workDescription,
    rateUnit,
    comments,
  ];
  const invalidValue = stringValues.find(
    (value) => value && typeof value === 'object' && value.error
  );
  if (invalidValue) return invalidValue;

  const workType = workTypeValue.toUpperCase();
  if (!workTypes.has(workType)) {
    return { error: 'Work type must be INDIVIDUAL, CONTRACTOR, or PART TIME' };
  }

  if (!labourId && !labourName) {
    return { error: 'Labour name is required for a new worker' };
  }
  if (!labourId && !mobileNumber) {
    return { error: 'Mobile number is required for a new worker' };
  }
  if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
    return { error: 'Enter a valid 10-digit mobile number' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address' };
  }

  const startDate = optionalString(body, 'startDate', 10);
  const expectedEndDate = optionalString(body, 'expectedEndDate', 10);
  if (
    !startDate ||
    typeof startDate !== 'string' ||
    !parseDate(startDate)
  ) {
    return { error: 'A valid start date is required' };
  }
  if (expectedEndDate && !parseDate(expectedEndDate)) {
    return { error: 'Expected end date must be a valid date' };
  }
  if (expectedEndDate && expectedEndDate < startDate) {
    return { error: 'Expected end date must be on or after the start date' };
  }
  if (!rateUnit || typeof rateUnit !== 'string') {
    return { error: 'Rate unit is required' };
  }

  const rate = parseNumber(body.rate);
  if (!Number.isFinite(rate) || rate < 0) {
    return { error: 'Rate must be a number greater than or equal to zero' };
  }
  const estimatedQuantity = parseNumber(body.estimatedQuantity);
  if (!Number.isFinite(estimatedQuantity) || estimatedQuantity <= 0) {
    return { error: 'Estimated quantity must be a positive number' };
  }

  return {
    value: {
      labourId: labourId || null,
      labourName,
      mobileNumber,
      email,
      workType,
      skillType,
      address,
      workDescription,
      startDate,
      expectedEndDate,
      rate,
      rateUnit,
      estimatedQuantity,
      comments,
    },
  };
};

const searchLabourWorkers = async (req, res) => {
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (name.length < 3) {
    return res.status(400).json({
      error: 'Enter at least 3 characters to search labour workers',
    });
  }
  if (name.length > 100) {
    return res.status(400).json({
      error: 'Labour name search cannot exceed 100 characters',
    });
  }

  try {
    const labourWorkers =
      await labourWorkersService.searchActiveLabourWorkersForUser(
        req.authenticatedUser.id,
        name
      );
    return res.json({ labourWorkers });
  } catch (error) {
    console.error('Failed to search labour workers:', error);
    return res.status(500).json({ error: 'Failed to search labour workers' });
  }
};

const getProjectLabourAssignments = async (req, res) => {
  const { id: projectId } = req.params;
  if (!projectIdPattern.test(projectId)) {
    return res.status(400).json({ error: 'A valid project ID is required' });
  }

  try {
    const assignments =
      await labourWorkersService.getProjectLabourAssignmentsForUser(
        req.authenticatedUser.id,
        projectId
      );
    if (!assignments) return res.status(404).json({ error: 'Project not found' });
    return res.json({ assignments });
  } catch (error) {
    console.error('Failed to load project labour assignments:', error);
    return res.status(500).json({ error: 'Failed to load project labour assignments' });
  }
};

const createProjectLabourAssignment = async (req, res) => {
  const { id: projectId } = req.params;
  if (!projectIdPattern.test(projectId)) {
    return res.status(400).json({ error: 'A valid project ID is required' });
  }

  const validation = validateAssignment(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });

  try {
    const assignment =
      await labourWorkersService.createProjectLabourAssignmentForUser(
        req.authenticatedUser.id,
        projectId,
        validation.value,
        [
          req.authenticatedUser.first_name,
          req.authenticatedUser.last_name,
        ].filter(Boolean).join(' ') ||
          req.authenticatedUser.username ||
          req.authenticatedUser.email ||
          req.authenticatedUser.id
      );
    return res.status(201).json({ assignment });
  } catch (error) {
    if (error.status === 400 || error.status === 404) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Failed to create project labour assignment:', error);
    return res.status(500).json({ error: 'Failed to create project labour assignment' });
  }
};

module.exports = {
  createProjectLabourAssignment,
  getProjectLabourAssignments,
  searchLabourWorkers,
  validateAssignment,
};
