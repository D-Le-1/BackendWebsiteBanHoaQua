const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/dqj1xg2l7/image/upload/v1695694906/avartar/avartar-default.png",
    },
    name: {
      type: String,
      required: [true, "Name is required!"],
      trim: true,
      minLength: [3, "Name must have 3 characters!"],
    },
    phone: {
      type: String,
      required: [true, "Phone is required!"],
      trim: true,
      unique: [true, "Phone must be unique!"],
      minLength: [10, "Phone must have 10 characters!"],
    },
    address: {
      type: String,
      required: [true, "Address is required!"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required!"],
      trim: true,
      unique: [true, "Email must be unique!"],
      minLength: [5, "Email must have 5 characters!"],
      lowercase: true,
    },
    password: {
      type: String,
      require: [true, "Password is required!"],
      trim: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "manager", "admin"],
      default: "user",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationCodeValidation: {
      type: Number,
      select: false,
    },
    forgotPasswordCode: {
      type: String,
      select: false,
    },
    forgotPasswordCodeValidation: {
      type: Number,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
module.exports = { User };
