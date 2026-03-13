import { Router } from 'express';
import { submitReport, uploadWork } from '../controllers/reportController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.post('/submit', protect, upload.single('report'), submitReport);
router.post('/work', protect, upload.single('work'), uploadWork);

export default router;
