import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { SiteHeader } from '../components/SiteHeader.jsx';

export function HomePage() {
  const [eventTypes, setEventTypes] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [eventData, meetingData] = await Promise.all([
          api.get('/meetings/public/event-types'),
          api.get('/meetings?scope=upcoming')
        ]);

        setEventTypes(eventData);
        setMeetings(meetingData.slice(0, 3));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      <SiteHeader ctaTo="/book" />
      {error ? <div className="banner error narrow">{error}</div> : null}

      {loading ? (
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading scheduling workspace...</p>
        </div>
      ) : (
        <main>
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">Calendly-inspired scheduling platform</p>
              <h1>Syncora helps teams publish availability and book meetings with confidence.</h1>
              <p className="hero-text">
                A polished scheduling product with event types, public booking links, weekly availability, date
                overrides, buffers, rescheduling, meetings management, and deployment-ready full-stack architecture.
              </p>

              <div className="hero-actions">
                <Link className="primary-button" to="/book">
                  Find a time
                </Link>
                <Link className="ghost-button" to="/events">
                  Open workspace
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
                <h4>{eventTypes[0]?.name || 'Booking Flow'}</h4>
                <div className="slot-stack">
                  <span>10:00 AM</span>
                  <span>10:30 AM</span>
                  <span>11:00 AM</span>
                </div>
              </div>

              <div className="hero-card hero-card-accent">
                <p>Reschedule, cancellation, and custom-question flows are included end to end.</p>
              </div>
            </div>
          </section>

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
              <p>Event types include custom colors, descriptions, locations, schedule mapping, buffer time, status, and invitee questions.</p>
            </article>

            <article className="feature-panel">
              <p className="eyebrow">Booking flow</p>
              <h3>Month calendar, slot selection, and invitee details</h3>
              <p>Invitees pick a date, see only valid slots, answer custom questions, and confirm bookings without double booking.</p>
            </article>

            <article className="feature-panel">
              <p className="eyebrow">Bonus features</p>
              <h3>Production-style scheduling details included</h3>
              <p>Multiple schedules, overrides, buffer handling, email notifications, and rescheduling.</p>
            </article>
          </section>

          <section className="event-showcase">
            <div className="section-title">
              <h2>Public event types</h2>
            </div>

            <div className="event-showcase-grid">
              {eventTypes.map((eventType) => (
                <article className="public-event-card" key={eventType.id}>
                  <h3>{eventType.name}</h3>
                  <p>{eventType.description}</p>
                  <Link className="primary-button" to={`/book/${eventType.slug}`}>
                    Open booking page
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
