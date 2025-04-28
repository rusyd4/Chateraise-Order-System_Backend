const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, verifyRole } = require('../middleware/authMiddleware');

// Apply authentication and admin role check to all admin routes
router.use(authenticateToken);
router.use(verifyRole('admin'));

// Food Menu Routes
router.get('/food-items', adminController.getAllFoodItems);
router.post('/food-items', adminController.createFoodItem);
router.put('/food-items/:food_id', adminController.updateFoodItem);
router.delete('/food-items/:food_id', adminController.deleteFoodItem);

// Branch Management Routes
router.get('/branches', adminController.getAllBranches);
router.put('/branches/:branch_id', adminController.updateBranch);
router.delete('/branches/:branch_id', adminController.deleteBranch);

// Order Management Routes
router.get('/orders', adminController.getAllOrders);
router.get('/orders/filter', adminController.getOrdersByBranchAndDate);
router.put('/orders/:order_id/status/in-progress', adminController.updateOrderStatusToInProgress);

module.exports = router;
