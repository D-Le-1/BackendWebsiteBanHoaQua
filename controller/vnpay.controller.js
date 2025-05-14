const { VNPay, ProductCode, VnpLocale } = require("vnpay");
const PendingOrder = require("../models/pendingOrder.model");
const { Order } = require("../models/orderSchema");
const { Product } = require("../models/productSchema");

require("dotenv").config();

const vnpay = new VNPay({
  tmnCode: process.env.VNPAY_TMN_CODE,
  secureSecret: process.env.VNPAY_SECURE_SECRET,
  vnpayHost: process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn",
  testMode: process.env.NODE_ENV !== "production",
  hashAlgorithm: "SHA512",
  enableLog: true,
});

// Tạo URL thanh toán VNPAY
const createVNPayPayment = async (req, res) => {
  try {
    const { amount, orderInfo, orderData } = req.body;
    const { productName } = orderInfo;

    // Tạo mã đơn hàng duy nhất
    const orderId = `ORDER_${Date.now()}`;

    // Lưu thông tin đơn hàng vào cơ sở dữ liệu tạm thời
    await PendingOrder.create({
      orderId,
      orderData: {
        amount,
        productName,
        fullOrderData: orderData,
      },
      status: "pending",
    });

    // Tạo URL thanh toán
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: req.headers["x-forwarded-for"] || req.ip,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toán đơn hàng ${orderId} - Sản phẩm: ${productName}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: `${process.env.APP_URL}/api/payment/vnpay/return`,
      vnp_Locale: VnpLocale.VN,
    });

    // Trả về URL thanh toán dưới dạng JSON
    return res.status(200).json({
      success: true,
      message: "URL thanh toán đã được tạo",
      paymentUrl: paymentUrl,
    });
  } catch (error) {
    console.error("Lỗi tạo thanh toán VNPAY:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo URL thanh toán",
      error: error.message,
    });
  }
};

// Xử lý khi người dùng hoàn thành thanh toán và quay lại
const handleVNPayReturn = async (req, res) => {
  try {
    const query = req.query;
    console.log("VNPay Return Query:", query);

    const verify = await vnpay.verifyReturnUrl(query);

    if (
      verify.vnp_ResponseCode !== "00" ||
      verify.vnp_TransactionStatus !== "00"
    ) {
      return res.redirect(
        "http://localhost:5173/order-failed?message=Giao+dịch+không+thành+công"
      );
    }

    if (!verify.isSuccess) {
      // Nếu giao dịch KHÔNG thành công, đánh dấu đơn pending là cancelled
      await PendingOrder.findOneAndUpdate(
        { orderId: verify.vnp_TxnRef },
        { status: "cancelled" }
      );
      return res.redirect(
        "http://localhost:5173/order-failed?message=Giao+dịch+thất+bại"
      );
    }

    // Nếu verify thành công
    const pendingOrder = await PendingOrder.findOne({
      orderId: verify.vnp_TxnRef,
    });

    if (!pendingOrder) {
      return res.redirect(
        "http://localhost:5173/order-failed?message=Không+tìm+thấy+đơn+hàng"
      );
    }

    const { fullOrderData } = pendingOrder.orderData;

    // Bỏ đoạn cập nhật stock và sold

    // Tạo đơn hàng chính thức với status là pending
    const newOrder = await Order.create({
      name: fullOrderData.name,
      email: fullOrderData.email,
      phone: fullOrderData.phone,
      address: fullOrderData.address,
      products: fullOrderData.products,
      totalPrice: fullOrderData.totalPrice,
      discountAmount: fullOrderData.discountAmount || 0,
      paymentMethod: fullOrderData.paymentMethod,
      status: "pending", // Thay đổi từ confirmed thành pending
    });

    // Cập nhật trạng thái đơn pending
    pendingOrder.status = "completed";
    await pendingOrder.save();

    // Chuẩn bị dữ liệu gửi email
    const products = await Promise.all(
      fullOrderData.products.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          productName: item.productName,
          productImage: product.images[0] || "",
          quantity: item.quantity,
          salePrice: product.salePrice,
        };
      })
    );

    return res.redirect(
      `http://localhost:5173/order-success?orderId=${newOrder._id}`
    );
  } catch (error) {
    console.error("Error in handleVNPayReturn:", error.message);
    return res.redirect(
      `http://localhost:5173/order-failed?message=${encodeURIComponent(
        error.message
      )}`
    );
  }
};

const handleVNPayIPN = async (req, res) => {
  try {
    const query = req.query;
    console.log("VNPay IPN Query:", query);

    const verify = await vnpay.verifyIpnCall(query);

    if (verify.isVerified) {
      const pendingOrder = await PendingOrder.findOne({
        orderId: verify.vnp_TxnRef,
      });

      if (!pendingOrder) {
        return res
          .status(200)
          .json({ RspCode: "01", Message: "Order not found" });
      }

      if (pendingOrder.status === "confirmed") {
        return res
          .status(200)
          .json({ RspCode: "02", Message: "Order already confirmed" });
      }

      const { fullOrderData } = pendingOrder.orderData;

      // Tạo đơn hàng với status là pending
      await Order.create({
        name: fullOrderData.name,
        email: fullOrderData.email,
        phone: fullOrderData.phone,
        address: fullOrderData.address,
        products: fullOrderData.products,
        totalPrice: fullOrderData.totalPrice,
        discountAmount: fullOrderData.discountAmount || 0,
        paymentMethod: fullOrderData.paymentMethod,
        status: "pending", // Thay đổi từ confirmed thành pending
      });

      // Bỏ đoạn trừ stock và tăng sold

      pendingOrder.status = "confirmed";
      await pendingOrder.save();

      return res
        .status(200)
        .json({ RspCode: "00", Message: "Confirm Success" });
    } else {
      return res
        .status(200)
        .json({ RspCode: "97", Message: "Checksum failed" });
    }
  } catch (error) {
    console.error("Lỗi xử lý IPN VNPAY:", error);
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
};

module.exports = {
  createVNPayPayment,
  handleVNPayReturn,
  handleVNPayIPN,
};
