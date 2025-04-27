const { Product } = require("../models/productSchema");
const Category = require("../models/categorySchema");
const fs = require("fs");
const path = require("path");

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { id: categoryName } = req.params; // Lấy categoryName từ params

    if (!categoryName) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu categoryName trong URL." });
    }

    // Tìm sản phẩm theo categoryName
    const products = await Product.find({ categoryName: categoryName });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sản phẩm với danh mục: ${categoryName}`,
      });
    }

    res.json({ success: true, products });
  } catch (err) {
    console.error("Lỗi khi lấy sản phẩm theo danh mục:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tìm sản phẩm theo danh mục!",
    });
  }
};

// Lấy sản phẩm theo ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm!" });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      importPrice,
      salePrice,
      stock,
      categoryName,
      brand,
      images,
    } = req.body;

    if (stock !== undefined && stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng tồn kho không thể nhỏ hơn 0!",
      });
    }

    // Kiểm tra xem có ảnh được upload không
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Ảnh là bắt buộc!" });
    }

    // Kiểm tra categoryName
    if (!categoryName) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu category!" });
    }

    const category = await Category.findOne({ name: categoryName });
    if (!category) {
      return res
        .status(400)
        .json({ success: false, message: "Category không tồn tại!" });
    }

    // Tạo mảng URL ảnh từ các file đã upload
    const imageUrls = req.files.map(
      (file) => `http://localhost:8000/uploads/${file.filename}`
    );

    // Tạo sản phẩm mới
    const newProduct = new Product({
      name,
      description,
      importPrice,
      salePrice,
      stock,
      categoryName: category.name,
      brand,
      images: imageUrls,
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Sản phẩm đã được thêm!",
      product: newProduct,
    });
  } catch (err) {
    console.log("Lỗi khi tạo sản phẩm:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = { ...req.body };

    if (updateData.stock !== undefined && updateData.stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng tồn kho không thể nhỏ hơn 0!",
      });
    }

    // Nếu có file mới được upload
    if (req.files && req.files.length > 0) {
      console.log("New images uploaded:", req.files.length);
      // Tạo mảng URL của các file ảnh mới
      updateData.images = req.files.map(
        (file) => `http://localhost:8000/uploads/${file.filename}`
      );
    } else if (req.body.keepExistingImages === "true") {
      console.log("Keeping existing images");
      // Nếu client muốn giữ lại ảnh cũ, không cập nhật trường images
      delete updateData.images;
      delete updateData.keepExistingImages;
      delete updateData.existingImages;
    }

    // Xóa các trường không cần thiết
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === "") {
        delete updateData[key];
      }
    });

    console.log("Final update data:", updateData);

    // Cập nhật sản phẩm
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm!" });
    }

    res.json({
      success: true,
      message: "Cập nhật thành công!",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Lỗi update:", err);
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sản phẩm!" });
    res.json({ success: true, message: "Đã xóa sản phẩm!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server!" });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    // Lấy một số sản phẩm bất kỳ để kiểm tra kết nối DB
    const anyProducts = await Product.find().limit(3);

    // Nếu không có query, trả về vài sản phẩm
    if (!req.query.q) {
      return res.json({
        success: true,
        message: "Không có từ khóa tìm kiếm",
        products: anyProducts,
      });
    }
    // Tìm kiếm đơn giản
    const results = await Product.find({
      name: { $regex: req.query.q, $options: "i" },
    });
    return res.json({
      success: true,
      count: results.length,
      query: req.query.q,
      products: results,
    });
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi tìm kiếm",
      error: err.message,
    });
  }
};
