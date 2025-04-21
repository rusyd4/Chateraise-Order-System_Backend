const pool = require('../db');
const bcrypt = require('bcrypt');

// Food Menu CRUD Operations
exports.getAllFoodItems = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM food_items ORDER BY food_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.createFoodItem = async (req, res) => {
  const { food_name, description, price } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO food_items (food_name, description, price) VALUES ($1, $2, $3) RETURNING *',
      [food_name, description, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.updateFoodItem = async (req, res) => {
  const { food_id } = req.params;
  const { food_name, description, price, is_available } = req.body;
  try {
    const result = await pool.query(
      'UPDATE food_items SET food_name = $1, description = $2, price = $3, is_available = $4 WHERE food_id = $5 RETURNING *',
      [food_name, description, price, is_available, food_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Food item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.deleteFoodItem = async (req, res) => {
  const { food_id } = req.params;
  try {
    await pool.query('DELETE FROM food_items WHERE food_id = $1', [food_id]);
    res.json({ msg: 'Food item deleted successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// GET /admin/branches
exports.getAllBranches = async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, full_name, email, branch_address, created_at FROM users WHERE role = 'branch_store'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// PUT /admin/branches/:branch_id
exports.updateBranch = async (req, res) => {
  const { branch_id } = req.params;
  let { full_name, email, password_hash, branch_address } = req.body;
  try {
    let query = '';
    let params = [];
    const saltRounds = 10;

    if (password_hash && password_hash.trim() !== '') {
      password_hash = await bcrypt.hash(password_hash, saltRounds);
      query = 'UPDATE users SET full_name = $1, email = $2, password_hash = $3, branch_address = $4 WHERE user_id = $5 AND role = $6 RETURNING user_id, full_name, email, password_hash, branch_address';
      params = [full_name, email, password_hash, branch_address, branch_id, 'branch_store'];
    } else {
      // Do not update password_hash if blank or not provided
      query = 'UPDATE users SET full_name = $1, email = $2, branch_address = $3 WHERE user_id = $4 AND role = $5 RETURNING user_id, full_name, email, password_hash, branch_address';
      params = [full_name, email, branch_address, branch_id, 'branch_store'];
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
exports.getAllOrders = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT o.order_id, u.full_name AS branch_name, o.order_date, o.submitted_at, " +
      "json_agg(json_build_object( " +
      "'food_name', f.food_name, " +
      "'quantity', oi.quantity, " +
      "'price', f.price " +
      ")) AS items " +
      "FROM orders o " +
      "JOIN users u ON o.branch_id = u.user_id " +
      "JOIN order_items oi ON o.order_id = oi.order_id " +
      "JOIN food_items f ON oi.food_id = f.food_id " +
      "GROUP BY o.order_id, u.full_name, o.order_date, o.submitted_at " +
      "ORDER BY o.submitted_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.getOrdersByBranchAndDate = async (req, res) => {
  const { branch_name, order_date } = req.query;

  try {
    let baseQuery = 
      "SELECT o.order_id, u.full_name AS branch_name, u.branch_address, o.order_date, o.submitted_at, " +
      "json_agg(json_build_object( " +
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

    if (order_date) {
      conditions.push("o.order_date = $" + paramIndex);
      params.push(order_date);
      paramIndex++;
    }

    if (conditions.length > 0) {
      baseQuery += " WHERE " + conditions.join(" AND ");
    }

    baseQuery += 
      " GROUP BY o.order_id, u.full_name, u.branch_address, o.order_date, o.submitted_at " +
      " ORDER BY o.submitted_at DESC";

    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
