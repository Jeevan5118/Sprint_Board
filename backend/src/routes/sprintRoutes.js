import { Router } from 'express';
import { getSprintsByTeam, createSprint, startSprint, completeSprint } from '../controllers/sprintController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireTeamMember } from '../middlewares/teamScopeMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireTeamMember);

router.get('/', getSprintsByTeam);
router.post('/', requireRole(['Admin', 'Team Lead']), createSprint);

// The paths below will look like /teams/:teamId/sprints/:id/start
router.put('/:id/start', requireRole(['Admin', 'Team Lead']), startSprint);
router.put('/:id/complete', requireRole(['Admin', 'Team Lead']), completeSprint);

export default router;
