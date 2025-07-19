const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  database: process.env.DB_NAME || 'smart_maintenance',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 3306
});

module.exports = db;
