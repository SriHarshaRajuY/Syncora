import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { Modal } from '../components/Modal.jsx';
import { ScheduleForm } from '../components/ScheduleForm.jsx';

export function AvailabilityPage() {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await api.get('/availability/schedules');
      setSchedules(data);
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
      if (selectedSchedule?.id) {
        await api.put(`/availability/schedules/${selectedSchedule.id}`, payload);
      } else {
        await api.post('/availability/schedules', payload);
      }
      setSelectedSchedule(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this schedule?')) {
      return;
    }

    try {
      await api.delete(`/availability/schedules/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminShell
      title="Availability"
      subtitle="Manage multiple weekly schedules, timezones, and date-specific overrides."
      actions={
        <button className="primary-button" onClick={() => setSelectedSchedule({})}>
          New schedule
        </button>
      }
    >
      {error ? <div className="banner error">{error}</div> : null}

      <section className="stats-grid enhanced">
        <article className="stat-card">
          <p className="eyebrow">Schedules</p>
          <h3>{schedules.length}</h3>
          <p className="muted-text">Maintain multiple working patterns for different meeting types.</p>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Default schedule</p>
          <h3>{schedules.find((item) => item.isDefault)?.name || 'None'}</h3>
          <p className="muted-text">Used automatically when an event type does not override it.</p>
        </article>
        <article className="stat-card">
          <p className="eyebrow">Overrides</p>
          <h3>{schedules.reduce((sum, item) => sum + item.overrides.length, 0)}</h3>
          <p className="muted-text">Date-specific changes mirror bonus feature expectations from the brief.</p>
        </article>
      </section>

      <section className="card-grid availability-grid">
        {schedules.map((schedule) => (
          <article className="schedule-card" key={schedule.id}>
            <div className="event-card-top">
              <span className={`status-pill ${schedule.isDefault ? 'active' : 'muted'}`}>
                {schedule.isDefault ? 'Default' : 'Secondary'}
              </span>
              <span className="eyebrow">{schedule.timezone}</span>
            </div>
            <h3>{schedule.name}</h3>

            <div className="weekly-rules">
              {schedule.rules.map((rule) => (
                <div className="weekly-rule-chip" key={`${rule.dayOfWeek}-${rule.startTime}`}>
                  <strong>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][rule.dayOfWeek]}</strong>
                  <span>
                    {rule.startTime.slice(0, 5)} - {rule.endTime.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>

            <div className="question-tags">
              {schedule.overrides.map((overrideItem) => (
                <span className="tag" key={overrideItem.overrideDate}>
                  {overrideItem.overrideDate} {overrideItem.isAvailable ? 'custom hours' : 'off'}
                </span>
              ))}
            </div>

            <div className="card-actions">
              <button className="ghost-button" onClick={() => setSelectedSchedule(schedule)}>
                Edit
              </button>
              <button className="ghost-button danger" onClick={() => handleDelete(schedule.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>

      {selectedSchedule ? (
        <Modal title={selectedSchedule.id ? 'Edit schedule' : 'Create schedule'} onClose={() => setSelectedSchedule(null)}>
          <ScheduleForm
            initialValue={selectedSchedule.id ? selectedSchedule : null}
            onSubmit={handleSave}
            onCancel={() => setSelectedSchedule(null)}
          />
        </Modal>
      ) : null}
    </AdminShell>
  );
}
