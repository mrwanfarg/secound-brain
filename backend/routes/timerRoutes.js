import { Router } from 'express';
import {
  getSessions,
  logSession,
  deleteSession
} from '../controllers/timerController.js';

const router = Router();

router.get('/', getSessions);
router.post('/', logSession);
router.delete('/:id', deleteSession);

export default router;
