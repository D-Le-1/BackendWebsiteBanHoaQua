const express = require("express");
const couponController = require("../controller/couponController");

const router = express.Router();

router.post("/create", couponController.createCoupon);
router.post("/validate", couponController.validateCoupon);
router.get("/", couponController.getCoupon);
router.patch("/:id", couponController.updateCoupon);

module.exports = router;
