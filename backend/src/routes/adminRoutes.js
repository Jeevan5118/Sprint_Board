import { Router } from 'express';
import { importData, createUser, getUsers, updateUserPassword, deleteUser } from '../controllers/adminController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.use(protect);
router.use(requireRole(['Admin']));

router.post('/import/csv', upload.single('file'), importData);
router.post('/users', createUser);
router.get('/users', getUsers);
router.put('/users/:userId/password', updateUserPassword);
router.delete('/users/:userId', deleteUser);

export default router;
