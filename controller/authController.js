const jwt = require("jsonwebtoken");
const { signupSchema, signinSchema } = require("../middleware/validator");
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
