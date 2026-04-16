import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { EventTypeForm } from '../components/EventTypeForm.jsx';

export function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [eventData, scheduleData] = await Promise.all([api.get('/event-types'), api.get('/availability/schedules')]);
      setEventTypes(eventData);
      setSchedules(scheduleData);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (payload) => {
    try {
      if (selectedEvent?.id) {
        await api.put(`/event-types/${selectedEvent.id}`, payload);
      } else {
        await api.post('/event-types', payload);
      }
      setSelectedEvent(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event type?')) {
      return;
    }

    try {
      await api.delete(`/event-types/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const copyLink = async (slug) => {
    const url = `${window.location.origin}/book/${slug}`;
    await navigator.clipboard.writeText(url);
    window.alert('Public booking link copied.');
  };

  const filteredEventTypes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return eventTypes;
    }

    return eventTypes.filter((eventType) =>
      [eventType.name, eventType.slug, eventType.description, eventType.location]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [eventTypes, search]);

  return (
    <AdminShell
      title="Scheduling"
      subtitle="Create and manage event types, share booking links, and keep every public experience aligned with your availability rules."
      quickActionLabel="Create"
      onQuickAction={() => setSelectedEvent({})}
      actions={
        <button className="primary-button" onClick={() => setSelectedEvent({})}>
          + Create
        </button>
      }
      drawer={
        selectedEvent ? (
          <EventTypeForm
            initialValue={selectedEvent.id ? selectedEvent : null}
            schedules={schedules}
            onSubmit={handleSave}
            onCancel={() => setSelectedEvent(null)}
          />
        ) : null
      }
    >
      {error ? <div className="banner error">{error}</div> : null}

      <section className="cal-toolbar">
        <label className="cal-search">
          <span className="cal-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search event types"
          />
        </label>
      </section>

      <section className="cal-owner-row">
        <div className="cal-owner-avatar">S</div>
        <strong>SYNCORA WORKSPACE</strong>
      </section>

      <section className="event-type-list">
        {filteredEventTypes.map((eventType) => (
          <article className="event-type-row" key={eventType.id}>
            <div className="event-type-accent" style={{ background: eventType.color }} />

            <div className="event-type-main">
              <div className="event-type-row-top">
                <div>
                  <h3>{eventType.name}</h3>
                  <div className="event-type-details">
                    <span>{eventType.durationMinutes} min</span>
                    <span>{eventType.location}</span>
                    <span>{eventType.isActive ? 'One-on-one' : 'Inactive'}</span>
                  </div>
                </div>

                <div className="event-type-row-actions">
                  <button className="secondary-button" onClick={() => copyLink(eventType.slug)}>
                    Copy link
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => window.location.assign(`/book/${eventType.slug}`)}
                  >
                    Open
                  </button>
                  <button className="ghost-button" onClick={() => setSelectedEvent(eventType)}>
                    Edit
                  </button>
                  <button className="ghost-button danger" onClick={() => handleDelete(eventType.id)}>
                    Delete
                  </button>
                </div>
              </div>

              <p className="event-type-description">{eventType.description}</p>

              <div className="event-type-meta-row">
                <span>{eventType.scheduleName || 'Default schedule'}</span>
                <span>
                  Buffer {eventType.bufferBeforeMinutes}/{eventType.bufferAfterMinutes} min
                </span>
                <span>{eventType.slug}</span>
              </div>

              {(eventType.inviteeQuestions || []).length ? (
                <div className="question-tags">
                  {eventType.inviteeQuestions.map((question) => (
                    <span className="tag" key={question.label}>
                      {question.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}

        {!filteredEventTypes.length ? (
          <div className="empty-state-card">
            <h3>No event types found</h3>
            <p>Try a different search term or create a new event type to publish another booking link.</p>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
