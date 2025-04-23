// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const { submitReview } = require('../controllers/reviewController');

router.post('/submitReview', submitReview);

export default router;
