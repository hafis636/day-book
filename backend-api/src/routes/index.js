const express = require('express');
const { registerUser, getUserById, getUsers } = require('../controllers/usersController');
const { confirmUser, validateUserOtp } = require('../controllers/otpController');
const {
  createSessionForAuthenticatedUser,
  getCurrentSession,
  logout,
} = require('../controllers/sessionController');

const router = express.Router();

router.post('/register', registerUser);
router.get('/otp/confirm-user', confirmUser);
router.post('/otp/validate', validateUserOtp, createSessionForAuthenticatedUser);
router.get('/session', getCurrentSession);
router.post('/session/logout', logout);
router.get('/users/:id', getUserById);
router.get('/users', getUsers);

module.exports = router;
