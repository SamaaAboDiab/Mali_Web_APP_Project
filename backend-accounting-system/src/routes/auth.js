const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { register, login, me, forgotPassword, resetPassword } = require("../controllers/authController");
const auth = require("../middleware/auth");
const adminLoginLimiter = require("../middleware/adminLoginLimiter");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 20,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many registration attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many password recovery attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", registrationLimiter, register);
router.post("/login", loginLimiter, adminLoginLimiter, login);
router.get("/me", auth, me);
router.post("/forgot-password", passwordRecoveryLimiter, forgotPassword);
router.post("/reset-password", passwordRecoveryLimiter, resetPassword);

module.exports = router;
