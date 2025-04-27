const express = require("express");
const orderController = require("../controller/orderController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create", authMiddleware, orderController.createOrder);
router.get("/", authMiddleware, orderController.getOrder);
router.get("/email", authMiddleware, orderController.getOrderbyEmail);
router.patch("/:id/status", orderController.updateOrderStatus);
router.get("/:id", authMiddleware, orderController.getOrderDetail);

module.exports = router;
