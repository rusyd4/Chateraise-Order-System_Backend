/**
 * Controller for user authentication
 */

const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// POST /auth/register
exports.register = async (req, res) => {
  const { full_name, email, password, role, branch_address } = req.body;
  if (!full_name || !email || !password || !role || !branch_address) return res.status(400).json({ msg: 'All fields required' });

  try {
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ msg: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role, branch_address) VALUES ($1, $2, $3, $4, $5)',
      [full_name, email, hash, role, branch_address]
    );

    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

/**
 * Login a user and return JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ msg: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, role: user.role, full_name: user.full_name });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
