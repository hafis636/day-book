const express = require('express');
const { loginUser, registerUser, getRoles, getUserById, getUsers } = require('../controllers/usersController');
const { confirmUser, validateUserOtp } = require('../controllers/otpController');
const {
  createSessionForAuthenticatedUser,
  getCurrentSession,
  logout,
} = require('../controllers/sessionController');
const {
  createProject,
  createProjectDocuments,
  getProjectDocuments,
  getProject,
  getProjects,
  parseProjectDocuments,
  parseProjectImages,
  updateProject,
} = require('../controllers/projectsController');
const requireAuthenticatedSession = require('../middleware/requireAuthenticatedSession');
const requireNonAdmin = require('../middleware/requireNonAdmin');
const { getPlans, selectPlan } = require('../controllers/plansController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser, createSessionForAuthenticatedUser);
router.get('/roles', getRoles);
router.get('/otp/confirm-user', confirmUser);
router.post('/otp/validate', validateUserOtp, createSessionForAuthenticatedUser);
router.get('/session', getCurrentSession);
router.post('/session/logout', logout);
router.get('/plans', requireAuthenticatedSession, requireNonAdmin, getPlans);
router.patch('/plans/:planCode', requireAuthenticatedSession, requireNonAdmin, selectPlan);
router.post(
  '/projects',
  requireAuthenticatedSession,
  parseProjectImages,
  createProject
);
router.get('/projects', requireAuthenticatedSession, getProjects);
router.get('/projects/:id/documents', requireAuthenticatedSession, getProjectDocuments);
router.post(
  '/projects/:id/documents',
  requireAuthenticatedSession,
  parseProjectDocuments,
  createProjectDocuments
);
router.get('/projects/:id', requireAuthenticatedSession, getProject);
router.patch(
  '/projects/:id',
  requireAuthenticatedSession,
  parseProjectImages,
  updateProject
);
router.get('/users/:id', getUserById);
router.get('/users', getUsers);

module.exports = router;
