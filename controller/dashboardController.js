const { Order } = require("../models/orderSchema");
const { Product } = require("../models/productSchema");

exports.getDashboardStats = async (req, res) => {
  try {
    // Get current date and 30 days ago date
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Run all queries in parallel for better performance
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippingOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      totalRevenue,
      recentOrders,
      dailyRevenue,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "confirmed" }),
      Order.countDocuments({ status: "shipping" }),
      Order.countDocuments({ status: "delivered" }),
      Order.countDocuments({ status: "cancelled" }),
      Product.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("products.product", "name images"),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            status: { $ne: "cancelled" },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            revenue: { $sum: "$totalPrice" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Get payment method distribution
    const paymentMethodStats = await Order.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        ordersByStatus: {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          shipping: shippingOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders,
        },
        totalProducts,
        totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        recentOrders,
        dailyRevenue,
        paymentMethodStats,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê dashboard",
      error: error.message,
    });
  }
};

// Get product performance metrics
exports.getProductPerformance = async (req, res) => {
  try {
    // Most sold products
    const topSellingProducts = await Product.find()
      .sort({ sold: -1 })
      .limit(10);

    // Products with highest revenue
    const highRevenueProducts = await Product.aggregate([
      {
        $project: {
          name: 1,
          brand: 1,
          categoryName: 1,
          salePrice: 1,
          images: 1,
          sold: 1,
          stock: 1,
          revenue: { $multiply: ["$salePrice", "$sold"] },
          profit: {
            $multiply: [{ $subtract: ["$salePrice", "$importPrice"] }, "$sold"],
          },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    // Low stock products
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
      .sort({ stock: 1 })
      .limit(10);

    // Category performance
    const categoryPerformance = await Product.aggregate([
      {
        $group: {
          _id: "$categoryName",
          totalProducts: { $sum: 1 },
          totalSold: { $sum: "$sold" },
          averagePrice: { $avg: "$salePrice" },
        },
      },
      { $sort: { totalSold: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        topSellingProducts,
        highRevenueProducts,
        lowStockProducts,
        categoryPerformance,
      },
    });
  } catch (error) {
    console.error("Product performance error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu hiệu suất sản phẩm",
      error: error.message,
    });
  }
};
