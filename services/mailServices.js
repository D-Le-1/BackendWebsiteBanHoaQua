const nodemailer = require("nodemailer");
require("dotenv").config(); // Đọc .env

// Tạo transporter (bạn có thể đã có đoạn này trong mã của mình)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOrderConfirmationMail = async (toEmail, orderDetails) => {
  // Kiểm tra dữ liệu trước khi xử lý
  if (
    !orderDetails ||
    !orderDetails.products ||
    !Array.isArray(orderDetails.products)
  ) {
    console.error("Invalid orderDetails format:", orderDetails);
    throw new Error("Invalid order details format");
  }

  // Truyền dữ liệu từ orderDetails vào HTML content
  const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2ecc71;">Đơn hàng của bạn đã được xác nhận 🎉</h2>
        <p>Cảm ơn bạn đã đặt hàng tại cửa hàng của chúng tôi!</p>
        <p><strong>Thông tin đơn hàng:</strong></p>
        <ul>
          ${orderDetails.products
            .map(
              (item) => `
            <li>
              <img src="${item.productImage || ""}" alt="${
                item.productName || "Sản phẩm"
              }" style="width: 50px; height: 50px; margin-right: 10px;" />
              ${item.productName || "Sản phẩm"} x ${item.quantity || 0} - ${(
                item.salePrice || 0
              ).toLocaleString("vi-VN")}đ
            </li>
          `
            )
            .join("")}
        </ul>
        <p><strong>Tổng tiền:</strong> ${(
          orderDetails.totalPrice || 0
        ).toLocaleString("vi-VN")}đ</p>
        <p>Chúng tôi sẽ giao hàng trong thời gian sớm nhất 📦</p>
      </div>
    `;

  await transporter.sendMail({
    from: `"Cửa hàng Trái Cây" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Xác nhận đơn hàng của bạn!",
    html: htmlContent,
  });
};

module.exports = { sendOrderConfirmationMail };
