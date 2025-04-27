const Review = require("../models/reviewSchema");
const { Product } = require("../models/productSchema");

// Lấy tất cả review của một sản phẩm
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });

    // Tính rating trung bình
    let averageRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      averageRating = totalRating / reviews.length;
    }

    res.json({
      success: true,
      reviews,
      count: reviews.length,
      averageRating,
    });
  } catch (err) {
    console.error("Lỗi khi lấy reviews:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// Tạo review mới
exports.createReview = async (req, res) => {
  try {
    const { productId, userId, userName, rating, comment } = req.body;

    // Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm!" });
    }

    // Kiểm tra người dùng đã đánh giá sản phẩm này chưa
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message:
          "Bạn đã đánh giá sản phẩm này rồi! Vui lòng cập nhật đánh giá cũ.",
      });
    }

    console.log("Review data:", req.body);

    // Tạo review mới
    const newReview = new Review({
      productId, // Use productId to match schema
      userId,
      userName,
      rating,
      comment,
    });

    await newReview.save();

    // Cập nhật rating trung bình cho sản phẩm
    await updateProductAverageRating(productId);

    res.status(201).json({
      success: true,
      message: "Đánh giá của bạn đã được ghi nhận!",
      review: newReview,
    });
  } catch (err) {
    console.error("Lỗi khi tạo review:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

// Xóa review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Tìm review cần xóa
    const review = await Review.findById(reviewId);

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đánh giá!" });
    }

    // Kiểm tra quyền (chỉ người viết review hoặc admin mới được xóa)
    if (review.userId.toString() !== req.body.userId && !req.body.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa đánh giá này!",
      });
    }

    const productId = review.productId; // Use productId to match schema

    // Xóa review
    await Review.findByIdAndDelete(reviewId);

    // Cập nhật rating trung bình cho sản phẩm
    await updateProductAverageRating(productId);

    res.json({ success: true, message: "Đã xóa đánh giá!" });
  } catch (err) {
    console.error("Lỗi khi xóa review:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};
// Like một review
exports.likeReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đánh giá!" });
    }

    // Tăng số lượng like
    review.likes += 1;
    await review.save();

    res.json({
      success: true,
      message: "Đã thích đánh giá này!",
      likes: review.likes,
    });
  } catch (err) {
    console.error("Lỗi khi thích review:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};
// Hàm cập nhật rating trung bình cho sản phẩm
async function updateProductAverageRating(productId) {
  try {
    // Lấy tất cả review của sản phẩm
    const reviews = await Review.find({ productId });

    // Tính rating trung bình
    let averageRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      averageRating = totalRating / reviews.length;
    }

    // Cập nhật vào sản phẩm
    await Product.findByIdAndUpdate(productId, {
      averageRating,
      reviewCount: reviews.length,
    });

    return averageRating;
  } catch (err) {
    console.error("Lỗi khi cập nhật rating trung bình:", err);
    throw err;
  }
}
