import { Router } from 'express';
import {
  getWeeklyGoals,
  createWeeklyGoal,
  toggleWeeklyGoalDay,
  toggleHabitToday,
  completeHabitToday,
  deleteWeeklyGoal
} from '../controllers/weeklyController.js';

const router = Router();

router.get('/', getWeeklyGoals);
router.post('/', createWeeklyGoal);
router.patch('/:id/toggle-day', toggleWeeklyGoalDay);
router.patch('/:id/toggle-today', toggleHabitToday);
router.post('/:id/complete-today', completeHabitToday);
router.delete('/:id', deleteWeeklyGoal);

export default router;

