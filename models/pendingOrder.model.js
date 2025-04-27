// models/pendingOrder.model.js
const mongoose = require("mongoose");

const pendingOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  orderData: {
    type: Object,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Tự động xóa sau 24 giờ
  },
});

module.exports = mongoose.model("PendingOrder", pendingOrderSchema);
