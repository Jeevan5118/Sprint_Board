import { Router } from 'express';
import authRoutes from './authRoutes.js';
import teamRoutes from './teamRoutes.js';
import projectRoutes from './projectRoutes.js';
import sprintRoutes from './sprintRoutes.js';
import taskRoutes from './taskRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import userRoutes from './userRoutes.js';
import reportRoutes from './reportRoutes.js';
import { protect } from '../middlewares/authMiddleware.js';
import { getAllProjects } from '../controllers/projectController.js';

const router = Router();

// API Health Check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Sprint Board API is running' });
});

router.use('/auth', authRoutes);
router.use('/teams', teamRoutes);
router.use('/teams/:teamId/projects', projectRoutes);
router.use('/teams/:teamId/sprints', sprintRoutes);
router.use('/teams/:teamId/tasks', taskRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/reports', protect, reportRoutes);

// Global cross-team project listing (used by the Projects page)
router.get('/projects', protect, getAllProjects);

export default router;

