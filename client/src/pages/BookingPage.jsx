import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { SiteHeader } from '../components/SiteHeader.jsx';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildCalendar(month) {
  const start = dayjs(`${month}-01`);
  const leadingBlank = Array(start.day()).fill(null);
  const days = Array.from({ length: start.daysInMonth() }, (_, index) => start.date(index + 1));
  return [...leadingBlank, ...days];
}

export function BookingPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const rescheduleToken = new URLSearchParams(location.search).get('reschedule');

  const [eventType, setEventType] = useState(null);
  const [meetingToReschedule, setMeetingToReschedule] = useState(null);
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [slots, setSlots] = useState([]);
  const [selectedStart, setSelectedStart] = useState('');
  const [form, setForm] = useState({ name: '', email: '', answers: {} });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const calendarDays = useMemo(() => buildCalendar(month), [month]);

  useEffect(() => {
    api
      .get(`/meetings/public/event-types/${slug}`)
      .then((data) => setEventType(data))
      .catch((err) => setError(err.message));
  }, [slug]);

  useEffect(() => {
    if (!rescheduleToken) {
      setMeetingToReschedule(null);
      return;
    }

    api
      .get(`/meetings/public/reschedule/${rescheduleToken}`)
      .then((data) => {
        setMeetingToReschedule(data);
        setForm({ name: data.inviteeName, email: data.inviteeEmail, answers: data.inviteeAnswers || {} });
      })
      .catch((err) => setError(err.message));
  }, [rescheduleToken]);

  useEffect(() => {
    const ignoreParam = meetingToReschedule?.id ? `&ignoreMeetingId=${meetingToReschedule.id}` : '';
    api
      .get(`/availability/public/${slug}/month?month=${month}${ignoreParam}`)
      .then((data) => {
        setAvailableDates(data.dates);
        if (!data.dates.includes(selectedDate)) {
          setSelectedDate(data.dates[0] || dayjs(`${month}-01`).format('YYYY-MM-DD'));
        }
      })
      .catch((err) => setError(err.message));
  }, [slug, month, meetingToReschedule?.id]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const ignoreParam = meetingToReschedule?.id ? `&ignoreMeetingId=${meetingToReschedule.id}` : '';
    api
      .get(`/availability/public/${slug}/slots?date=${selectedDate}${ignoreParam}`)
      .then((data) => {
        setSlots(data.slots);
        if (!data.slots.find((slot) => slot.start === selectedStart)) {
          setSelectedStart(data.slots[0]?.start || '');
        }
      })
      .catch((err) => setError(err.message));
  }, [slug, selectedDate, meetingToReschedule?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedStart) {
      setError('Please choose a time slot.');
      return;
    }

    setSaving(true);
    try {
      let booking;
      const payload = {
        ...form,
        start: selectedStart,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      if (rescheduleToken) {
        booking = await api.post(`/meetings/public/reschedule/${rescheduleToken}`, payload);
      } else {
        booking = await api.post(`/meetings/public/event-types/${slug}/book`, payload);
      }

      navigate(`/book/${slug}/confirmed/${booking.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedSlotLabel = slots.find((slot) => slot.start === selectedStart)?.label;

  return (
    <div className="public-page calendly-page">
      <SiteHeader compact ctaLabel="Open Dashboard" ctaTo="/events" showSecondary={false} />

      <div className="public-hero booking-hero">
        <div>
          <p className="eyebrow">{rescheduleToken ? 'Reschedule meeting' : 'Book with Syncora'}</p>
          <h1>{rescheduleToken ? 'Choose a new time' : 'Select a time and confirm your meeting'}</h1>
          <p>
            A structured three-panel booking layout with event details, monthly availability, slot selection, and a
            focused invitee form inspired by Calendly's scheduling experience.
          </p>
        </div>
        <div className="public-chip-row">
          <span className="tag">Responsive</span>
          <span className="tag">Buffer-aware</span>
          <span className="tag">Double-booking safe</span>
        </div>
      </div>

      {error ? <div className="banner error narrow">{error}</div> : null}

      <div className="booking-layout booking-layout-refined">
        <section className="booking-summary-panel">
          <div className="summary-brand">
            <span className="brand-mark small">S</span>
            <span>Syncora</span>
          </div>
          <p className="eyebrow">{rescheduleToken ? 'Reschedule' : 'Event details'}</p>
          <h2>{eventType?.name || 'Loading...'}</h2>
          <p className="booking-summary-copy">{eventType?.description}</p>

          <div className="booking-summary-meta">
            <div>
              <strong>{eventType?.durationMinutes || '--'} min</strong>
              <span>Length</span>
            </div>
            <div>
              <strong>{eventType?.location || '--'}</strong>
              <span>Location</span>
            </div>
            <div>
              <strong>{eventType?.scheduleTimezone || eventType?.timezone || '--'}</strong>
              <span>Timezone</span>
            </div>
          </div>

          {selectedDate ? (
            <div className="selection-preview">
              <p className="eyebrow">Selected</p>
              <h4>{dayjs(selectedDate).format('dddd, MMMM D')}</h4>
              <p>{selectedSlotLabel ? `${selectedSlotLabel} - ${eventType?.scheduleTimezone || 'Local time'}` : 'Choose a time slot'}</p>
            </div>
          ) : null}
        </section>

        <section className="calendar-panel">
          <div className="calendar-header">
            <button className="ghost-button" onClick={() => setMonth(dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM'))}>
              Previous
            </button>
            <h3>{dayjs(`${month}-01`).format('MMMM YYYY')}</h3>
            <button className="ghost-button" onClick={() => setMonth(dayjs(`${month}-01`).add(1, 'month').format('YYYY-MM'))}>
              Next
            </button>
          </div>

          <div className="calendar-grid">
            {weekdays.map((day) => (
              <span className="calendar-label" key={day}>
                {day}
              </span>
            ))}
            {calendarDays.map((dateValue, index) =>
              dateValue ? (
                <button
                  key={dateValue.format('YYYY-MM-DD')}
                  className={`day-cell ${selectedDate === dateValue.format('YYYY-MM-DD') ? 'selected' : ''}`}
                  disabled={!availableDates.includes(dateValue.format('YYYY-MM-DD'))}
                  onClick={() => setSelectedDate(dateValue.format('YYYY-MM-DD'))}
                >
                  {dateValue.date()}
                </button>
              ) : (
                <span className="day-cell blank" key={`blank-${index}`} />
              )
            )}
          </div>

          <div className="slots-panel embedded">
            <h3>{selectedDate ? dayjs(selectedDate).format('dddd, MMMM D') : 'Select a date'}</h3>
            <div className="slot-list">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  className={`slot-button ${selectedStart === slot.start ? 'selected' : ''}`}
                  onClick={() => setSelectedStart(slot.start)}
                >
                  {slot.label}
                </button>
              ))}
              {!slots.length ? <p className="muted-text">No slots available for this date.</p> : null}
            </div>
          </div>
        </section>

        <section className="booking-form-panel">
          <div className="form-panel-header">
            <p className="eyebrow">{rescheduleToken ? 'Step 3' : 'Step 3'}</p>
            <h3>{rescheduleToken ? 'Update booking details' : 'Enter details'}</h3>
            <p className="muted-text">This panel becomes your confirmation step after time selection.</p>
          </div>

          <form className="form-grid public-form-grid" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </label>

            {(eventType?.inviteeQuestions || []).map((question) => (
              <label className="full-width" key={question.label}>
                <span>{question.label}</span>
                {question.type === 'textarea' ? (
                  <textarea
                    rows="3"
                    value={form.answers[question.label] || ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        answers: { ...current.answers, [question.label]: event.target.value }
                      }))
                    }
                    required={question.required}
                  />
                ) : (
                  <input
                    value={form.answers[question.label] || ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        answers: { ...current.answers, [question.label]: event.target.value }
                      }))
                    }
                    required={question.required}
                  />
                )}
              </label>
            ))}

            <button className="primary-button full-width" type="submit" disabled={saving || !selectedStart}>
              {saving ? 'Saving...' : rescheduleToken ? 'Reschedule meeting' : 'Confirm booking'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
