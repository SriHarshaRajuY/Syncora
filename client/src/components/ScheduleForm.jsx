import { useState } from 'react';

const week = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

export function ScheduleForm({ initialValue, onSubmit, onCancel }) {
  const [form, setForm] = useState(
    initialValue || {
      name: 'New schedule',
      timezone: 'Asia/Kolkata',
      isDefault: false,
      rules: week.slice(1, 6).map((day) => ({
        dayOfWeek: day.value,
        startTime: '09:00:00',
        endTime: '17:00:00'
      })),
      overrides: []
    }
  );
  const [saving, setSaving] = useState(false);

  const handleRuleChange = (dayOfWeek, key, value) => {
    setForm((current) => ({
      ...current,
      rules: current.rules.map((rule) => (rule.dayOfWeek === dayOfWeek ? { ...rule, [key]: value } : rule))
    }));
  };

const toggleRule = (dayOfWeek, checked) => {
  setForm((current) => {
    const exists = current.rules.some(r => r.dayOfWeek === dayOfWeek);

    if (checked && !exists) {
      return {
        ...current,
        rules: [...current.rules, {
          dayOfWeek,
          startTime: '09:00:00',
          endTime: '17:00:00'
        }]
      };
    }

    return {
      ...current,
      rules: current.rules.filter(r => r.dayOfWeek !== dayOfWeek)
    };
  });
};

  const addOverride = () => {
    setForm((current) => ({
      ...current,
      overrides: [
        ...current.overrides,
        {
          overrideDate: '',
          isAvailable: true,
          startTime: '10:00:00',
          endTime: '16:00:00',
          reason: ''
        }
      ]
    }));
  };

  const updateOverride = (index, key, value) => {
    setForm((current) => ({
      ...current,
      overrides: current.overrides.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: value } : item
      )
    }));
  };

  const removeOverride = (index) => {
    setForm((current) => ({
      ...current,
      overrides: current.overrides.filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        overrides: form.overrides.filter((item) => item.overrideDate)
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        <span>Name</span>
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      </label>

      <label>
        <span>Timezone</span>
        <input
          value={form.timezone}
          onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
          placeholder="Asia/Kolkata"
        />
      </label>

      <label className="checkbox-inline">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
        />
        Make this the default schedule
      </label>

      <div className="full-width schedule-grid">
        {week.map((day) => {
          const rule = form.rules.find((item) => item.dayOfWeek === day.value);
          return (
            <div className="schedule-row" key={day.value}>
              <label className="checkbox-inline">
                <input type="checkbox" checked={Boolean(rule)} onChange={(event) => toggleRule(day.value, event.target.checked)} />
                {day.label}
              </label>
              {rule ? (
                <div className="time-range">
                  <input
                    type="time"
                    value={rule.startTime.slice(0, 5)}
                    onChange={(event) => handleRuleChange(day.value, 'startTime', `${event.target.value}:00`)}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={rule.endTime.slice(0, 5)}
                    onChange={(event) => handleRuleChange(day.value, 'endTime', `${event.target.value}:00`)}
                  />
                </div>
              ) : (
                <span className="muted-text">Unavailable</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="full-width question-builder">
        <div className="section-row">
          <div>
            <p className="eyebrow">Date-specific hours</p>
            <h4>Overrides</h4>
          </div>
          <button className="secondary-button" type="button" onClick={addOverride}>
            Add override
          </button>
        </div>

        {form.overrides.map((overrideItem, index) => (
          <div className="override-row" key={`${overrideItem.overrideDate}-${index}`}>
            <input
              type="date"
              value={overrideItem.overrideDate}
              onChange={(event) => updateOverride(index, 'overrideDate', event.target.value)}
            />
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={overrideItem.isAvailable}
                onChange={(event) => updateOverride(index, 'isAvailable', event.target.checked)}
              />
              Available
            </label>
            {overrideItem.isAvailable ? (
              <>
                <input
                  type="time"
                  value={overrideItem.startTime.slice(0, 5)}
                  onChange={(event) => updateOverride(index, 'startTime', `${event.target.value}:00`)}
                />
                <input
                  type="time"
                  value={overrideItem.endTime.slice(0, 5)}
                  onChange={(event) => updateOverride(index, 'endTime', `${event.target.value}:00`)}
                />
              </>
            ) : null}
            <input
              value={overrideItem.reason}
              onChange={(event) => updateOverride(index, 'reason', event.target.value)}
              placeholder="Reason"
            />
            <button className="ghost-button" type="button" onClick={() => removeOverride(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="form-actions full-width">
        <button className="ghost-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save schedule'}
        </button>
      </div>
    </form>
  );
}

