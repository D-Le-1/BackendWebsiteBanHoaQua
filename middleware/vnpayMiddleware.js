const vnpayMiddleware = (req, res, next) => {
  const { amount, orderInfo } = req.body;

  if (!amount || !orderInfo) {
    return res
      .status(400)
      .json({ error: "Thiếu thông tin amount hoặc orderInfo" });
  }

  const { productName } = orderInfo;
  if (!productName) {
    return res
      .status(400)
      .json({ error: "Thiếu thông tin productName trong orderInfo" });
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Số tiền không hợp lệ" });
  }

  next();
};

module.exports = vnpayMiddleware;
