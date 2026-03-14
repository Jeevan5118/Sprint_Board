import express from 'express';
import { serveAttachment, serveUpload } from '../controllers/fileController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Serve task attachments
router.get('/attachments/:id', protect, serveAttachment);

// Serve user uploads (Reports/Work)
router.get('/uploads/:id', protect, serveUpload);

export default router;
