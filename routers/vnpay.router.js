const express = require("express");
const {
  createVNPayPayment,
  handleVNPayReturn,
  handleVNPayIPN,
} = require("../controller/vnpay.controller");
const vnpayMiddleware = require("../middleware/vnpayMiddleware");

const router = express.Router();

// Route tạo URL thanh toán, áp dụng middleware
router.post("/vnpay", vnpayMiddleware, createVNPayPayment);

// Route xử lý callback từ VNPay
router.get("/vnpay/return", handleVNPayReturn);

// Route xử lý IPN từ VNPay
router.post("/vnpay/ipn", handleVNPayIPN);

module.exports = router;
