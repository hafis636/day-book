const express = require('express');
const { getUserById,getUsers } = require('../controllers/usersController');

const router = express.Router();

router.get('/users/:id', getUserById);
router.get('/users', getUsers);

module.exports = router;
