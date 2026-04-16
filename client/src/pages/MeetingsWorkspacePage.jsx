import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { AdminShell } from '../components/AdminShell.jsx';

export function MeetingsPage() {
  const navigate = useNavigate();
  const [scope, setScope] = useState('upcoming');
  const [meetings, setMeetings] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    totalItems: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false
  });
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const load = async () => {
    try {
      const data = await api.get(`/meetings?scope=${scope}&page=${page}&limit=${limit}`);

      if (Array.isArray(data)) {
        setMeetings(data);
        setPagination({
          page: 1,
          limit,
          totalItems: data.length,
          totalPages: 1,
          hasPrev: false,
          hasNext: false
        });
      } else {
        setMeetings(data.items || []);
        const nextPagination = data.pagination || {
          page: 1,
          limit,
          totalItems: 0,
          totalPages: 1,
          hasPrev: false,
          hasNext: false
        };
        setPagination(nextPagination);
        if (nextPagination.page !== page) {
          setPage(nextPagination.page);
        }
      }

      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [scope, page, limit]);

  useEffect(() => {
    setPage(1);
    setStatusFilter('all');
    setSearch('');
    setEventFilter('all');
    setRangeStart('');
    setRangeEnd('');
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

        if (rangeStart && meetingDate.isBefore(dayjs(rangeStart), 'day')) {
          return false;
        }

        if (rangeEnd && meetingDate.isAfter(dayjs(rangeEnd), 'day')) {
          return false;
        }

        return true;
      }),
    [meetings, statusFilter, search, eventFilter, rangeStart, rangeEnd]
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
          <div className="meetings-tabs">
            <button
              className={`meeting-scope-tab ${scope === 'upcoming' ? 'active' : ''}`}
              onClick={() => setScope('upcoming')}
              type="button"
            >
              Upcoming
            </button>
            <button
              className={`meeting-scope-tab ${scope === 'past' ? 'active' : ''}`}
              onClick={() => setScope('past')}
              type="button"
            >
              Past
            </button>
            <button
              className={`meeting-scope-tab ${scope === 'cancelled' ? 'active' : ''}`}
              onClick={() => setScope('cancelled')}
              type="button"
            >
              Cancelled
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

          <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
            <option value="all">All events</option>
            {uniqueEvents.map((eventName) => (
              <option key={eventName} value={eventName}>
                {eventName}
              </option>
            ))}
          </select>

          <label className="date-range-field">
            <span>From</span>
            <input type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
          </label>

          <label className="date-range-field">
            <span>To</span>
            <input type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
          </label>
        </div>

        <div className="meetings-pagination-bar">
          <label className="pagination-limit-field">
            <span>Meetings per page</span>
            <select
              value={limit}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </label>

          <div className="pagination-meta">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <span>{pagination.totalItems} total meetings</span>
          </div>

          <div className="pagination-actions">
            <button
              className="ghost-button"
              type="button"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              className="ghost-button"
              type="button"
              disabled={!pagination.hasNext}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
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
                        onClick={() => navigate(`/book/${meeting.eventSlug}?reschedule=${meeting.rescheduleToken}`)}
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
            <h3>{scope === 'cancelled' ? 'No cancelled meetings' : 'No events yet'}</h3>
            <p>
              {scope === 'cancelled'
                ? 'Cancelled meetings will appear here once any scheduled meeting is cancelled.'
                : 'Share your event type links to begin collecting meetings in this workspace.'}
            </p>
            {scope !== 'cancelled' ? (
              <a className="primary-button" href="/events">
                View event types
              </a>
            ) : null}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
