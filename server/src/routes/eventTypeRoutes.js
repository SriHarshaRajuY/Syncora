import { Router } from 'express';
import { getEventTypes, postEventType, putEventType, removeEventType } from '../controllers/eventTypeController.js';

const router = Router();

router.get('/', getEventTypes);
router.post('/', postEventType);
router.put('/:id', putEventType);
router.delete('/:id', removeEventType);

export default router;

