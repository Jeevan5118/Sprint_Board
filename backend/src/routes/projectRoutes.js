import { Router } from 'express';
import { getProjectsByTeam, createProject, deleteProject, getProjectById } from '../controllers/projectController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireTeamMember } from '../middlewares/teamScopeMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireTeamMember);

router.get('/', getProjectsByTeam);
router.get('/:id', getProjectById);
router.post('/', requireRole(['Admin', 'Team Lead']), createProject);
router.delete('/:id', requireRole(['Admin', 'Team Lead']), deleteProject);

export default router;
