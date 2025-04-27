const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    importPrice: { type: Number, required: true },
    salePrice: { type: Number, required: true },
    stock: {
      type: Number,
      default: 0,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: "Số lượng tồn kho không thể nhỏ hơn 0!",
      },
    },
    categoryName: { type: String, required: true },
    brand: { type: String, required: true },
    images: {
      type: [String],
      validate: {
        validator: function (value) {
          return value.length <= 5;
        },
        message: "Tối đa 5 hình ảnh!",
      },
    },
    sold: { type: Number, default: 0 },
    averageRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
module.exports = { Product };
