// Added imports for file upload and file system
const pool = require('../db');
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/food_images');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use food_name from body to create filename, sanitize it
    const foodName = req.body.food_name || 'unknown_food';
    const safeFoodName = foodName.replace(/\s+/g, '_').toLowerCase();
    const ext = path.extname(file.originalname);
    cb(null, `${safeFoodName}${ext}`);
  }
});

exports.upload = multer({ storage: storage });


// Helper function for consistent error response
const handleError = (res, err, customMsg = 'Server error', statusCode = 500) => {
  console.error(err);
  return res.status(statusCode).json({ msg: customMsg, error: err.message });
};

// POST /admin/branches
exports.createBranch = async (req, res) => {
  const { full_name, email, password, role, branch_address, delivery_time } = req.body;
  if (!full_name || !email || !password || !role || !branch_address) {
    return res.status(400).json({ msg: 'All fields required: full_name, email, password, role, branch_address' });
  }

  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ msg: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role, branch_address, delivery_time) VALUES ($1, $2, $3, $4, $5, $6)',
      [full_name, email, hash, role, branch_address, delivery_time]
    );

    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    return handleError(res, err);
  }
};


// Food Menu CRUD Operations
exports.getAllFoodItems = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM food_items ORDER BY food_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// POST /admin/food-items
exports.createFoodItem = async (req, res) => {
  const { food_id, food_name, description, price } = req.body;
  let food_image = null;
  if (req.file) {
    food_image = req.file.filename;
  }
  try {
    const result = await pool.query(
      'INSERT INTO food_items (food_id, food_name, description, price, food_image) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [food_id, food_name, description, price, food_image]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // If file was uploaded but DB insert failed, delete the uploaded file to avoid orphan files
    if (food_image) {
      const filePath = path.join(uploadDir, food_image);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete file after DB error:', unlinkErr);
      });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// PUT /admin/food-items/:food_id
exports.updateFoodItem = async (req, res) => {
  const { food_id, food_name, description, price, is_available } = req.body;
  let newFoodImage = null;
  try {
    // If food_id is being changed, check if current food_id is referenced in order_items
    if (food_id && food_id !== req.params.food_id) {
      const checkResult = await pool.query(
        'SELECT 1 FROM order_items WHERE food_id = $1 LIMIT 1',
        [req.params.food_id]
      );
      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          msg: 'Cannot update food_id because it is referenced in existing orders'
        });
      }
    }

    // Get current food item to check existing image
    const currentResult = await pool.query(
      'SELECT food_image FROM food_items WHERE food_id = $1',
      [req.params.food_id]
    );
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Food item not found' });
    }
    const currentImage = currentResult.rows[0].food_image;

    if (req.file) {
      newFoodImage = req.file.filename;
    }

    const result = await pool.query(
      'UPDATE food_items SET food_id = $1, food_name = $2, description = $3, price = $4, is_available = $5, food_image = $6 WHERE food_id = $7 RETURNING *',
      [food_id, food_name, description, price, is_available, newFoodImage || currentImage, req.params.food_id]
    );

    // If new image uploaded and old image exists and is different, delete old image file
    if (newFoodImage && currentImage && currentImage !== newFoodImage) {
      const oldImagePath = path.join(uploadDir, currentImage);
      fs.unlink(oldImagePath, (err) => {
        if (err) console.error('Failed to delete old image:', err);
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    // If new image uploaded but DB update failed, delete the new uploaded file to avoid orphan files
    if (newFoodImage) {
      const newImagePath = path.join(uploadDir, newFoodImage);
      fs.unlink(newImagePath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete new image after DB error:', unlinkErr);
      });
    }
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// DELETE /admin/food-items/:food_id
exports.deleteFoodItem = async (req, res) => {
  const { food_id } = req.params;
  try {
    // Check if the food item is referenced in order_items
    const checkResult = await pool.query(
      'SELECT 1 FROM order_items WHERE food_id = $1 LIMIT 1',
      [food_id]
    );
    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        msg: 'Cannot delete food item because it is referenced in existing orders'
      });
    }

    // Get current food item to check existing image
    const currentResult = await pool.query(
      'SELECT food_image FROM food_items WHERE food_id = $1',
      [food_id]
    );
    if (currentResult.rows.length > 0) {
      const currentImage = currentResult.rows[0].food_image;
      if (currentImage) {
        const imagePath = path.join(uploadDir, currentImage);
        fs.unlink(imagePath, (err) => {
          if (err) console.error('Failed to delete image file:', err);
        });
      }
    }

    await pool.query('DELETE FROM food_items WHERE food_id = $1', [food_id]);
    res.json({ msg: 'Food item deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// GET /admin/branches
exports.getAllBranches = async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, full_name, email, branch_address, delivery_time, created_at FROM users WHERE role = 'branch_store'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// PUT /admin/branches/:branch_id
exports.updateBranch = async (req, res) => {
  const { branch_id } = req.params;
  let { full_name, email, password_hash, branch_address, delivery_time } = req.body;
  try {
    let query = '';
    let params = [];
    const saltRounds = 10;

    if (password_hash && password_hash.trim() !== '') {
      password_hash = await bcrypt.hash(password_hash, saltRounds);
      query = 'UPDATE users SET full_name = $1, email = $2, password_hash = $3, branch_address = $4, delivery_time = $5 WHERE user_id = $6 AND role = $7 RETURNING user_id, full_name, email, password_hash, branch_address, delivery_time';
      params = [full_name, email, password_hash, branch_address, delivery_time, branch_id, 'branch_store'];
    } else {
      // Do not update password_hash if blank or not provided
      query = 'UPDATE users SET full_name = $1, email = $2, branch_address = $3, delivery_time = $4 WHERE user_id = $5 AND role = $6 RETURNING user_id, full_name, email, password_hash, branch_address, delivery_time';
      params = [full_name, email, branch_address, delivery_time, branch_id, 'branch_store'];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Branch not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// DELETE /admin/branches/:branch_id
exports.deleteBranch = async (req, res) => {
  const { branch_id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE user_id = $1', [branch_id]);
    res.json({ msg: 'Branch deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Order Management
// GET /admin/orders
exports.getAllOrders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT o.order_id, u.full_name AS branch_name, o.delivery_date, o.order_date, " +
      "json_agg(json_build_object( " +
      "'food_name', f.food_name, " +
      "'quantity', oi.quantity, " +
      "'price', f.price " +
      ")) AS items " +
      "FROM orders o " +
      "JOIN users u ON o.branch_id = u.user_id " +
      "JOIN order_items oi ON o.order_id = oi.order_id " +
      "JOIN food_items f ON oi.food_id = f.food_id " +
      "GROUP BY o.order_id, u.full_name, o.delivery_date, o.order_date " +
      "ORDER BY o.order_date DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// GET /admin/orders/filter
exports.getOrdersByBranchAndDate = async (req, res) => {
  const { branch_name, delivery_date } = req.query;

  try {
    let baseQuery = 
      "SELECT o.order_id, u.full_name AS branch_name, u.branch_address, u.delivery_time, o.delivery_date, o.order_date, o.order_status, " +
      "json_agg(json_build_object( " +
      "'food_id', f.food_id, " +
      "'food_name', f.food_name, " +
      "'quantity', oi.quantity, " +
      "'price', f.price " +
      ")) AS items " +
      "FROM orders o " +
      "JOIN users u ON o.branch_id = u.user_id " +
      "JOIN order_items oi ON o.order_id = oi.order_id " +
      "JOIN food_items f ON oi.food_id = f.food_id ";

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (branch_name) {
      conditions.push("u.full_name = $" + paramIndex);
      params.push(branch_name);
      paramIndex++;
    }

    if (delivery_date) {
      conditions.push("o.delivery_date = $" + paramIndex);
      params.push(delivery_date);
      paramIndex++;
    }

    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    baseQuery += 
      " GROUP BY o.order_id, u.full_name, u.branch_address, u.delivery_time, o.delivery_date, o.order_date, o.order_status " +
      " ORDER BY o.order_date DESC";

    const result = await pool.query(baseQuery, params);

    // Generate QR code for orders with status 'In-progress'
    const ordersWithQr = await Promise.all(result.rows.map(async (order) => {
    const qrData = `${order.order_id}`;
    order.qrCodeImageUrl = await QRCode.toDataURL(qrData);
    return order;
    }));

    res.json(ordersWithQr);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// PUT /admin/orders/:order_id/status/in-progress
exports.updateOrderStatusToInProgress = async (req, res) => {
  const { order_id } = req.params;

  try {
    // Update order_status from 'Pending' to 'In-progress' only
    const result = await pool.query(
      "UPDATE orders SET order_status = 'In-progress' WHERE order_id = $1 AND order_status = 'Pending' RETURNING *",
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: 'Order not found or status is not Pending' });
    }

    res.json({ msg: 'Order status updated to In-progress', order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

 // GET /admin/orders/pending
exports.getPendingOrders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT o.order_id, u.full_name AS branch_name, u.branch_address, u.delivery_time, o.delivery_date, o.order_date, o.order_status, " +
      "json_agg(json_build_object( " +
      "'food_id', f.food_id, " +
      "'food_name', f.food_name, " +
      "'quantity', oi.quantity, " +
      "'price', f.price " +
      ")) AS items " +
      "FROM orders o " +
      "JOIN users u ON o.branch_id = u.user_id " +
      "JOIN order_items oi ON o.order_id = oi.order_id " +
      "JOIN food_items f ON oi.food_id = f.food_id " +
      "WHERE o.order_status = 'Pending' " +
      "GROUP BY o.order_id, u.full_name, u.branch_address, u.delivery_time, o.delivery_date, o.order_date, o.order_status " +
      "ORDER BY o.order_date DESC"
    );

    // Generate QR code for orders with status 'Pending'
    const ordersWithQr = await Promise.all(result.rows.map(async (order) => {
      const qrData = `${order.order_id}`;
      order.qrCodeImageUrl = await QRCode.toDataURL(qrData);
      return order;
    }));

    res.json(ordersWithQr);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// GET /admin/orders/in-progress
exports.getInProgressOrders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT o.order_id, u.full_name AS branch_name, u.branch_address, u.delivery_time, o.delivery_date, o.order_date, o.order_status, " +
      "json_agg(json_build_object( " +
      "'food_id', f.food_id, " +
      "'food_name', f.food_name, " +
      "'quantity', oi.quantity, " +
      "'price', f.price " +
      ")) AS items " +
      "FROM orders o " +
      "JOIN users u ON o.branch_id = u.user_id " +
      "JOIN order_items oi ON o.order_id = oi.order_id " +
      "JOIN food_items f ON oi.food_id = f.food_id " +
      "WHERE o.order_status = 'In-progress' " +
      "GROUP BY o.order_id, u.full_name, u.branch_address, u.delivery_time, o.delivery_date, o.order_date, o.order_status " +
      "ORDER BY o.order_date DESC"
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// GET /admin/orders/finished
exports.getFinishedOrders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT o.order_id, u.full_name AS branch_name, u.branch_address, u.delivery_time, o.delivery_date, o.order_date, o.order_status, " +
      "json_agg(json_build_object( " +
      "'food_id', f.food_id, " +
      "'food_name', f.food_name, " +
      "'quantity', oi.quantity, " +
      "'price', f.price " +
      ")) AS items " +
      "FROM orders o " +
      "JOIN users u ON o.branch_id = u.user_id " +
      "JOIN order_items oi ON o.order_id = oi.order_id " +
      "JOIN food_items f ON oi.food_id = f.food_id " +
      "WHERE o.order_status = 'Finished' " +
      "GROUP BY o.order_id, u.full_name, u.branch_address, u.delivery_time, o.delivery_date, o.order_date, o.order_status " +
      "ORDER BY o.order_date DESC"
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
