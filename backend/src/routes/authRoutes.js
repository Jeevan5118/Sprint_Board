import { Router } from 'express';
import { login, changePassword, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);

export default router;
