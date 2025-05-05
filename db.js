const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 seconds connection timeout
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  max: 20 // maximum number of clients in the pool
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // You might want to implement reconnection logic here
});

module.exports = pool;
