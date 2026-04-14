import { asyncHandler } from '../utils/errors.js';
import { cancelMeeting, cancelMeetingByToken, createBooking, getMeetingByToken, getMeetingPublicById, listMeetings, rescheduleMeetingByToken } from '../services/meetingService.js';
import { getEventTypeBySlug, listPublicEventTypes } from '../services/eventTypeService.js';

export const getMeetings = asyncHandler(async (req, res) => {
  res.json(await listMeetings(req.query.scope));
});

export const postBooking = asyncHandler(async (req, res) => {
  const booking = await createBooking({ slug: req.params.slug, payload: req.body });
  res.status(201).json(booking);
});

export const getEventTypePublic = asyncHandler(async (req, res) => {
  const eventType = await getEventTypeBySlug(req.params.slug);
  res.json(eventType);
});

export const getPublicEventTypes = asyncHandler(async (_req, res) => {
  res.json(await listPublicEventTypes());
});

export const cancelMeetingById = asyncHandler(async (req, res) => {
  const booking = await cancelMeeting(Number(req.params.id), req.body.reason);
  res.json(booking);
});

export const getRescheduleBooking = asyncHandler(async (req, res) => {
  res.json(await getMeetingByToken(req.params.token));
});

export const postRescheduleBooking = asyncHandler(async (req, res) => {
  res.json(await rescheduleMeetingByToken(req.params.token, req.body));
});

export const getPublicBookingById = asyncHandler(async (req, res) => {
  res.json(await getMeetingPublicById(Number(req.params.id)));
});

export const postCancelBookingByToken = asyncHandler(async (req, res) => {
  res.json(await cancelMeetingByToken(req.params.token, req.body.reason));
});
