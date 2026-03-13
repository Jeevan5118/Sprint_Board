import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/dashboardController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(protect);
router.get('/analytics', getDashboardAnalytics);

export default router;
