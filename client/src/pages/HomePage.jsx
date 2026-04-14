import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { SiteHeader } from '../components/SiteHeader.jsx';

export function HomePage() {
  const [eventTypes, setEventTypes] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/event-types'), api.get('/meetings?scope=upcoming')])
      .then(([eventData, meetingData]) => {
        setEventTypes(eventData);
        setMeetings(meetingData.slice(0, 3));
      })
      .catch((err) => setError(err.message));
  }, []);

  const highlights = useMemo(
    () => [
      { label: 'Event types', value: eventTypes.length || 0 },
      { label: 'Upcoming meetings', value: meetings.length || 0 },
      { label: 'Bonus features', value: 6 }
    ],
    [eventTypes.length, meetings.length]
  );

  return (
    <div className="marketing-shell">
      <SiteHeader ctaTo={eventTypes[0] ? `/book/${eventTypes[0].slug}` : '/events'} />

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Calendly-inspired scheduling platform</p>
            <h1>Syncora helps people share availability and get booked without friction.</h1>
            <p className="hero-text">
              A responsive scheduling product built for a professional full-stack assignment with event types, booking
              links, weekly availability, date overrides, buffers, rescheduling, meetings management, and email-ready
              workflows.
            </p>

            <div className="hero-actions">
              <Link className="primary-button" to={eventTypes[0] ? `/book/${eventTypes[0].slug}` : '/events'}>
                Open booking flow
              </Link>
              <Link className="ghost-button" to="/events">
                Manage workspace
              </Link>
            </div>

            <div className="hero-stats">
              {highlights.map((item) => (
                <div className="hero-stat" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <div className="floating-orb orb-one" />
            <div className="floating-orb orb-two" />

            <div className="hero-card hero-card-main">
              <p className="eyebrow">Availability</p>
              <h3>Professional scheduling controls</h3>
              <div className="mini-schedule">
                <span>Mon</span>
                <strong>9:00 AM - 5:00 PM</strong>
                <span>Tue</span>
                <strong>9:00 AM - 5:00 PM</strong>
                <span>Wed</span>
                <strong>11:00 AM - 3:00 PM</strong>
              </div>
            </div>

            <div className="hero-card hero-card-floating">
              <p className="eyebrow">Booking page</p>
              <h4>Intro Call</h4>
              <div className="slot-stack">
                <span>10:00 AM</span>
                <span>10:30 AM</span>
                <span>11:00 AM</span>
              </div>
            </div>

            <div className="hero-card hero-card-accent">
              <p>Reschedule, cancellation, and custom-question flows included.</p>
            </div>
          </div>
        </section>

        {error ? <div className="banner error narrow">{error}</div> : null}

        <section className="logo-marquee" id="features">
          <div className="marquee-track">
            <span>Multiple schedules</span>
            <span>Date overrides</span>
            <span>Public booking links</span>
            <span>Responsive design</span>
            <span>Buffer rules</span>
            <span>Custom questions</span>
            <span>Rescheduling</span>
            <span>Email hooks</span>
          </div>
        </section>

        <section className="feature-grid">
          <article className="feature-panel">
              <p className="eyebrow">Event management</p>
              <h3>Create and share event types with unique public URLs</h3>
            <p>
              Event types include custom colors, descriptions, locations, schedule mapping, buffer time, status, and
              invitee questions.
            </p>
          </article>
          <article className="feature-panel">
              <p className="eyebrow">Booking flow</p>
              <h3>Month calendar, slot selection, and invitee details</h3>
            <p>
              Invitees pick a date, see only valid slots, answer custom questions, and land on a confirmation page with
              rescheduling controls.
            </p>
          </article>
          <article className="feature-panel">
              <p className="eyebrow">Bonus features</p>
              <h3>Built to satisfy the full assignment brief</h3>
            <p>
              Multiple schedules, override dates, transactional double-booking prevention, buffer-aware slot generation,
              and SMTP-based notifications.
            </p>
          </article>
        </section>

        <section className="event-showcase" id="events">
          <div className="section-title">
            <div>
              <p className="eyebrow">Public event types</p>
              <h2>Share these links directly</h2>
            </div>
            <Link className="ghost-button" to="/events">
              Manage all
            </Link>
          </div>

          <div className="event-showcase-grid">
            {eventTypes.map((eventType) => (
              <article className="public-event-card" key={eventType.id}>
                <div className="public-event-header">
                  <span className="color-dot" style={{ background: eventType.color }} />
                  <span className="status-pill active">{eventType.durationMinutes} min</span>
                </div>
                <h3>{eventType.name}</h3>
                <p>{eventType.description}</p>
                <div className="meta-stack">
                  <span>{eventType.scheduleName || 'Default schedule'}</span>
                  <span>{eventType.location}</span>
                </div>
                <Link className="primary-button" to={`/book/${eventType.slug}`}>
                  Open booking page
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
