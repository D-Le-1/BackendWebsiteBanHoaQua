const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Không có token, từ chối truy cập" });
  }

  const token = authHeader.split(" ")[1]; // Lấy token sau "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET); // Giải mã token
    req.user = decoded; // Gắn thông tin user vào request
    next(); // Cho phép tiếp tục xử lý request
  } catch (error) {
    return res.status(403).json({ message: "Token không hợp lệ" });
  }
};

module.exports = authMiddleware;
