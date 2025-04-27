const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    discount: { type: Number, required: true, min: 1, max: 100 }, // Giảm giá %
    expiresAt: { type: Date, required: true }, // Hạn sử dụng
    usageLimit: { type: Number, default: 1 }, // Giới hạn số lần sử dụng
    usedCount: { type: Number, default: 0 }, // Số lần đã sử dụng
    status: { type: String, enum: ["active", "inactive"], default: "inactive" },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = { Coupon };
