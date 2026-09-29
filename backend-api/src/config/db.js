const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Vercel/serverless -> keep the application-side pool small
  max: 1,

  // Require encrypted connection
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

const query = (text, params) => {
  return pool.query(text, params);
};

const testDatabaseConnection = async () => {
  const result = await pool.query(
    "SELECT NOW() AS current_time, current_database() AS database_name, current_schema() AS schema_name"
  );

  return result.rows[0];
};

module.exports = { pool, query, testDatabaseConnection };