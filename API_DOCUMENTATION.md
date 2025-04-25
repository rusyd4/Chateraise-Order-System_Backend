# API Documentation for Backend Endpoint Routes

## Authentication Routes

### POST /register
- Description: Register a new user.
- Controller Function: `authController.register`
- Request Body: `{ full_name, email, password, role }`
- Response: Success message or error.

### POST /login
- Description: Login a user and return JWT token.
- Controller Function: `authController.login`
- Request Body: `{ email, password }`
- Response: JWT token, user role, and full name or error.

## Admin Routes
All admin routes require authentication and admin role verification.

### Food Menu Routes

- GET /food-items
  - Description: Get all food items.
  - Controller Function: `adminController.getAllFoodItems`
  - Response: List of food items.

- POST /food-items
  - Description: Create a new food item.
  - Controller Function: `adminController.createFoodItem`
  - Request Body: `{ food_id, food_name, description, price }`
  - Response: Created food item.

- PUT /food-items/:food_id
  - Description: Update a food item.
  - Controller Function: `adminController.updateFoodItem`
  - Request Body: `{ food_name, description, price, is_available }`
  - Response: Updated food item or error.

- DELETE /food-items/:food_id
  - Description: Delete a food item.
  - Controller Function: `adminController.deleteFoodItem`
  - Response: Success message or error.

### Branch Management Routes

- GET /branches
  - Description: Get all branches.
  - Controller Function: `adminController.getAllBranches`
  - Response: List of branches.

- PUT /branches/:branch_id
  - Description: Update a branch.
  - Controller Function: `adminController.updateBranch`
  - Request Body: `{ full_name, email }`
  - Response: Updated branch or error.

- DELETE /branches/:branch_id
  - Description: Delete a branch.
  - Controller Function: `adminController.deleteBranch`
  - Response: Success message or error.

### Order Management Routes

- GET /orders
  - Description: Get all orders.
  - Controller Function: `adminController.getAllOrders`
  - Response: List of orders with items.

## Branch Store Routes
All branch routes require authentication and branch_store role verification.

### Food Items (Read-only)

- GET /food-items
  - Description: Get available food items.
  - Controller Function: `branchController.getAvailableFoodItems`
  - Response: List of available food items.

### Order Management

- POST /orders
  - Description: Create a new order.
  - Controller Function: `branchController.createOrder`
  - Request Body: `{ delivery_date, items }`
  - Response: Created order ID and success message.

- GET /orders
  - Description: Get orders for the branch.
  - Controller Function: `branchController.getBranchOrders`
  - Response: List of orders with items.

### Profile Management

- GET /profile
  - Description: Get branch profile (own account).
  - Controller Function: `branchController.getBranchProfile`
  - Response: Branch profile details or error.

- PUT /profile
  - Description: Update branch profile (own account).
  - Controller Function: `branchController.updateBranchProfile`
  - Request Body: `{ full_name, email, branch_address }`
  - Response: Updated profile details or error.
