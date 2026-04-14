import { Router } from 'express';
import { cancelMeetingById, getEventTypePublic, getMeetings, getPublicBookingById, getPublicEventTypes, getRescheduleBooking, postBooking, postCancelBookingByToken, postRescheduleBooking } from '../controllers/meetingController.js';

const router = Router();

router.get('/', getMeetings);
router.post('/:id/cancel', cancelMeetingById);

router.get('/public/event-types/:slug', getEventTypePublic);
router.get('/public/event-types', getPublicEventTypes);
router.post('/public/event-types/:slug/book', postBooking);
router.get('/public/booking/:id', getPublicBookingById);
router.get('/public/reschedule/:token', getRescheduleBooking);
router.post('/public/reschedule/:token', postRescheduleBooking);
router.post('/public/reschedule/:token/cancel', postCancelBookingByToken);

export default router;
