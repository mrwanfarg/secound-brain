import { Router } from 'express';
import {
  getDashboardStats,
  getIntention,
  setIntention,
  getSettings,
  updateSettings,
  exportBackup,
  importBackup,
  resetSeed
} from '../controllers/statsController.js';

const router = Router();

router.get('/overview', getDashboardStats);
router.get('/intention', getIntention);
router.post('/intention', setIntention);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/backup/export', exportBackup);
router.post('/backup/import', importBackup);
router.post('/seed/reset', resetSeed);

export default router;
