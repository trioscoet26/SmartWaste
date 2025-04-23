// routes/reviewSentimentRoute.js
const express = require("express");
const router = express.Router();
const { analyzeReview } = require("../controllers/productReviewSen");

router.post("/analyze-review", analyzeReview);

export default router;