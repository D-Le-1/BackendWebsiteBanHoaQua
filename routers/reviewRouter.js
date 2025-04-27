const express = require("express");
const router = express.Router();
const reviewController = require("../controller/reviewController");

router.get("/:productId", reviewController.getProductReviews);
router.post("/", reviewController.createReview);
router.delete("/:reviewId", reviewController.deleteReview);
router.post("/:reviewId/like", reviewController.likeReview);

module.exports = router;
