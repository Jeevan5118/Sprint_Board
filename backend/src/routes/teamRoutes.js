import { Router } from 'express';
import { getTeams, createTeam, getTeamById, getTeamMembers, addTeamMember, removeTeamMember, promoteToLead, updateUserProfile, getAllUsers } from '../controllers/teamController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import projectRoutes from './projectRoutes.js';
import sprintRoutes from './sprintRoutes.js';
import taskRoutes from './taskRoutes.js';

const router = Router();

router.use(protect);

router.get('/', getTeams);
router.post('/', requireRole(['Admin', 'Team Lead']), createTeam);

// Team-scoped routes
router.get('/:teamId', getTeamById);
router.get('/:teamId/members', getTeamMembers);
router.post('/:teamId/members', requireRole(['Admin', 'Team Lead']), addTeamMember);
router.delete('/:teamId/members/:userId', requireRole(['Admin', 'Team Lead']), removeTeamMember);
router.put('/:teamId/members/:userId/promote', requireRole(['Admin', 'Team Lead']), promoteToLead);

router.use('/:teamId/projects', projectRoutes);
router.use('/:teamId/sprints', sprintRoutes);
router.use('/:teamId/tasks', taskRoutes);

export default router;
