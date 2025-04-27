const express = require("express");
const dashboardController = require("../controller/dashboardController");

const router = express.Router();

router.get("/stats", dashboardController.getDashboardStats);
router.get("/products", dashboardController.getProductPerformance);

module.exports = router;
