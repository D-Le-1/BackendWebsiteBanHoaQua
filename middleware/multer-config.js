const multer = require("multer");
const path = require("path");

// Cấu hình lưu trữ cho multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Thư mục để lưu file, đảm bảo đã tạo thư mục này
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất để tránh trùng lặp
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

// Kiểm tra loại file
const fileFilter = (req, file, cb) => {
  // Chỉ chấp nhận các file hình ảnh
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file hình ảnh!"), false);
  }
};

// Khởi tạo multer với cấu hình
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn kích thước file: 5MB
  },
});

module.exports = upload;
