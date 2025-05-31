const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const csv = require('csv-parser');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedUsersFromCSV() {
  const csvFilePath = 'store.csv';
  const users = [];

  // Read CSV file
  fs.createReadStream(csvFilePath)
    .pipe(csv({ separator: ';' }))
    .on('data', (row) => {
      const email = row.Email.toLowerCase();
      const emailPrefix = email.split('@')[0];
      const password = `chat${emailPrefix}`;
      
      users.push({
        full_name: row.Store,
        email: email,
        password: password,
        branch_address: row.Alamat,
        delivery_time: row['Jam Operational']
      });
    })
    .on('end', async () => {
      try {
        let insertedCount = 0;
        
        for (const user of users) {
          // Check if user already exists
          const res = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);
          if (res.rows.length > 0) {
            console.log(`User with email ${user.email} already exists. Skipping...`);
            continue;
          }

          // Hash the password
          const hashedPassword = await bcrypt.hash(user.password, 10);

          // Insert user
          await pool.query(
            'INSERT INTO users (full_name, email, password_hash, role, branch_address, delivery_time) VALUES ($1, $2, $3, $4, $5, $6)',
            [
              user.full_name,
              user.email,
              hashedPassword,
              'branch_store',
              user.branch_address,
              user.delivery_time
            ]
          );
          
          insertedCount++;
          console.log(`Created user: ${user.email}`);
        }

        console.log(`Successfully inserted ${insertedCount} users. ${users.length - insertedCount} users already existed.`);
      } catch (err) {
        console.error('Error inserting users:', err);
      } finally {
        await pool.end();
      }
    });
}

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
  }
}

async function main() {
  // First create admin user if not exists
  
  // Then seed users from CSV
  await seedUsersFromCSV();
}

main().catch(console.error);