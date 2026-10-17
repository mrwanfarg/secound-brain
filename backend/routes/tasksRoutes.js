import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTask,
  deleteTask,
  rescheduleOverdue
} from '../controllers/tasksController.js';

const router = Router();

router.get('/', getTasks);
router.post('/reschedule-overdue', rescheduleOverdue);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/toggle', toggleTask);
router.delete('/:id', deleteTask);

export default router;
