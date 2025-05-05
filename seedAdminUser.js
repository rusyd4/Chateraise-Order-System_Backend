const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedAdminUser() {
  const adminEmail = 'admin@chateraise.id';
  const adminPassword = 'chatadmin';
  const adminFullName = 'Admin';

  try {
    // Check if admin user already exists
    const res = await pool.query('SELECT * FROM users WHERE email = $1 AND role = $2', [adminEmail, 'admin']);
    if (res.rows.length > 0) {
      console.log('Admin user already exists.');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Insert admin user
    await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [adminFullName, adminEmail, hashedPassword, 'admin']
    );

    console.log('Admin user created successfully.');
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    await pool.end();
  }
}

seedAdminUser();
