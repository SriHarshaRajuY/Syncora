import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { AdminShell } from '../components/AdminShell.jsx';

export function MeetingsPage() {
  const [scope, setScope] = useState('upcoming');
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');

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

  const filteredMeetings = useMemo(
    () =>
      meetings.filter((meeting) => {
        const meetingDate = dayjs(meeting.startAt);

        if (statusFilter !== 'all' && meeting.status !== statusFilter) {
          return false;
        }

        if (eventFilter !== 'all' && meeting.eventName !== eventFilter) {
          return false;
        }

        if (
          search &&
          !meeting.inviteeName.toLowerCase().includes(search.toLowerCase()) &&
          !meeting.inviteeEmail.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }

        if (dateFilter === 'today' && !meetingDate.isSame(dayjs(), 'day')) {
          return false;
        }

        if (dateFilter === 'week' && !meetingDate.isAfter(dayjs().startOf('week'))) {
          return false;
        }

        if (dateFilter === 'month' && !meetingDate.isSame(dayjs(), 'month')) {
          return false;
        }

        return true;
      }),
    [meetings, statusFilter, dateFilter, search, eventFilter]
  );

  const uniqueEvents = [...new Set(meetings.map((meeting) => meeting.eventName))];

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
      subtitle="Review upcoming and past meetings, filter by event or status, and manage cancellations and rescheduling from one place."
      quickActionLabel="Create"
      quickActionTo="/events"
      actions={null}
    >
      {error ? <div className="banner error">{error}</div> : null}

      <section className="meetings-shell-card">
        <div className="meetings-controls">
          <div className="cal-tabs">
            <button
              className={`cal-tab ${scope === 'upcoming' ? 'active' : ''}`}
              onClick={() => setScope('upcoming')}
              type="button"
            >
              Upcoming
            </button>
            <button className={`cal-tab ${scope === 'past' ? 'active' : ''}`} onClick={() => setScope('past')} type="button">
              Past
            </button>
            <button className="cal-tab" type="button">
              Date range
            </button>
          </div>

          <div className="meetings-summary">Displaying {filteredMeetings.length} event(s)</div>
        </div>

        <div className="filter-bar filter-bar-panel">
          <input
            className="filter-input"
            placeholder="Search by invitee name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All status</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>

          <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
            <option value="all">All events</option>
            {uniqueEvents.map((eventName) => (
              <option key={eventName} value={eventName}>
                {eventName}
              </option>
            ))}
          </select>
        </div>

        {filteredMeetings.length ? (
          <section className="meeting-list refined">
            {filteredMeetings.map((meeting) => (
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
                  <p>{dayjs(meeting.startAt).format('ddd, MMM D YYYY hh:mm A')}</p>
                </div>

                <div className="card-actions vertical">
                  {meeting.status === 'scheduled' ? (
                    <>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          window.open(`/book/${meeting.eventSlug}?reschedule=${meeting.rescheduleToken}`, '_blank')
                        }
                      >
                        Reschedule
                      </button>
                      <button className="ghost-button danger" onClick={() => handleCancel(meeting.id)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <span className="muted-text">Cancelled meetings stay visible for audit and demonstration.</span>
                  )}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="empty-state-card meetings-empty-state">
            <h3>No events yet</h3>
            <p>Share your event type links to begin collecting meetings in this workspace.</p>
            <a className="primary-button" href="/events">
              View event types
            </a>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
