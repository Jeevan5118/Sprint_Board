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
import fileRoutes from './fileRoutes.js';
import { protect } from '../middlewares/authMiddleware.js';
import { getAllProjects } from '../controllers/projectController.js';
import db from '../config/db.js';

const router = Router();

// API Health Check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Sprint Board API is running' });
});

router.get('/health/db', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT NOW()');
        res.status(200).json({ status: 'ok', message: 'Database connected', time: rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Database connection failed', error: err.message });
    }
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
router.use('/files', fileRoutes);

// Global cross-team project listing (used by the Projects page)
router.get('/projects', protect, getAllProjects);

export default router;

