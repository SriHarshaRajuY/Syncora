import { Router } from 'express';
import {
  getSchedules,
  postSchedule,
  putSchedule,
  removeSchedule,
  getMonthAvailability,
  getDateSlots,
  getAvailabilitySettings,
  putAvailabilitySettings
} from '../controllers/availabilityController.js';

const router = Router();

router.get('/schedules', getSchedules);
router.post('/schedules', postSchedule);
router.put('/schedules/:id', putSchedule);
router.delete('/schedules/:id', removeSchedule);
router.get('/settings', getAvailabilitySettings);
router.put('/settings', putAvailabilitySettings);

router.get('/public/:slug/month', getMonthAvailability);
router.get('/public/:slug/slots', getDateSlots);

export default router;
