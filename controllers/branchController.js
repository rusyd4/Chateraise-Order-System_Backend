const pool = require('../db');

// Get available food items
exports.getAvailableFoodItems = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT food_id, food_name, description, price FROM food_items WHERE is_available = TRUE ORDER BY food_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  const { order_date, items } = req.body;
  const branch_id = req.user.user_id;

  try {
    // Start transaction
    await pool.query('BEGIN');

    // Create order
    const orderRes = await pool.query(
      'INSERT INTO orders (branch_id, order_date) VALUES ($1, $2) RETURNING order_id',
      [branch_id, order_date]
    );
    const order_id = orderRes.rows[0].order_id;

    // Add order items
    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, food_id, quantity) VALUES ($1, $2, $3)',
        [order_id, item.food_id, item.quantity]
      );
    }

    await pool.query('COMMIT');
    res.status(201).json({ order_id, msg: 'Order created successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Get branch's orders
exports.getBranchOrders = async (req, res) => {
  const branch_id = req.user.user_id;
  try {
    const result = await pool.query(
      `SELECT o.order_id, o.order_date, o.submitted_at,
        json_agg(json_build_object(
          'food_name', f.food_name,
          'quantity', oi.quantity,
          'price', f.price
        )) AS items
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN food_items f ON oi.food_id = f.food_id
      WHERE o.branch_id = $1
      GROUP BY o.order_id, o.order_date, o.submitted_at
      ORDER BY o.submitted_at DESC`,
      [branch_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Update branch profile (own account only)
exports.updateBranchProfile = async (req, res) => {
  const branch_id = req.user.user_id;
  const { full_name, email, branch_address } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET full_name = $1, email = $2, branch_address = $3 WHERE user_id = $4 RETURNING user_id, full_name, email, branch_address',
      [full_name, email, branch_address, branch_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Get branch profile (own account only)
exports.getBranchProfile = async (req, res) => {
  const branch_id = req.user.user_id;
  try {
    const result = await pool.query(
      'SELECT user_id, full_name, email, branch_address FROM users WHERE user_id = $1',
      [branch_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Branch profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
