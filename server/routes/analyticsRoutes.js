const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getSlaAnalytics, exportSlaReport, getSlaTrends } = require('../controllers/analyticsController');

const router = express.Router();

router.use(protect);
router.get('/sla', authorizeRoles('admin'), getSlaAnalytics);
router.get('/sla/export', authorizeRoles('admin'), exportSlaReport);
router.get('/sla/trends', authorizeRoles('admin'), getSlaTrends);

module.exports = router;
