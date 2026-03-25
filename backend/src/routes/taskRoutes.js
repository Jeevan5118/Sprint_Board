import { Router } from 'express';
import { getTasks, getKanbanTasks, createTask, updateTask, updateTaskStatus, deleteTask, getTaskHistory } from '../controllers/taskController.js';
import { addComment, getComments } from '../controllers/commentController.js';
import { addTimeLog, getTimeLogs } from '../controllers/timeLogController.js';
import { toggleAttachment, getAttachments } from '../controllers/uploadController.js';
import { addTaskLink, getTaskLinks, deleteTaskLink } from '../controllers/taskLinkController.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';
import { requireTeamMember } from '../middlewares/teamScopeMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';

const router = Router({ mergeParams: true });

router.use(protect);
router.use(requireTeamMember);

router.get('/', getTasks);
router.get('/kanban', getKanbanTasks);
router.get('/:id/history', getTaskHistory);
router.post('/', requireRole(['Admin', 'Team Lead']), createTask);

router.put('/:id', updateTask);
router.put('/:id/status', updateTaskStatus);
router.delete('/:id', requireRole(['Admin', 'Team Lead']), deleteTask);

// Sub-resources
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);

router.get('/:id/time-logs', getTimeLogs);
router.post('/:id/time-logs', addTimeLog);

router.get('/:id/attachments', getAttachments);
router.post('/:id/attachments', upload.single('file'), toggleAttachment);

router.get('/:id/links', getTaskLinks);
router.post('/:id/links', addTaskLink);
router.delete('/:id/links/:linkId', deleteTaskLink);

export default router;
