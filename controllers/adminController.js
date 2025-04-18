const pool = require('../db');

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

// Branch Store Management
exports.getAllBranches = async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, full_name, email, created_at FROM users WHERE role = 'branch_store'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.updateBranch = async (req, res) => {
  const { branch_id } = req.params;
  const { full_name, email } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET full_name = $1, email = $2 WHERE user_id = $3 AND role = $4 RETURNING user_id, full_name, email',
      [full_name, email, branch_id, 'branch_store']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Branch not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.deleteBranch = async (req, res) => {
  const { branch_id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE user_id = $1 AND role = $2', [branch_id, 'branch_store']);
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
      "SELECT o.order_id, u.full_name AS branch_name, o.order_date, o.submitted_at, " +
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
      " GROUP BY o.order_id, u.full_name, o.order_date, o.submitted_at " +
      " ORDER BY o.submitted_at DESC";

    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
