import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

const router = Router();

// All notification routes must be authenticated
router.use(protect);

router.get('/', notificationController.getNotifications);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

export default router;
