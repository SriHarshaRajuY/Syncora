import { useMemo, useState } from 'react';

const blankQuestion = { label: '', type: 'text', required: false };

const makeSlug = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function EventTypeForm({ initialValue, schedules, onSubmit, onCancel }) {
  const [form, setForm] = useState(
    initialValue || {
      name: '',
      slug: '',
      durationMinutes: 30,
      color: '#0f766e',
      description: '',
      location: 'Google Meet',
      scheduleId: schedules[0]?.id || '',
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      isActive: true,
      inviteeQuestions: [blankQuestion]
    }
  );
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => form.name && form.slug && form.durationMinutes, [form]);

  const updateQuestion = (index, key, value) => {
    setForm((current) => ({
      ...current,
      inviteeQuestions: current.inviteeQuestions.map((question, currentIndex) =>
        currentIndex === index ? { ...question, [key]: value } : question
      )
    }));
  };

  const addQuestion = () => {
    setForm((current) => ({
      ...current,
      inviteeQuestions: [...current.inviteeQuestions, { ...blankQuestion }]
    }));
  };

  const removeQuestion = (index) => {
    setForm((current) => ({
      ...current,
      inviteeQuestions: current.inviteeQuestions.filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        slug: makeSlug(form.slug),
        inviteeQuestions: form.inviteeQuestions.filter((item) => item.label.trim())
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        <span>Name</span>
        <input
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              name: event.target.value,
              slug: current.slug || makeSlug(event.target.value)
            }))
          }
          placeholder="Intro Call"
          required
        />
      </label>

      <label>
        <span>Public slug</span>
        <input
          value={form.slug}
          onChange={(event) => setForm((current) => ({ ...current, slug: makeSlug(event.target.value) }))}
          placeholder="intro-call"
          required
        />
      </label>

      <label>
        <span>Duration (minutes)</span>
        <input
          type="number"
          min="15"
          step="15"
          value={form.durationMinutes}
          onChange={(event) => setForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
          required
        />
      </label>

      <label>
        <span>Schedule</span>
        <select
          value={form.scheduleId || ''}
          onChange={(event) => setForm((current) => ({ ...current, scheduleId: Number(event.target.value) }))}
        >
          {schedules.map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {schedule.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Location</span>
        <input
          value={form.location}
          onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
          placeholder="Google Meet"
        />
      </label>

      <label>
        <span>Accent color</span>
        <input
          type="color"
          value={form.color}
          onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
        />
      </label>

      <label>
        <span>Buffer before</span>
        <input
          type="number"
          min="0"
          step="5"
          value={form.bufferBeforeMinutes}
          onChange={(event) => setForm((current) => ({ ...current, bufferBeforeMinutes: Number(event.target.value) }))}
        />
      </label>

      <label>
        <span>Buffer after</span>
        <input
          type="number"
          min="0"
          step="5"
          value={form.bufferAfterMinutes}
          onChange={(event) => setForm((current) => ({ ...current, bufferAfterMinutes: Number(event.target.value) }))}
        />
      </label>

      <label className="full-width">
        <span>Description</span>
        <textarea
          rows="3"
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="What this meeting is for..."
        />
      </label>

      <div className="full-width question-builder">
        <div className="section-row">
          <div>
            <p className="eyebrow">Invitee questions</p>
            <h4>Custom booking questions</h4>
          </div>
          <button className="secondary-button" type="button" onClick={addQuestion}>
            Add question
          </button>
        </div>

        {form.inviteeQuestions.map((question, index) => (
          <div className="question-row" key={`${question.label}-${index}`}>
            <input
              value={question.label}
              onChange={(event) => updateQuestion(index, 'label', event.target.value)}
              placeholder="Question prompt"
            />
            <select value={question.type} onChange={(event) => updateQuestion(index, 'type', event.target.value)}>
              <option value="text">Short text</option>
              <option value="textarea">Long answer</option>
            </select>
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={question.required}
                onChange={(event) => updateQuestion(index, 'required', event.target.checked)}
              />
              Required
            </label>
            <button className="ghost-button" type="button" onClick={() => removeQuestion(index)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <label className="checkbox-inline">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
        />
        Event type is active
      </label>

      <div className="form-actions full-width">
        <button className="ghost-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="primary-button" type="submit" disabled={!canSubmit || saving}>
          {saving ? 'Saving...' : 'Save event'}
        </button>
      </div>
    </form>
  );
}

