import { Router } from 'express';
import { getAllUsers, updateUserProfile } from '../controllers/teamController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';

const router = Router();
router.use(protect);

router.get('/', requireRole(['Admin']), getAllUsers);
router.put('/me', updateUserProfile);

export default router;
