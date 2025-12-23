const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createReview,
  editReview,
  getUserReviews,
} = require("../controllers/reviewController");

router.post("/", authMiddleware, createReview);
router.put("/:id", authMiddleware, editReview);
router.get("/users/:id", getUserReviews);

module.exports = router;