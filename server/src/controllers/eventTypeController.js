import { asyncHandler } from '../utils/errors.js';
import { createEventType, deleteEventType, listEventTypes, updateEventType } from '../services/eventTypeService.js';

export const getEventTypes = asyncHandler(async (_req, res) => {
  res.json(await listEventTypes());
});

export const postEventType = asyncHandler(async (req, res) => {
  const created = await createEventType(req.body);
  res.status(201).json(created);
});

export const putEventType = asyncHandler(async (req, res) => {
  const updated = await updateEventType(Number(req.params.id), req.body);
  res.json(updated);
});

export const removeEventType = asyncHandler(async (req, res) => {
  await deleteEventType(Number(req.params.id));
  res.status(204).send();
});

