import express from 'express';
import { submitReview } from '../controllers/reveiwController.js';

const router = express.Router();

router.post('/submitReview', submitReview);

export default router;
