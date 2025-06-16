const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOTPEmail, generateOTP } = require('../utils/emailService');

// POST /auth/login
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

// POST /auth/request-reset
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    // Check if user exists
    const userRes = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (!userRes.rows[0]) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const userId = userRes.rows[0].user_id;
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Delete any existing unused OTPs for this user
    await pool.query(
      'DELETE FROM password_reset_otps WHERE user_id = $1 AND is_used = false',
      [userId]
    );

    // Store new OTP
    await pool.query(
      'INSERT INTO password_reset_otps (user_id, email, otp, expires_at) VALUES ($1, $2, $3, $4)',
      [userId, email, otp, expiresAt]
    );

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.json({ msg: 'Password reset OTP has been sent to your email' });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ msg: 'Failed to process password reset request' });
  }
};

// POST /auth/verify-otp
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpRes = await pool.query(
      `SELECT * FROM password_reset_otps 
       WHERE email = $1 AND otp = $2 AND is_used = false 
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (!otpRes.rows[0]) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    res.json({ msg: 'OTP verified successfully' });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ msg: 'Failed to verify OTP' });
  }
};

// POST /auth/reset-password
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    // Verify OTP again
    const otpRes = await pool.query(
      `SELECT * FROM password_reset_otps 
       WHERE email = $1 AND otp = $2 AND is_used = false 
       AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (!otpRes.rows[0]) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [passwordHash, otpRes.rows[0].user_id]
    );

    // Mark OTP as used
    await pool.query(
      'UPDATE password_reset_otps SET is_used = true WHERE id = $1',
      [otpRes.rows[0].id]
    );

    res.json({ msg: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ msg: 'Failed to reset password' });
  }
};
