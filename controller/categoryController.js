const Category = require("../models/categorySchema");

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Tên danh mục là bắt buộc!" });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();

    res.status(201).json({
      success: true,
      message: "Danh mục đã được tạo!",
      category: newCategory,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi server!", error: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({ success: true, categories });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi server!", error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy danh mục!" });
    }

    res.json({
      success: true,
      message: "Danh mục đã được cập nhật!",
      category: updatedCategory,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi server!", error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy danh mục!" });
    }

    res.json({
      success: true,
      message: "Danh mục đã được xóa!",
      category: deletedCategory,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Lỗi server!", error: err.message });
  }
};
