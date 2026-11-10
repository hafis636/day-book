const EVENT_STATUSES = new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']);
const EVENT_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'NORMAL']);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;

const isValidDateTime = (value) => {
  if (typeof value !== 'string') return false;
  if (DATE_PATTERN.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  return TIMESTAMP_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
};

const optionalText = (body, field, maxLength) => {
  const value = body[field];
  if (value !== undefined && value !== null && typeof value !== 'string') {
    return { error: `Invalid ${field.replaceAll('_', ' ')}` };
  }
  const normalized = typeof value === 'string' ? value.trim() || null : null;
  if (normalized && normalized.length > maxLength) {
    return { error: `${field.replaceAll('_', ' ')} cannot exceed ${maxLength} characters` };
  }
  return { value: normalized };
};

const validateProjectEvent = (body) => {
  const event = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  const title = typeof event.title === 'string' ? event.title.trim() : '';
  if (!title) return { error: 'Event title is required' };
  if (title.length > 255) {
    return { error: 'Event title cannot exceed 255 characters' };
  }

  const eventType =
    typeof event.event_type === 'string' ? event.event_type.trim().toUpperCase() : '';
  if (!eventType || eventType.length > 50) {
    return { error: 'A valid event type is required' };
  }

  const eventStatus =
    event.event_status === undefined
      ? 'PLANNED'
      : typeof event.event_status === 'string'
        ? event.event_status.trim().toUpperCase()
        : '';
  if (!EVENT_STATUSES.has(eventStatus)) {
    return { error: 'A valid event status is required' };
  }

  const priority =
    event.priority === undefined
      ? 'NORMAL'
      : typeof event.priority === 'string'
        ? event.priority.trim().toUpperCase()
        : '';
  if (!EVENT_PRIORITIES.has(priority)) {
    return { error: 'A valid event priority is required' };
  }

  if (!isValidDateTime(event.start_date)) {
    return { error: 'A valid event start date is required' };
  }

  let endDate = null;
  if (event.end_date !== undefined && event.end_date !== null && event.end_date !== '') {
    if (!isValidDateTime(event.end_date)) {
      return { error: 'Enter a valid event end date' };
    }
    if (Date.parse(event.end_date) < Date.parse(event.start_date)) {
      return { error: 'Event end date must be on or after the start date' };
    }
    endDate = event.end_date;
  }

  const description = optionalText(event, 'description', 100000);
  if (description.error) return description;
  const projectPhase = optionalText(event, 'project_phase', 100);
  if (projectPhase.error) return projectPhase;

  const assignedTo = event.assigned_to ?? null;
  if (assignedTo !== null && (typeof assignedTo !== 'string' || !UUID_PATTERN.test(assignedTo))) {
    return { error: 'A valid assigned user ID is required' };
  }

  return {
    value: {
      title,
      description: description.value,
      event_type: eventType,
      event_status: eventStatus,
      project_phase: projectPhase.value,
      start_date: event.start_date,
      end_date: endDate,
      priority,
      assigned_to: assignedTo,
    },
  };
};

module.exports = { validateProjectEvent };
