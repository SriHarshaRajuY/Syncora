import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { SiteHeader } from '../components/SiteHeader.jsx';

export function ConfirmationPage() {
  const { id, slug } = useParams();
  const { state } = useLocation();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api
      .get(`/meetings/public/booking/${id}`)
      .then((data) => setBooking(data))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return <div className="banner error narrow">{error}</div>;
  }

  if (!booking) {
    return <div className="loading-screen">Loading confirmation...</div>;
  }

  const answerEntries = Object.entries(booking.inviteeAnswers || {}).filter(
    ([, value]) => value !== null && value !== undefined && String(value).trim() !== ''
  );

  const handleCancel = async () => {
    if (!window.confirm('Cancel this booking?')) {
      return;
    }

    setCancelling(true);
    try {
      const updated = await api.post(`/meetings/public/reschedule/${booking.rescheduleToken}/cancel`, {
        reason: 'Cancelled by invitee'
      });
      setBooking(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="confirmation-screen">
      <SiteHeader compact ctaLabel="Open Dashboard" ctaTo="/events" showSecondary={false} brandTo="/book" />

      <div className="confirmation-card">
        <div className="confirmation-hero-copy">
          <p className="eyebrow">{booking.status === 'cancelled' ? 'Booking cancelled' : 'Booking confirmed'}</p>
          <h1>{booking.eventName}</h1>
          <p className="confirmation-attendee">
            {booking.inviteeName} - {booking.inviteeEmail}
          </p>
        </div>

        {state?.emailStatus ? (
          <div className={`banner confirmation-banner ${state.emailStatus.success ? 'success' : 'error'}`}>
            {state.emailStatus.success
              ? 'Confirmation email sent successfully.'
              : `Booking confirmed, but email failed: ${state.emailStatus.reason}`}
          </div>
        ) : null}

        <div className="confirmation-meta">
          <span>{dayjs(booking.startAt).format('dddd, MMMM D YYYY')}</span>
          <span>
            {dayjs(booking.startAt).format('hh:mm A')} - {dayjs(booking.endAt).format('hh:mm A')}
          </span>
          <span>{booking.timezone}</span>
          <span>{booking.eventLocation}</span>
        </div>

        {answerEntries.length ? (
          <div className="confirmation-answers">
            <div className="selection-preview">
              <p className="eyebrow">Submitted details</p>
              <h4>Your booking form responses</h4>
              <div className="confirmation-answer-list">
                {answerEntries.map(([label, value]) => (
                  <div className="confirmation-answer-row" key={label}>
                    <strong>{label}</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="confirmation-notes">
          <div className="selection-preview">
            <p className="eyebrow">Manage this booking</p>
            <h4>{booking.status === 'cancelled' ? 'This booking has been cancelled.' : 'Use the actions below to make changes.'}</h4>
            <p>Reschedule or cancel from this page with the same smooth flow used during booking.</p>
          </div>
        </div>

        <div className="card-actions centered wrap">
          {booking.status !== 'cancelled' ? (
            <Link className="secondary-button" to={`/book/${slug}?reschedule=${booking.rescheduleToken}`}>
              Reschedule
            </Link>
          ) : null}

          {booking.status !== 'cancelled' ? (
            <button className="ghost-button danger" type="button" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel booking'}
            </button>
          ) : null}

          <Link className="ghost-button" to="/events">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
