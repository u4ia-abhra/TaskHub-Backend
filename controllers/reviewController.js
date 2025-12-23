const Review = require("../models/review");
const User = require("../models/user");
const { checkReviewEligibility } = require("../utils/reviewEligibility");

async function createReview(req, res) {
  try {
    const reviewerId = req.user.id;
    const { taskId, rating, comment } = req.body;

    if (!taskId || !rating) {
      return res.status(400).json({
        message: "Task ID and rating are required.",
      });
    }

    const eligibility = await checkReviewEligibility(taskId, reviewerId);
    if (eligibility.error) {
      return res.status(403).json({ message: eligibility.error });
    }

    const review = await Review.create({
      task: taskId,
      reviewer: reviewerId,
      reviewee: eligibility.reviewee,
      reviewerRole: eligibility.reviewerRole,
      rating,
      comment,
    });

    await updateUserRating(eligibility.reviewee);

    res.status(201).json({
      message: "Review submitted successfully.",
      review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this task.",
      });
    }

    console.error("Create review error:", error);
    res.status(500).json({ message: "Server error." });
  }
}

async function editReview(req, res) {
  try {
    const reviewerId = req.user.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    if (review.reviewer.toString() !== reviewerId) {
      return res.status(403).json({ message: "Not allowed." });
    }

    const hoursPassed =
      (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursPassed > 24) {
      return res.status(403).json({
        message: "Review editing window has expired.",
      });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();
    await updateUserRating(review.reviewee);

    res.status(200).json({
      message: "Review updated successfully.",
      review,
    });
  } catch (error) {
    console.error("Edit review error:", error);
    res.status(500).json({ message: "Server error." });
  }
}

async function getUserReviews(req, res) {
  try {
    const { id } = req.params;

    const reviews = await Review.find({ reviewee: id })
      .populate("reviewer", "name image")
      .populate("task", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({ reviews });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    res.status(500).json({ message: "Server error." });
  }
}

async function updateUserRating(userId) {
  const stats = await Review.aggregate([
    { $match: { reviewee: userId } },
    {
      $group: {
        _id: "$reviewee",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const data = stats[0] || { avgRating: 0, totalReviews: 0 };

  await User.findByIdAndUpdate(userId, {
    avgRating: Number(data.avgRating.toFixed(2)),
    totalReviews: data.totalReviews,
  });
}

module.exports = {
  createReview,
  editReview,
  getUserReviews,
};