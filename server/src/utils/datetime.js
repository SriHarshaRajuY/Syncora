import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DAY_INDEX_MAP = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

export const makeDateTime = (date, time) => dayjs(`${date}T${time}`);

export const makeDateTimeInTimezone = (date, time, timezoneName) => dayjs.tz(`${date}T${time}`, timezoneName);

export const formatDate = (value, timezoneName) =>
  timezoneName ? dayjs(value).tz(timezoneName).format('YYYY-MM-DD') : dayjs(value).format('YYYY-MM-DD');

export const formatDateTime = (value) => dayjs(value).utc().format('YYYY-MM-DD HH:mm:ss');

export const startOfMonth = (month, timezoneName) =>
  timezoneName ? dayjs.tz(`${month}-01T00:00:00`, timezoneName).startOf('month') : dayjs(`${month}-01`).startOf('month');

export const endOfMonth = (month, timezoneName) =>
  timezoneName ? dayjs.tz(`${month}-01T00:00:00`, timezoneName).endOf('month') : dayjs(`${month}-01`).endOf('month');

export const isSameOrAfterNow = (value) => dayjs(value).isAfter(dayjs().subtract(1, 'minute'));

export const addMinutes = (value, minutes) => dayjs(value).add(minutes, 'minute');

export const overlaps = (aStart, aEnd, bStart, bEnd) => aStart.isBefore(bEnd) && bStart.isBefore(aEnd);

export const parseDbDateTime = (value) => dayjs.utc(value);

export const getDayWindowInTimezone = (date, timezoneName) => {
  const start = makeDateTimeInTimezone(date, '00:00:00', timezoneName);
  return {
    start,
    end: start.add(1, 'day')
  };
};

export const generateRescheduleToken = () =>
  `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
