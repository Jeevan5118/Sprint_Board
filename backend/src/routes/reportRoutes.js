import { Router } from 'express';
import multer from 'multer';
import { submitReport, uploadWork, getUploads, getReportAudit } from '../controllers/reportController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = Router();
const safeSingle = (field) => (req, res, next) => {
    upload.single(field)(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File too large. Maximum allowed size is 50MB.' });
            }
            return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err.message || 'Upload failed' });
    });
};

// Submit endpoints
router.post('/submit', protect, safeSingle('report'), submitReport);
router.post('/work', protect, safeSingle('work'), uploadWork);

// Retrieval endpoints
router.get('/', protect, getUploads);
router.get('/audit', protect, getReportAudit);

export default router;
