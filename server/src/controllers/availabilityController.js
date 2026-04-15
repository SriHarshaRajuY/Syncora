import { asyncHandler } from '../utils/errors.js';
import {
  createSchedule,
  deleteSchedule,
  getAdvancedSettings,
  getAvailabilitySummary,
  getSlotsForDate,
  listSchedules,
  updateAdvancedSettings,
  updateSchedule
} from '../services/availabilityService.js';

export const getSchedules = asyncHandler(async (_req, res) => {
  res.json(await listSchedules());
});

export const postSchedule = asyncHandler(async (req, res) => {
  const created = await createSchedule(req.body);
  res.status(201).json(created);
});

export const putSchedule = asyncHandler(async (req, res) => {
  const updated = await updateSchedule(Number(req.params.id), req.body);
  res.json(updated);
});

export const removeSchedule = asyncHandler(async (req, res) => {
  await deleteSchedule(Number(req.params.id));
  res.status(204).send();
});

export const getAvailabilitySettings = asyncHandler(async (_req, res) => {
  res.json(await getAdvancedSettings());
});

export const putAvailabilitySettings = asyncHandler(async (req, res) => {
  res.json(await updateAdvancedSettings(req.body));
});

export const getMonthAvailability = asyncHandler(async (req, res) => {
  const data = await getAvailabilitySummary(req.params.slug, req.query.month, req.query.ignoreMeetingId);
  res.json(data);
});

export const getDateSlots = asyncHandler(async (req, res) => {
  const data = await getSlotsForDate(req.params.slug, req.query.date, req.query.ignoreMeetingId);
  res.json(data);
});
