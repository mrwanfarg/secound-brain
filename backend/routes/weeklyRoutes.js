import { Router } from 'express';
import {
  getWeeklyGoals,
  createWeeklyGoal,
  updateWeeklyGoal,
  toggleWeeklyGoalDay,
  toggleHabitToday,
  completeHabitToday,
  resetWeekRollover,
  deleteWeeklyGoal
} from '../controllers/weeklyController.js';

const router = Router();

router.get('/', getWeeklyGoals);
router.post('/', createWeeklyGoal);
router.put('/:id', updateWeeklyGoal);
router.patch('/:id/toggle-day', toggleWeeklyGoalDay);
router.patch('/:id/toggle-today', toggleHabitToday);
router.post('/:id/complete-today', completeHabitToday);
router.post('/reset-week', resetWeekRollover);
router.delete('/:id', deleteWeeklyGoal);

export default router;

