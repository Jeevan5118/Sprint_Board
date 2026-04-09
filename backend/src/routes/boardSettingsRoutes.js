import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { requireTeamMember } from '../middlewares/teamScopeMiddleware.js';
import {
    createQuickFilter,
    deleteQuickFilter,
    fetchBoardSettings,
    getQuickFilters,
    updateBoardColorRules,
    updateBoardColumns,
    updateBoardSettings,
    updateQuickFilter,
    updateTransitionRules
} from '../controllers/boardSettingsController.js';

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireTeamMember);

router.get('/', fetchBoardSettings);
router.put('/', requireRole(['Admin', 'Team Lead']), updateBoardSettings);
router.put('/columns', requireRole(['Admin', 'Team Lead']), updateBoardColumns);
router.put('/colors', requireRole(['Admin', 'Team Lead']), updateBoardColorRules);
router.get('/quick-filters', getQuickFilters);
router.post('/quick-filters', requireRole(['Admin', 'Team Lead']), createQuickFilter);
router.put('/quick-filters/:id', requireRole(['Admin', 'Team Lead']), updateQuickFilter);
router.delete('/quick-filters/:id', requireRole(['Admin', 'Team Lead']), deleteQuickFilter);
router.put('/transitions', requireRole(['Admin', 'Team Lead']), updateTransitionRules);

export default router;
