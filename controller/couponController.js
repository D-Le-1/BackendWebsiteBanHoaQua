const mongoose = require("mongoose");
const { Coupon } = require("../models/couponSchema");

exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      discount,
      description,
      expiresAt,
      usageLimit,
      usedCount,
      status,
    } = req.body;

    if (!code || !discount || !expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu dữ liệu!" });
    }

    const newCoupon = new Coupon({
      code,
      discount,
      description,
      expiresAt,
      usageLimit,
      usedCount,
      status,
    });
    await newCoupon.save();

    res.status(201).json({
      success: true,
      message: "Mã giảm giá đã được tạo!",
      coupon: newCoupon,
    });
  } catch (err) {
    console.error("Lỗi tạo mã giảm giá:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Mã giảm giá không tồn tại!" });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res
        .status(400)
        .json({ success: false, message: "Mã giảm giá đã hết lượt sử dụng!" });
    }

    if (new Date() > coupon.expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: "Mã giảm giá đã hết hạn!" });
    }

    res.status(200).json({ success: true, discount: coupon.discount });
  } catch (err) {
    console.error("Lỗi kiểm tra mã giảm giá:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.getCoupon = async (req, res) => {
  const coupon = await Coupon.find();
  if (!coupon) {
    return res
      .status(404)
      .json({ success: false, message: "Coupon does not exist!" });
  }
  try {
    res.status(201).json({ success: true, coupon });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error!" });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái mới là bắt buộc!",
      });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon không tồn tại!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Trạng thái coupon đã được cập nhật!",
      coupon,
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái coupon:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};
