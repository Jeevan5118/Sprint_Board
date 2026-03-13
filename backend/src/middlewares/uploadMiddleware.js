import multer from 'multer';

// Use memory storage for Cloudinary upload stream
const storage = multer.memoryStorage();

// Accept ANY file type up to 50 MB
export const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

