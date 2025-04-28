const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { authenticateToken, verifyRole } = require('../middleware/authMiddleware');

// Apply authentication and branch role check to all routes
router.use(authenticateToken);
router.use(verifyRole('branch_store'));

// Food items (read-only)
router.get('/food-items', branchController.getAvailableFoodItems);

// Order management
router.post('/orders', branchController.createOrder);
router.get('/orders', branchController.getBranchOrders);

// Profile management
router.get('/profile', branchController.getBranchProfile);
router.put('/profile', branchController.updateBranchProfile);

// Order status update
router.put('/orders/:order_id/status/finished', branchController.updateOrderStatusToFinished);

module.exports = router;
