const express = require("express");
const authController = require("../controller/authController");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/multer-config"); // Import multer middleware

router.post("/signup", authController.signup);
router.post("/signin", authController.signin);
router.post("/signout", authController.signout);
router.get("/user", authController.getlist);
router.patch(
  "/update",
  authMiddleware,
  upload.single("avatar"),
  authController.updateUserInfo
);
router.patch("/role/:id", authMiddleware, authController.changeRole);

module.exports = router;
