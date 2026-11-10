const projectEventsService = require('../services/projectEventsService');
const { validateProjectEvent } = require('../validations/projectEventValidations');

const projectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getProjectEvents = async (req, res) => {
  const { id: projectId } = req.params;
  if (!projectIdPattern.test(projectId)) {
    return res.status(400).json({ error: 'A valid project ID is required' });
  }

  try {
    const events = await projectEventsService.getProjectEventsForUser(
      req.authenticatedUser.id,
      projectId
    );
    if (!events) return res.status(404).json({ error: 'Project not found' });
    return res.json({ events });
  } catch (error) {
    console.error('Failed to load project events:', error);
    return res.status(500).json({ error: 'Failed to load project events' });
  }
};

const createProjectEvent = async (req, res) => {
  const { id: projectId } = req.params;
  if (!projectIdPattern.test(projectId)) {
    return res.status(400).json({ error: 'A valid project ID is required' });
  }

  const validation = validateProjectEvent(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const projectEvent = await projectEventsService.createProjectEventForUser(
      req.authenticatedUser.id,
      projectId,
      validation.value,
      req.files || []
    );
    if (!projectEvent) return res.status(404).json({ error: 'Project not found' });
    return res.status(201).json({ event: projectEvent });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Supabase Storage S3 credentials')) {
      console.error('Event file storage is not configured:', error.message);
      return res.status(503).json({ error: error.message });
    }
    console.error('Failed to create project event:', error);
    return res.status(500).json({ error: 'Failed to create project event' });
  }
};

module.exports = { createProjectEvent, getProjectEvents };
