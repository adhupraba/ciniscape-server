require("dotenv").config();

const env = {
  port: process.env.PORT,
  //   dbUser: process.env.DB_USER,
  //   dbHost: process.env.DB_HOST,
  //   dbDatabase: process.env.DB_DATABASE,
  //   dbPassword: process.env.DB_PASSWORD,
  //   dbPort: process.env.DB_PORT,
  dbUrl: process.env.DB_URL,
  secretKey: process.env.JWT_SECRET_KEY,
  emailId: process.env.EMAIL_ID,
  emailPwd: process.env.EMAIL_PASSWORD,
};

module.exports = env;
