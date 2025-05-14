const Joi = require("joi");

exports.signupSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
  password: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$")),
  role: Joi.string().valid("user", "admin").optional(),
});

exports.signinSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),
  password: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$")),
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().min(5).max(60).required().email().messages({
    "string.empty": "Email không được để trống",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),
});

// Schema cho validation reset mật khẩu
exports.resetPasswordSchema = Joi.object({
  password: Joi.string()
    .required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$"))
    .messages({
      "string.empty": "Mật khẩu không được để trống",
      "string.pattern.base":
        "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số",
      "any.required": "Mật khẩu là bắt buộc",
    }),
  confirmPassword: Joi.string().required().valid(Joi.ref("password")).messages({
    "string.empty": "Xác nhận mật khẩu không được để trống",
    "any.only": "Xác nhận mật khẩu phải trùng khớp với mật khẩu mới",
    "any.required": "Xác nhận mật khẩu là bắt buộc",
  }),
});
