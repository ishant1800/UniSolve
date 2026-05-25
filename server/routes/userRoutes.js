const express = require('express');
const { getAgents } = require('../controllers/userController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.get('/agents', authorizeRoles('admin'), getAgents);

module.exports = router;
