import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { AdminShell } from '../components/AdminShell.jsx';

export function MeetingsPage() {
  const [scope, setScope] = useState('upcoming');
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');

  // 🔥 FILTER STATES
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

  // 🔥 FILTER LOGIC
// Replace only filter logic part

const filteredMeetings = useMemo(() => {
  return meetings.filter((meeting) => {
    const meetingDate = dayjs(meeting.startAt);

    if (statusFilter !== 'all' && meeting.status !== statusFilter) return false;

    if (eventFilter !== 'all' && meeting.eventName !== eventFilter) return false;

    if (search &&
      !meeting.inviteeName.toLowerCase().includes(search.toLowerCase()) &&
      !meeting.inviteeEmail.toLowerCase().includes(search.toLowerCase())
    ) return false;

    if (dateFilter === 'today' && !meetingDate.isSame(dayjs(), 'day')) return false;

    if (dateFilter === 'week' && !meetingDate.isAfter(dayjs().startOf('week'))) return false;

    if (dateFilter === 'month' && !meetingDate.isSame(dayjs(), 'month')) return false;

    return true;
  });
}, [meetings, statusFilter, dateFilter, search, eventFilter]);

  const uniqueEvents = [...new Set(meetings.map((m) => m.eventName))];

  const handleCancel = async (id) => {
    const reason = window.prompt('Cancellation reason', 'Host unavailable');
    if (reason === null) return;

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
      subtitle="Filter and manage all your scheduled meetings efficiently."
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
      {error && <div className="banner error">{error}</div>}

      {/* 🔥 FILTER BAR */}
      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
          <option value="all">All Events</option>
          {uniqueEvents.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>
      </div>

      {/* 🔥 MEETINGS LIST */}
      <section className="meeting-list">
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

              <p>{meeting.inviteeName} - {meeting.inviteeEmail}</p>
              <p>{dayjs(meeting.startAt).format('ddd, MMM D YYYY hh:mm A')}</p>
            </div>

            <div className="card-actions vertical">
              {meeting.status === 'scheduled' && (
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
              )}
            </div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}