const { Order } = require("../models/orderSchema");
const { Product } = require("../models/productSchema");
const { sendOrderConfirmationMail } = require("../services/mailServices");

exports.createOrder = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      products,
      paymentMethod,
      discountAmount = 0,
    } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !address ||
      !products ||
      products.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu không hợp lệ!" });
    }

    let totalPrice = 0;

    for (let item of products) {
      const product = await Product.findOne({ _id: item.product }); // Sửa lại truy vấn để tìm theo _id của sản phẩm
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Sản phẩm với ID ${item.product} không tồn tại!`,
        });
      }

      // Kiểm tra giá trị salePrice và quantity trước khi tính tổng
      if (
        isNaN(product.salePrice) ||
        isNaN(item.quantity) ||
        item.quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${product.name} có giá trị không hợp lệ hoặc số lượng không hợp lệ!`,
        });
      }

      totalPrice += product.salePrice * item.quantity;
    }

    const status =
      paymentMethod === "Bank" || paymentMethod === "Credit Card"
        ? "confirmed"
        : "pending";

    const userId = req.user.id;
    const newOrder = new Order({
      userId,
      name,
      email,
      phone,
      address,
      products,
      totalPrice: totalPrice - discountAmount,
      discountAmount,
      paymentMethod,
      status,
    });

    if (status === "confirmed") {
      for (const item of products) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock -= item.quantity;
          product.sold += item.quantity; // ✅ Tăng số lượng đã bán
          await product.save();
        }
      }
    }

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Đơn hàng đã được tạo!",
      order: newOrder,
    });
  } catch (err) {
    console.log("Lỗi khi tạo đơn hàng:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.getOrderbyEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required!" });
    }

    const orders = await Order.find({ email });
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No orders found for the email: ${email}`,
      });
    }
    res.status(200).json({
      success: true,
      message: "Orders fetched successfully!",
      orders,
    });
  } catch (err) {
    console.log("Error while fetching orders:", err);
    res.status(500).json({ success: false, message: "Server Error!" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái mới là bắt buộc!",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng!",
      });
    }

    // Nếu đơn chuyển sang trạng thái 'confirmed' => tiến hành trừ hàng
    if (status === "confirmed" && order.status !== "confirmed") {
      for (const item of order.products) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock -= item.quantity;
          product.sold += item.quantity; // ✅ Tăng số lượng đã bán
          await product.save();
        }
      }
    }

    const products = await Promise.all(
      order.products.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          productName: product.name, // Sử dụng tên sản phẩm từ thông tin sản phẩm
          productImage:
            product.images && product.images.length > 0
              ? product.images[0]
              : "",
          quantity: item.quantity,
          salePrice: product.salePrice || 0,
        };
      })
    );

    await sendOrderConfirmationMail(order.email, {
      products,
      totalPrice: order.totalPrice,
    });

    // Cập nhật trạng thái đơn hàng
    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công!",
      order,
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái đơn hàng:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id).populate({
      path: "products.product",
      model: "Product",
      select: "name salePrice imageUrl", // chọn các field cần thiết
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết đơn hàng thành công!",
      order,
    });
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};
