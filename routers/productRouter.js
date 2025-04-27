const express = require("express");
const productController = require("../controller/productController");
const upload = require("../middleware/multer-config"); // Import multer middleware

const router = express.Router();

router.get("/", productController.getProducts); // Lấy danh sách sản phẩm
router.get("/search", productController.searchProducts);
router.get("/category/:id", productController.getProductsByCategory);
router.get("/:id", productController.getProductById); // Lấy sản phẩm theo ID
router.post("/", upload.array("images", 5), productController.createProduct); // Thêm sản phẩm
router.put("/:id", upload.array("images", 5), productController.updateProduct); // Cập nhật sản phẩm
router.delete("/:id", productController.deleteProduct); // Xóa sản phẩm

module.exports = router;
