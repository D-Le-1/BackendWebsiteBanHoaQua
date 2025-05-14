const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();
const nodemailer = require("nodemailer");
const {
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../middleware/validator");
const { doHash, doHashValidation } = require("../utils/hashing");
const { User } = require("../models/userSchema");

exports.signup = async (req, res) => {
  const { name, phone, address, email, password, role } = req.body;
  try {
    const { error, value } = signupSchema.validate({ email, password });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(401)
        .json({ success: false, message: "User already exist!" });
    }

    const hashedPassword = await doHash(password, 12);

    const newRole = role === "admin" ? "admin" : "user";

    const newUser = new User({
      name,
      phone,
      address,
      email,
      password: hashedPassword,
      role: newRole,
    });
    const result = await newUser.save();
    result.password = undefined;
    res.status(201).json({
      success: true,
      message: "Your account has been created successfully!",
      result,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.signin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { error, value } = signinSchema.validate({ email, password });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }
    const existingUser = await User.findOne({ email }).select("+password");
    if (!existingUser) {
      return res
        .status(401)
        .json({ success: false, message: "User does not exist!" });
    }
    const result = await doHashValidation(password, existingUser.password);
    if (!result) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials!" });
    }
    const token = jwt.sign(
      {
        avatar: existingUser.avatar,
        userId: existingUser._id,
        name: existingUser.name,
        phone: existingUser.phone,
        address: existingUser.address,
        email: existingUser.email,
        role: existingUser.role, // 🔥 Thêm role
        verified: existingUser.verified,
      },
      process.env.TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      success: true,
      token,
      user: {
        userId: existingUser._id,
        avatar: existingUser.avatar,
        name: existingUser.name,
        phone: existingUser.phone,
        address: existingUser.address,
        email: existingUser.email,
        role: existingUser.role,
      },
      message: "logged in successfully",
    });
  } catch (err) {
    console.log(err);
  }
};

exports.signout = async (req, res) => {
  res
    .clearCookie("Authorization")
    .status(201)
    .json({ success: true, message: "logged out successfully!" });
};

exports.getlist = async (req, res) => {
  const result = await User.find({});
  try {
    res.send(result);
  } catch (error) {
    console.log(error);
  }
};

exports.updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.userId; // Lấy từ middleware auth (JWT đã decode)

    // Lấy các trường từ req.body
    const { name, phone, address } = req.body;

    // Lấy file avatar từ req.file (nếu có)
    const avatar = req.file
      ? `http://localhost:8000/uploads/${req.file.filename}`
      : undefined;

    // Tìm user hiện tại để lấy avatar cũ (nếu không có file mới)
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Cập nhật user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        phone,
        address,
        avatar: avatar || currentUser.avatar, // Giữ avatar cũ nếu không có file mới
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "User info updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user info failed:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.changeRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    const { error } = forgotPasswordSchema.validate({ email });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Tìm người dùng theo email
    const user = await User.findOne({ email });

    // Nếu không tìm thấy người dùng, vẫn trả về thành công để không tiết lộ thông tin tài khoản
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu",
      });
    }

    // Tạo mã xác nhận ngẫu nhiên 6 chữ số
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash mã xác nhận trước khi lưu
    const hashedResetCode = crypto
      .createHash("sha256")
      .update(resetCode)
      .digest("hex");

    // Lưu mã vào database và thiết lập thời gian hết hạn (10 phút)
    user.forgotPasswordCode = hashedResetCode;
    user.forgotPasswordCodeValidation = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Thiết lập nội dung email
    const message = `
      Xin chào ${user.name},

      Mã xác nhận để đặt lại mật khẩu của bạn là: ${resetCode}

      Mã này sẽ hết hạn sau 10 phút.

      Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.

      Trân trọng,
      Đội ngũ hỗ trợ
    `;

    // Thiết lập transporter email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Gửi email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Yêu cầu đặt lại mật khẩu",
      text: message,
    });

    res.status(200).json({
      success: true,
      message: "Mã xác nhận đã được gửi đến email của bạn",
    });
  } catch (error) {
    console.error("Lỗi khi gửi email đặt lại mật khẩu:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi gửi email đặt lại mật khẩu",
      error: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, password, confirmPassword } = req.body;

    // Validate mật khẩu
    const { error } = resetPasswordSchema.validate({
      password,
      confirmPassword,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Hash mã xác nhận để so sánh
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

    // Tìm người dùng với email và mã xác nhận hợp lệ
    const user = await User.findOne({
      email,
      forgotPasswordCode: hashedCode,
      forgotPasswordCodeValidation: { $gt: Date.now() },
    }).select("+forgotPasswordCode +forgotPasswordCodeValidation");

    // Nếu không tìm thấy người dùng hoặc mã đã hết hạn
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Mã xác nhận không hợp lệ hoặc đã hết hạn",
      });
    }

    // Hash mật khẩu mới
    const hashedPassword = await doHash(password, 12);

    // Cập nhật mật khẩu và xóa mã reset
    user.password = hashedPassword;
    user.forgotPasswordCode = undefined;
    user.forgotPasswordCodeValidation = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Mật khẩu đã được đặt lại thành công",
    });
  } catch (error) {
    console.error("Lỗi khi đặt lại mật khẩu:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi đặt lại mật khẩu",
      error: error.message,
    });
  }
};
