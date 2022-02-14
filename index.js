const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pgClient = require("./utils/db");
const { port } = require("./utils/env");

const tableCreateQuery = require("./model/tableCreate");
const moviesRouter = require("./routes/movies");
const authRouter = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
pgClient.connect((err) => {
  if (err) {
    console.log(err.message);
  } else console.log("Database connected");
});

// users table
pgClient.query(tableCreateQuery.users).catch((err) => {
  console.error(err.message);
});

// movies table
pgClient.query(tableCreateQuery.movies).catch((err) => {
  console.error(err.message);
});

// view history movies table
pgClient.query(tableCreateQuery.history).catch((err) => {
  console.error(err.message);
});

// ---------------- Routings start-----------------

// User routing
app.use("/api/auth", authRouter);

// Movies routing
app.use("/api/movies", moviesRouter);

// -----------------Routing End---------------------

// Error throwing message
app.use((error, req, res, next) => {
  console.log("Error ----- " + error);
  const { statusCode, message, data } = error;
  res.status(statusCode).json({ message: message, data: data });
});

// Server listening port
app.listen(port || 5000, () => {
  console.log("Server listening on port 5000");
});
