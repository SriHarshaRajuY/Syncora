import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { SiteHeader } from '../components/SiteHeader.jsx';

export function PublicEventTypesPage() {
  const [eventTypes, setEventTypes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/meetings/public/event-types')
      .then((data) => setEventTypes(data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="public-page">
      <SiteHeader compact ctaLabel="Open Dashboard" ctaTo="/events" showSecondary={false} />

      <section className="public-hero">
        <div>
          <p className="eyebrow">Choose an event</p>
          <h1>Pick the meeting type that fits your goal.</h1>
          <p>
            Browse all active public event types, compare duration and context, then continue into the scheduling flow.
          </p>
        </div>
      </section>

      {error ? <div className="banner error narrow">{error}</div> : null}

      <section className="event-showcase public-directory">
        <div className="section-title">
          <div>
            <p className="eyebrow">Available meetings</p>
            <h2>All active booking links</h2>
          </div>
        </div>

        <div className="event-showcase-grid">
          {eventTypes.map((eventType) => (
            <article className="public-event-card public-directory-card" key={eventType.id}>
              <div className="public-event-header">
                <div className="event-card-title">
                  <span className="color-dot" style={{ background: eventType.color }} />
                  <span className="event-type-badge">One-on-one</span>
                </div>
                <span className="status-pill active">{eventType.durationMinutes} min</span>
              </div>

              <h3>{eventType.name}</h3>
              <p>{eventType.description}</p>

              <div className="meta-stack">
                <span>{eventType.scheduleName || 'Default schedule'}</span>
                <span>{eventType.location}</span>
                <span>{eventType.scheduleTimezone || 'Timezone set'}</span>
              </div>

              <div className="question-tags">
                {(eventType.inviteeQuestions || []).map((question) => (
                  <span className="tag" key={question.label}>
                    {question.label}
                  </span>
                ))}
              </div>

              <div className="card-actions">
                <Link className="primary-button" to={`/book/${eventType.slug}`}>
                  Continue
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

