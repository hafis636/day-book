const paymentsService = require('../services/paymentsService');
const { validatePayment } = require('../validations/paymentValidations');

const projectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getProjectPayments = async (req, res) => {
  const { id: projectId } = req.params;
  if (!projectIdPattern.test(projectId)) {
    return res.status(400).json({ error: 'A valid project ID is required' });
  }

  try {
    const payments = await paymentsService.getProjectPaymentsForUser(
      req.authenticatedUser.id,
      projectId
    );
    if (!payments) return res.status(404).json({ error: 'Project not found' });
    return res.json({ payments });
  } catch (error) {
    console.error('Failed to load project payments:', error);
    return res.status(500).json({ error: 'Failed to load project payments' });
  }
};

const createProjectPayment = async (req, res) => {
  const { id: projectId } = req.params;
  if (!projectIdPattern.test(projectId)) {
    return res.status(400).json({ error: 'A valid project ID is required' });
  }

  const validation = validatePayment(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const payment = await paymentsService.createProjectPaymentForUser(
      req.authenticatedUser.id,
      projectId,
      validation.value
    );
    if (!payment) return res.status(404).json({ error: 'Project not found' });
    return res.status(201).json({ payment });
  } catch (error) {
    console.error('Failed to create project payment:', error);
    return res.status(500).json({ error: 'Failed to create project payment' });
  }
};

module.exports = { createProjectPayment, getProjectPayments };
