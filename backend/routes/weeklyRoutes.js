import { Router } from 'express';
import {
  getWeeklyGoals,
  createWeeklyGoal,
  toggleWeeklyGoalDay,
  deleteWeeklyGoal
} from '../controllers/weeklyController.js';

const router = Router();

router.get('/', getWeeklyGoals);
router.post('/', createWeeklyGoal);
router.patch('/:id/toggle-day', toggleWeeklyGoalDay);
router.delete('/:id', deleteWeeklyGoal);

export default router;
