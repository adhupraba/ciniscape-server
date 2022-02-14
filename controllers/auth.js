const bcrypt = require("bcryptjs");
const { v4 } = require("uuid");
const pgClient = require("../utils/db");
const jwt = require("jsonwebtoken");
const { sendMail } = require("../utils/mail");
const env = require('../utils/env')

// Resetcode generator
const resetCode = () => {
  const code = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  for (
    var j, x, i = code.length;
    i;
    j = parseInt(Math.random() * i),
    x = code[--i],
    code[i] = code[j],
    code[j] = x
  );
  return parseInt(code.join(""));
};

/**
 *
 * @body {*} email
 * @body {*} username
 * @body {*} dob
 * @body {*} password
 * @body {*} imageUrl
 * @returns User creation message
 */
// Signup request controller
exports.signup = async (req, res, next) => {
  try {
    // Extracting user details from body
    const { email, username, password, dob, imageUrl } = req.body;
    
    // Throws error message if data is not present
    if (!email || !username || !password || !dob || !imageUrl) {
      const error = new Error("");

      error.message = !email ? "Email" : !password ? "Password" : !username ? "Username" : !dob ? "Dob" : "imageUrl";
      error.message = error.message + " is not available in request body";
      error.statusCode = 400;
      error.data = { email, username, password, dob, imageUrl };
      throw error;
    }

    // Hashing password
    const hashedPwd = await bcrypt.hash(password, 10);

    // Inserting user details only if data is not already present
    const insertUser = await pgClient.query(
      `
      INSERT INTO users (user_id, username, email, dob, password, image_url, reset_code, created_on)
      SELECT * FROM (SELECT $1, $2, $3, to_date($4, 'DD Mon YYYY'), $5, $6, $7, (to_timestamp($8/ 1000.0)) ) AS tmp
      WHERE NOT EXISTS (
        SELECT username, email FROM users WHERE username = $2 OR email = $3
      ) LIMIT 1;
    `,
      [v4(), username, email, dob, hashedPwd, imageUrl, null, Date.now()]
    );

    // Throws error if user details already present
    if (insertUser.rowCount === 0) {
      const error = new Error("User already exist");
      error.statusCode = 400;
      throw error;
    }

    // Response for user creation
    res.status(200).json({ message: "User created" });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    
    // Extracting user details from body
    const { email, password } = req.body;

    // Throws error message if data is not present
    if (!email || !password) {
      const error = new Error("");
      error.message = !email ? "Email" : "Password";
      error.message = error.message + " is not available in request body";
      error.statusCode = 400;
      error.data = { email, password };
      throw error;
    }
    
    // Getting existing user details
    const existUser = await pgClient.query(`
      SELECT
        user_id, username, email, password, image_url,
        TO_CHAR(dob, 'dd Mon yyyy') AS dob,
        TO_CHAR(created_on, 'dd Mon yyyy') AS created_on
      FROM users WHERE email = $1 OR username = $1
    `, [email]
    );
    
    // Throws error message if user is not exist
    if (existUser.rowCount === 0) {
      const error = new Error("There is no user with this email");
      error.statusCode = 404;
      throw error;
    }
    
    const user = existUser.rows[0]
    
    // Checking the password match
    const isPwdMatch = await bcrypt.compare(
      password,
      user.password
    );

    // Throws error message if password is not correct
    if (!isPwdMatch) {
      const error = new Error("Invalid user credentials");
      error.statusCode = 404;
      throw error;
    }
    
    const authUser = {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      imageUrl: user.image_url,
      dob: user.dob,
      createdOn: user.created_on
    }
    
    // Generating jwt token for authentication
    jwt.sign(
      { ...authUser },
      env.secretKey,
      { expiresIn: "1 day" },
      (err, token) => {
        if (err) throw err;

        // Response for login
        res.status(200).json({
          message: "Login successfull",
          token: token,
          user: authUser
        });
      }
      );
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

// User profile request controller
exports.getUserProfile = async (req, res, next) => {
  try {
    // Extracting userId from request
    const { userId } = req;

    // Getting user is details from database
    const userDetails = await pgClient.query(`
      SELECT
        user_id, username, email, image_url,
        TO_CHAR(dob, 'dd Mon yyyy') AS dob,
        TO_CHAR(created_on, 'dd Mon yyyy') AS created_on
      FROM users WHERE user_id = $1 `
      , [userId]
    );

    // Throws error message if user details is not present
    if (userDetails.rowCount === 0) {
      const error = new Error("Could not find any user details");
      error.statusCode = 404;
      error.data = { userId: userId };
      throw error;
    }

    const getHistory = await pgClient.query(`
      SELECT movies.movie_id, movies.movie_title, movies.poster_url, visited_movies.time_stamp FROM movies
      INNER JOIN visited_movies ON movies.movie_id = visited_movies.movie_id
      WHERE visited_movies.user_id = $1 ORDER BY visited_movies.time_stamp DESC
    `, [userId]
    );
    
    const historyRes = getHistory.rows.map(ele => {
      let historyElement = {};
      historyElement.movie_id = ele.movie_id;
      historyElement.movie_title = ele.movie_title;
      historyElement.posterPath = ele.poster_url;
      historyElement.time_stamp = ele.time_stamp;
      return historyElement;
    })

    // Response for user details
    res
      .status(200)
      .json({
        message: "User details fetched",
        user: userDetails.rows[0],
        history: historyRes
      });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

// Change password request controller
exports.changePassword = async (req, res, next) => {
  try {
    // Extracting userId from request
    const { userId } = req;
    // Extracting current password and new password from request body
    const { currPass, newPass } = req.body;

    // Throws error message if current password or new password data is not present
    if (!currPass || !newPass) {
      const error = new Error("");

      error.message = !currPass ? "Current password" : "New password";
      error.message = error.message + " is not available in request body";
      error.statusCode = 400;
      error.data = { currPass, newPass };
      throw error;
    }

    // Getting user details
    const existUser = await pgClient.query(
      `SELECT email, password FROM users WHERE user_id = $1`,
      [userId]
    );

    // Throws error message if user is not present
    if (!existUser.rowCount === 0) {
      const error = new Error("Could not find any user details");
      error.statusCode = 404;
      error.data = { userId: userId };
      throw error;
    }

    // Comparing current password with new password
    const isPwdMatch = await bcrypt.compare(
      currPass,
      existUser.rows[0].password
    );

    // Throws error message if password does not matches
    if (!isPwdMatch) {
      const error = new Error("Enter the correct password");
      error.statusCode = 400;
      throw error;
    }

    // Hashing new password
    const hashedPass = await bcrypt.hash(newPass, 10);

    // Updatng new password
    await pgClient.query(
      `
      UPDATE users SET password = $1 WHERE user_id = $2
    `,
      [hashedPass, userId]
    );

    // Sending notification for user after password change
    sendMail({
      to: existUser.rows[0].email,
      subject: "Password update notification",
      text: "You are receiving this email because your password was updated",
    });

    // Response for changing password
    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};

// Forget password request controller
exports.forgotPassword = async (req, res, next) => {
  // Getting reset code
  const code = resetCode();
  try {
    // Extracting details from user to reset password
    const { email, resetCode, password } = req.body;
    
    // Throws error message if email is not present
    if (!email) {
      const error = new Error("Email is not available in request body");
      error.statusCode = 400;
      throw error;
    }

    // If reset code is not present sent resetcode to user and update in database
    if (!resetCode) {
      // Getting user details
      const getUserDetails = await pgClient.query(
        `
        SELECT * FROM users WHERE email = $1
      `,
        [email]
      );

      // Throws error message if user is not present
      if (getUserDetails.rowCount === 0) {
        const error = new Error("User not found");
        error.statusCode = 404;
        error.data = { email: email };
        throw error;
      }

      // Updating resetcode in user details
      await pgClient.query(
        `
        UPDATE users SET reset_code = $1 WHERE email = $2
      `,
        [code, email]
      );

      // Sending resetcode to user via mail
      sendMail({
        to: email,
        subject: "Reset password ",
        text: `Reset code '${code}' for password reset`,
      });

      // Response for checking email
      return res
        .status(200)
        .json({ message: "Please check email for verification code" });
    }

    // hashing password
    const hashedPwd = await bcrypt.hash(password, 10);

    // Updating user details with new password and removing resetcode
    const getResetCode = await pgClient.query(
      `
      UPDATE users SET reset_code = $1 , password = $2 WHERE reset_code = $3 AND email = $4
    `,
      [null, hashedPwd, resetCode, email]
    );

    // Throws error message if resetcode is wrong
    if (getResetCode.rowCount === 0) {
      const error = new Error("Incorrect verification code. Check your email");
      error.statusCode = 400;
      error.data = { code: resetCode, password: password };
      throw error;
    }

    // Response for reset password
    res.status(200).json({ message: "Successfully reset password" });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    next(error);
  }
};