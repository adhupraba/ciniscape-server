const { Pool } = require("pg");
const env = require("../utils/env");

// Database configuration
module.exports = new Pool({
  connectionString: env.dbUrl,
  // user: env.dbUser,
  // host: env.dbHost,
  // database: env.dbDatabase,
  // password: env.dbPassword,
  // port: env.dbPort
});
