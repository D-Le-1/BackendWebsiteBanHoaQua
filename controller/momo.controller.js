const crypto = require("crypto");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const PendingOrder = require("../models/pendingOrder.model");

dotenv.config();

exports.createMomoPayment = async (req, res) => {
  const { amount, orderInfo, orderData } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!orderInfo || !orderInfo.orderId) {
    return res
      .status(400)
      .json({ error: "orderId không tồn tại trong orderInfo" });
  }
  if (!orderInfo.productName) {
    return res
      .status(400)
      .json({ error: "productName không tồn tại trong orderInfo" });
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "Số tiền phải là số nguyên dương" });
  }

  const orderId = orderInfo.orderId;
  const requestId = uuidv4();

  try {
    // Kiểm tra tính duy nhất của orderId
    const existingOrder = await PendingOrder.findOne({ orderId });
    if (existingOrder) {
      return res.status(400).json({ error: "orderId đã tồn tại" });
    }

    // Lưu đơn hàng tạm
    await PendingOrder.create({
      orderId,
      orderData,
      status: "pending",
      createdAt: new Date(),
    });

    // Làm sạch orderInfo để tránh ký tự đặc biệt
    const cleanOrderInfo = orderInfo.productName.replace(/[&=%]/g, "");
    const extraData = Buffer.from(JSON.stringify({ orderId })).toString(
      "base64"
    );

    // Tạo chữ ký
    const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&ipnUrl=${process.env.MOMO_NOTIFY_URL}&orderId=${orderId}&orderInfo=${cleanOrderInfo}&partnerCode=${process.env.MOMO_PARTNER_CODE}&redirectUrl=${process.env.MOMO_RETURN_URL}&requestId=${requestId}&requestType=captureWallet`;
    const signature = crypto
      .createHmac("sha256", process.env.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode: process.env.MOMO_PARTNER_CODE,
      accessKey: process.env.MOMO_ACCESS_KEY,
      requestId,
      amount,
      orderId,
      orderInfo: cleanOrderInfo,
      redirectUrl: process.env.MOMO_RETURN_URL,
      ipnUrl: process.env.MOMO_NOTIFY_URL,
      extraData,
      requestType: "captureWallet",
      signature,
      lang: "vi",
    };

    console.log("Request body to MoMo:", JSON.stringify(requestBody, null, 2));

    const momoRes = await axios.post(process.env.MOMO_ENDPOINT, requestBody, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("MoMo response:", momoRes.data);

    if (momoRes.data && momoRes.data.payUrl) {
      return res.status(200).json({ payUrl: momoRes.data.payUrl });
    } else {
      return res.status(500).json({ error: "Không có URL thanh toán từ MoMo" });
    }
  } catch (err) {
    console.error("MoMo Error:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Không thể tạo thanh toán MoMo",
      details: err.response?.data || err.message,
    });
  }
};
// Thêm function xử lý callback từ MoMo
exports.handleMomoCallback = async (req, res) => {
  const { orderId, resultCode, message, extraData } = req.query;

  try {
    console.log("MoMo callback received:", req.query);

    // Kiểm tra kết quả thanh toán
    if (resultCode === "0") {
      // Thanh toán thành công

      // Giải mã extraData nếu có
      let decodedExtraData = {};
      if (extraData) {
        const jsonStr = Buffer.from(extraData, "base64").toString();
        try {
          decodedExtraData = JSON.parse(jsonStr);
        } catch (e) {
          console.error("Lỗi giải mã extraData:", e);
        }
      }

      // Tìm đơn hàng tạm trong database
      const pendingOrder = await PendingOrder.findOne({
        orderId: decodedExtraData.orderId || orderId,
      });

      if (pendingOrder) {
        // Tạo đơn hàng chính thức - cần import model Order
        const Order = require("../models/order.model"); // Thay đổi đường dẫn phù hợp

        await Order.create({
          ...pendingOrder.orderData,
          paymentStatus: "paid",
          momoTransactionId: req.query.transId || "",
          status: "processing",
          createdAt: new Date(),
        });

        // Xóa đơn hàng tạm
        await PendingOrder.deleteOne({ _id: pendingOrder._id });

        // Chuyển hướng người dùng đến trang thành công
        return res.redirect(`/order-success?orderId=${orderId}`);
      } else {
        console.error("Không tìm thấy đơn hàng tạm:", orderId);
        return res.redirect("/order-failed?error=order-not-found");
      }
    } else {
      // Thanh toán thất bại
      console.error("Thanh toán MoMo thất bại:", message);
      return res.redirect(`/order-failed?error=${encodeURIComponent(message)}`);
    }
  } catch (error) {
    console.error("Lỗi xử lý callback MoMo:", error);
    return res.redirect("/order-failed?error=server-error");
  }
};

// Thêm function xử lý IPN từ MoMo
exports.handleMomoIPN = async (req, res) => {
  try {
    const { orderId, resultCode, message, extraData, transId } = req.body;

    console.log("MoMo IPN received:", req.body);

    // Xác minh chữ ký từ MoMo
    // TODO: Thêm mã xác minh chữ ký

    if (resultCode === "0") {
      // Thanh toán thành công

      // Giải mã extraData
      let decodedExtraData = {};
      if (extraData) {
        const jsonStr = Buffer.from(extraData, "base64").toString();
        try {
          decodedExtraData = JSON.parse(jsonStr);
        } catch (e) {
          console.error("Lỗi giải mã extraData:", e);
        }
      }

      // Tìm đơn hàng tạm trong database
      const pendingOrder = await PendingOrder.findOne({
        orderId: decodedExtraData.orderId || orderId,
      });

      if (pendingOrder) {
        // Cần import model Order
        const Order = require("../models/order.model"); // Thay đổi đường dẫn phù hợp

        // Kiểm tra xem đơn hàng đã được xử lý chưa
        const existingOrder = await Order.findOne({ orderId });

        if (!existingOrder) {
          // Tạo đơn hàng chính thức
          await Order.create({
            ...pendingOrder.orderData,
            paymentStatus: "paid",
            momoTransactionId: transId || "",
            status: "processing",
            createdAt: new Date(),
          });

          // Xóa đơn hàng tạm
          await PendingOrder.deleteOne({ _id: pendingOrder._id });

          console.log("Order created successfully via IPN");
        }
      }
    }

    // Luôn trả về thành công cho MoMo để tránh gửi lại IPN
    return res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error("Lỗi xử lý IPN từ MoMo:", error);
    // Vẫn trả về thành công để MoMo không gửi lại IPN
    return res.status(200).json({ message: "Success" });
  }
};
