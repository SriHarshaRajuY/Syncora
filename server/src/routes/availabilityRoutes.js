import { Router } from 'express';
import { getSchedules, postSchedule, putSchedule, removeSchedule, getMonthAvailability, getDateSlots } from '../controllers/availabilityController.js';

const router = Router();

router.get('/schedules', getSchedules);
router.post('/schedules', postSchedule);
router.put('/schedules/:id', putSchedule);
router.delete('/schedules/:id', removeSchedule);

router.get('/public/:slug/month', getMonthAvailability);
router.get('/public/:slug/slots', getDateSlots);

export default router;

