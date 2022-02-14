const router = require("express").Router();
const auth = require("../controllers/auth");
const isAuth = require("../middleware/auth");

// POST /auth/signup
router.post("/signup", auth.signup);

// GET /auth/login
router.post("/login", auth.login)

// GET /auth/profile
router.get("/profile", isAuth, auth.getUserProfile);

// GET /auth/forgot-password
router.post('/forgot-password', auth.forgotPassword)

// PUT /auth/change-password
router.put("/change-password", isAuth, auth.changePassword);

module.exports = router;
