const jwt = require("jsonwebtoken");
const env = require('../utils/env')

module.exports = (req, res, next) => {
  // Getting authorization value
  const authHeader = req.get("Authorization");
  // Checking user is authorized
  if (!authHeader) {
    const error = new Error("Not authenticated.");
    error.statusCode = 401;
    throw error;
  }

  // Extracting token
  const token = authHeader.split(" ")[1];
  let decodedToken;

  try {

    // Decoding token
    decodedToken = jwt.verify(token, env.secretKey);
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }

  // Unauthorized users
  if (!decodedToken) {
    const error = new Error("Not Authenticated");
    error.statusCode = 401;
    throw error;
  }

  // Assigning user id
  req.userId = decodedToken.userId;
  next();
};
