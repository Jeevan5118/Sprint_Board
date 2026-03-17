import { Router } from 'express';
import { submitReport, uploadWork, getUploads, getReportAudit } from '../controllers/reportController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = Router();

// Submit endpoints
router.post('/submit', protect, upload.single('report'), submitReport);
router.post('/work', protect, upload.single('work'), uploadWork);

// Retrieval endpoints
router.get('/', protect, getUploads);
router.get('/audit', protect, getReportAudit);

export default router;
