import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { AdminShell } from '../components/AdminShell.jsx';
import { ScheduleForm } from '../components/ScheduleForm.jsx';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AvailabilityPage() {
  const [schedules, setSchedules] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [activeTab, setActiveTab] = useState('schedules');
  const [settings, setSettings] = useState({
    maxMeetingsPerDay: '',
    maxMeetingsPerWeek: '',
    holidayCountry: 'India',
    autoBlockHolidays: false
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [scheduleData, eventTypeData, settingsData] = await Promise.all([
        api.get('/availability/schedules'),
        api.get('/event-types'),
        api.get('/availability/settings')
      ]);
      setSchedules(scheduleData);
      setEventTypes(eventTypeData);
      setActiveScheduleId((current) => current || scheduleData[0]?.id || null);
      setSettings({
        maxMeetingsPerDay: settingsData.maxMeetingsPerDay || '',
        maxMeetingsPerWeek: settingsData.maxMeetingsPerWeek || '',
        holidayCountry: settingsData.holidayCountry || 'India',
        autoBlockHolidays: Boolean(settingsData.autoBlockHolidays)
      });
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === activeScheduleId) || schedules[0] || null,
    [activeScheduleId, schedules]
  );

  const activeEventCount = activeSchedule
    ? eventTypes.filter((eventType) => eventType.scheduleId === activeSchedule.id).length
    : 0;

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
      if (activeScheduleId === id) {
        setActiveScheduleId(null);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setSavingSettings(true);

    try {
      const updated = await api.put('/availability/settings', settings);
      setSettings({
        maxMeetingsPerDay: updated.maxMeetingsPerDay || '',
        maxMeetingsPerWeek: updated.maxMeetingsPerWeek || '',
        holidayCountry: updated.holidayCountry || 'India',
        autoBlockHolidays: Boolean(updated.autoBlockHolidays)
      });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <AdminShell
      title="Availability"
      subtitle="Configure weekly working hours, advanced limits, and holiday handling for your public booking experience."
      quickActionLabel="Create"
      onQuickAction={() => setSelectedSchedule({})}
      actions={
        activeTab === 'schedules' ? (
          <button className="primary-button" onClick={() => setSelectedSchedule({})}>
            + Hours
          </button>
        ) : null
      }
      drawer={
        selectedSchedule ? (
          <ScheduleForm
            initialValue={selectedSchedule.id ? selectedSchedule : null}
            onSubmit={handleSave}
            onCancel={() => setSelectedSchedule(null)}
          />
        ) : null
      }
    >
      {error ? <div className="banner error">{error}</div> : null}

      <section className="availability-tabs">
        <button
          className={`availability-tab ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
          type="button"
        >
          Schedules
        </button>
        <button
          className={`availability-tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
          type="button"
        >
          Advanced settings
        </button>
      </section>

      {activeTab === 'schedules' ? (
        <section className="availability-workspace">
          <aside className="schedule-index-card">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Schedules</p>
                <h3>All schedules</h3>
              </div>
            </div>

            <div className="schedule-index-list">
              {schedules.map((schedule) => (
                <button
                  className={`schedule-index-item ${activeSchedule?.id === schedule.id ? 'active' : ''}`}
                  key={schedule.id}
                  onClick={() => setActiveScheduleId(schedule.id)}
                  type="button"
                >
                  <div>
                    <strong>{schedule.name}</strong>
                    <span>{schedule.timezone}</span>
                  </div>
                  <span className={`status-pill ${schedule.isDefault ? 'active' : 'muted'}`}>
                    {schedule.isDefault ? 'Default' : `${schedule.rules.length} days`}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {activeSchedule ? (
            <section className="availability-detail-card">
              <div className="availability-detail-header">
                <div>
                  <p className="eyebrow">Schedule</p>
                  <h2>
                    {activeSchedule.name} {activeSchedule.isDefault ? <span className="subtle-inline">(default)</span> : null}
                  </h2>
                  <p className="muted-text">
                    {activeSchedule.timezone} - Active on {activeEventCount} event {activeEventCount === 1 ? 'type' : 'types'}
                  </p>
                </div>

                <div className="availability-toggle-row">
                  <button className="ghost-button" onClick={() => setSelectedSchedule(activeSchedule)} type="button">
                    Edit
                  </button>
                </div>
              </div>

              <div className="availability-columns">
                <article className="availability-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Weekly hours</h3>
                      <p className="muted-text">Set when you are typically available for meetings.</p>
                    </div>
                  </div>

                  <div className="hours-list">
                    {weekDays.map((dayLabel, dayOfWeek) => {
                      const rule = activeSchedule.rules.find((item) => item.dayOfWeek === dayOfWeek);

                      return (
                        <div className="hours-row" key={dayLabel}>
                          <div className="hours-day-badge">{dayLabel.slice(0, 1)}</div>
                          <strong>{dayLabel}</strong>
                          <span>{rule ? `${rule.startTime.slice(0, 5)} - ${rule.endTime.slice(0, 5)}` : 'Unavailable'}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="availability-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Date-specific hours</h3>
                      <p className="muted-text">Adjust hours for specific dates using overrides.</p>
                    </div>
                    <button className="secondary-button" onClick={() => setSelectedSchedule(activeSchedule)} type="button">
                      + Hours
                    </button>
                  </div>

                  <div className="override-list">
                    {activeSchedule.overrides.length ? (
                      activeSchedule.overrides.map((overrideItem) => (
                        <div className="override-card" key={overrideItem.overrideDate}>
                          <strong>{overrideItem.overrideDate}</strong>
                          <span>
                            {overrideItem.isAvailable
                              ? `${overrideItem.startTime.slice(0, 5)} - ${overrideItem.endTime.slice(0, 5)}`
                              : 'Unavailable'}
                          </span>
                          {overrideItem.reason ? <p>{overrideItem.reason}</p> : null}
                        </div>
                      ))
                    ) : (
                      <div className="empty-inline-state">
                        <strong>No date-specific hours yet</strong>
                        <p>Add overrides for holidays, travel days, or extended availability.</p>
                      </div>
                    )}
                  </div>
                </article>
              </div>

              <div className="availability-detail-footer">
                <button className="ghost-button" onClick={() => setSelectedSchedule(activeSchedule)} type="button">
                  Edit schedule
                </button>
                <button className="ghost-button danger" onClick={() => handleDelete(activeSchedule.id)} type="button">
                  Delete schedule
                </button>
              </div>
            </section>
          ) : (
            <div className="empty-state-card">
              <h3>No schedules available</h3>
              <p>Create a schedule to configure working hours and booking rules.</p>
            </div>
          )}
        </section>
      ) : (
        <section className="advanced-settings-card">
          <div className="advanced-settings-header">
            <div>
              <h2>Advanced settings</h2>
              <p>Control availability across your event types with meeting limits and automatic holiday blocking.</p>
            </div>
          </div>

          <form className="advanced-settings-form" onSubmit={handleSaveSettings}>
            <article className="advanced-settings-section">
              <h3>Meeting limits</h3>
              <p>Set a maximum number of meetings so booking pages automatically stop offering time when you hit your limits.</p>

              <div className="advanced-settings-grid">
                <label>
                  <span>Maximum meetings per day</span>
                  <input
                    type="number"
                    min="1"
                    value={settings.maxMeetingsPerDay}
                    onChange={(event) => setSettings((current) => ({ ...current, maxMeetingsPerDay: event.target.value }))}
                    placeholder="4"
                  />
                </label>

                <label>
                  <span>Maximum meetings per week</span>
                  <input
                    type="number"
                    min="1"
                    value={settings.maxMeetingsPerWeek}
                    onChange={(event) => setSettings((current) => ({ ...current, maxMeetingsPerWeek: event.target.value }))}
                    placeholder="12"
                  />
                </label>
              </div>
            </article>

            <article className="advanced-settings-section">
              <h3>Holidays</h3>
              <p>When automatic holiday blocking is enabled, supported public holidays will be treated as unavailable dates.</p>

              <div className="advanced-settings-grid">
                <label>
                  <span>Country for holidays</span>
                  <select
                    value={settings.holidayCountry}
                    onChange={(event) => setSettings((current) => ({ ...current, holidayCountry: event.target.value }))}
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                  </select>
                </label>

                <label className="settings-toggle">
                  <span>Automatically block supported holidays</span>
                  <input
                    type="checkbox"
                    checked={settings.autoBlockHolidays}
                    onChange={(event) => setSettings((current) => ({ ...current, autoBlockHolidays: event.target.checked }))}
                  />
                </label>
              </div>
            </article>

            <div className="advanced-settings-actions">
              <button className="primary-button" type="submit" disabled={savingSettings}>
                {savingSettings ? 'Saving...' : 'Save advanced settings'}
              </button>
            </div>
          </form>
        </section>
      )}
    </AdminShell>
  );
}
