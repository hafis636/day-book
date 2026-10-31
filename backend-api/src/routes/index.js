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
  deleteProjectDocument,
  downloadProjectDocument,
  getProjectDocuments,
  updateProjectDocument,
  getProject,
  getProjects,
  parseProjectDocuments,
  parseProjectImages,
  updateProject,
} = require('../controllers/projectsController');
const requireAuthenticatedSession = require('../middleware/requireAuthenticatedSession');
const requireNonAdmin = require('../middleware/requireNonAdmin');
const { getPlans } = require('../controllers/plansController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser, createSessionForAuthenticatedUser);
router.get('/roles', getRoles);
router.get('/otp/confirm-user', confirmUser);
router.post('/otp/validate', validateUserOtp, createSessionForAuthenticatedUser);
router.get('/session', getCurrentSession);
router.post('/session/logout', logout);
router.get('/plans', requireAuthenticatedSession, requireNonAdmin, getPlans);
router.post(
  '/projects',
  requireAuthenticatedSession,
  parseProjectImages,
  createProject
);
router.get('/projects', requireAuthenticatedSession, getProjects);
router.get('/projects/:id/documents', requireAuthenticatedSession, getProjectDocuments);
router.get(
  '/projects/:id/documents/:documentId/download',
  requireAuthenticatedSession,
  downloadProjectDocument
);
router.delete(
  '/projects/:id/documents/:documentId',
  requireAuthenticatedSession,
  deleteProjectDocument
);
router.patch(
  '/projects/:id/documents/:documentId',
  requireAuthenticatedSession,
  parseProjectDocuments,
  updateProjectDocument
);
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
