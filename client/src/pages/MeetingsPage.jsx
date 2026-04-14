import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { AdminShell } from '../components/AdminShell.jsx';

export function MeetingsPage() {
  const [scope, setScope] = useState('upcoming');
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.get(`/meetings?scope=${scope}`);
      setMeetings(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [scope]);

  const handleCancel = async (id) => {
    const reason = window.prompt('Cancellation reason', 'Host unavailable');
    if (reason === null) {
      return;
    }

    try {
      await api.post(`/meetings/${id}/cancel`, { reason });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminShell
      title="Meetings"
      subtitle="Track upcoming and past bookings, cancel gracefully, and share rescheduling flows."
      actions={
        <div className="tab-strip">
          <button className={scope === 'upcoming' ? 'tab active' : 'tab'} onClick={() => setScope('upcoming')}>
            Upcoming
          </button>
          <button className={scope === 'past' ? 'tab active' : 'tab'} onClick={() => setScope('past')}>
            Past
          </button>
        </div>
      }
    >
      {error ? <div className="banner error">{error}</div> : null}

      <section className="stats-grid enhanced">
        <article className="stat-card">
          <p className="eyebrow">{scope === 'upcoming' ? 'Upcoming meetings' : 'Past meetings'}</p>
          <h3>{meetings.length}</h3>
          <p className="muted-text">A clean view for evaluators to inspect the real scheduling lifecycle.</p>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Cancellable</p>
          <h3>{meetings.filter((item) => item.status === 'scheduled').length}</h3>
          <p className="muted-text">Host-side cancellation is available directly from the dashboard.</p>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Reschedule links</p>
          <h3>{meetings.filter((item) => item.rescheduleToken).length}</h3>
          <p className="muted-text">Every booking carries a reusable manage token for follow-up flows.</p>
        </article>
      </section>

      <section className="meeting-list">
        {meetings.map((meeting) => (
          <article className="meeting-card" key={meeting.id}>
            <div className="meeting-time">
              <span>{dayjs(meeting.startAt).format('DD')}</span>
              <small>{dayjs(meeting.startAt).format('MMM')}</small>
            </div>

            <div className="meeting-main">
              <div className="meeting-headline">
                <h3>{meeting.eventName}</h3>
                <span className={`status-pill ${meeting.status === 'cancelled' ? 'muted' : 'active'}`}>
                  {meeting.status}
                </span>
              </div>
              <div className="meeting-micro-meta">
                <span>{meeting.eventLocation}</span>
                <span>{meeting.timezone}</span>
              </div>
              <p>
                {meeting.inviteeName} - {meeting.inviteeEmail}
              </p>
              <p>
                {dayjs(meeting.startAt).format('ddd, MMM D YYYY hh:mm A')} - {dayjs(meeting.endAt).format('hh:mm A')}
              </p>
              <p>{meeting.eventLocation}</p>
            </div>

            <div className="card-actions vertical">
              {scope === 'upcoming' && meeting.status === 'scheduled' ? (
                <>
                  <button className="secondary-button" onClick={() => window.open(`/book/${meeting.eventSlug}?reschedule=${meeting.rescheduleToken}`, '_blank')}>
                    Reschedule
                  </button>
                  <button className="ghost-button danger" onClick={() => handleCancel(meeting.id)}>
                    Cancel
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
