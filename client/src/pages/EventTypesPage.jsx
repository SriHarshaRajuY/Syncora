import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { EventTypeForm } from '../components/EventTypeForm.jsx';
import { Modal } from '../components/Modal.jsx';

export function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
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

  return (
    <AdminShell
      title="Event Types"
      subtitle="Create polished booking pages with buffers, custom questions, and unique public links."
      actions={
        <button className="primary-button" onClick={() => setSelectedEvent({})}>
          New event type
        </button>
      }
    >
      {error ? <div className="banner error">{error}</div> : null}

      <section className="stats-grid enhanced">
        <article className="stat-card">
          <p className="eyebrow">Total event types</p>
          <h3>{eventTypes.length}</h3>
          <p className="muted-text">One-on-one pages ready to share instantly.</p>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Active links</p>
          <h3>{eventTypes.filter((item) => item.isActive).length}</h3>
          <p className="muted-text">Only active event types appear as live booking experiences.</p>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Schedules connected</p>
          <h3>{new Set(eventTypes.map((item) => item.scheduleId)).size}</h3>
          <p className="muted-text">Use different availability systems per event type.</p>
        </article>
      </section>

      <section className="section-title compact">
        <div>
          <p className="eyebrow">Booking links</p>
          <h3>Public event library</h3>
        </div>
      </section>

      <section className="card-grid event-library-grid">
        {eventTypes.map((eventType) => (
          <article className="event-card" key={eventType.id}>
            <div className="event-card-top">
              <div className="event-card-title">
                <span className="color-dot" style={{ background: eventType.color }} />
                <span className="event-type-badge">One-on-one</span>
              </div>
              <span className={`status-pill ${eventType.isActive ? 'active' : 'muted'}`}>
                {eventType.isActive ? 'Live' : 'Paused'}
              </span>
            </div>

            <h3>{eventType.name}</h3>
            <p>{eventType.description}</p>

            <div className="meta-stack">
              <span>{eventType.durationMinutes} min</span>
              <span>{eventType.scheduleName || 'Default schedule'}</span>
              <span>{eventType.location}</span>
              <span>
                Buffer {eventType.bufferBeforeMinutes}/{eventType.bufferAfterMinutes} min
              </span>
            </div>

            <div className="question-tags">
              {(eventType.inviteeQuestions || []).map((question) => (
                <span className="tag" key={question.label}>
                  {question.label}
                </span>
              ))}
            </div>

            <div className="card-actions">
              <button className="secondary-button" onClick={() => copyLink(eventType.slug)}>
                Copy link
              </button>
              <a className="ghost-button" href={`/book/${eventType.slug}`} target="_blank" rel="noreferrer">
                Open
              </a>
              <button className="ghost-button" onClick={() => setSelectedEvent(eventType)}>
                Edit
              </button>
              <button className="ghost-button danger" onClick={() => handleDelete(eventType.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>

      {selectedEvent ? (
        <Modal title={selectedEvent.id ? 'Edit event type' : 'Create event type'} onClose={() => setSelectedEvent(null)}>
          <EventTypeForm
            initialValue={selectedEvent.id ? selectedEvent : null}
            schedules={schedules}
            onSubmit={handleSave}
            onCancel={() => setSelectedEvent(null)}
          />
        </Modal>
      ) : null}
    </AdminShell>
  );
}
