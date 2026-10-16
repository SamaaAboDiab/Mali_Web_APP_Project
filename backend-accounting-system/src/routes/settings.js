const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const auth   = require("../middleware/auth");
const c      = require("../controllers/settingsController");

const emailCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many email verification attempts. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(auth);

router.get("/profile",          c.getProfile);
router.put("/profile",          c.updateProfile);
router.post("/email/request",   emailCodeLimiter, c.requestEmailChange);
router.post("/email/confirm",   emailCodeLimiter, c.confirmEmailChange);
router.post("/photo",           c.uploadPhoto);
router.delete("/photo",         c.deletePhoto);
router.put("/locale",           c.saveLocale);
router.put("/password",         c.changePassword);

module.exports = router;
