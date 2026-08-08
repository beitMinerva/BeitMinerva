import React, { useState } from 'react';
import { X, Loader2, Syringe, Pill, Milk, Weight, Heart, Bell } from 'lucide-react';

export default function EditReminderModal({ reminder, goats = [], onClose, onSave }) {
  const [isClosing, setIsClosing] = useState(false);

  const categories = [
    { id: 'Vaccination', label: 'Vaccination', icon: Syringe, color: '#059669', bg: '#ecfdf5' },
    { id: 'Medication', label: 'Medication', icon: Pill, color: '#c2410c', bg: '#fff7ed' },
    { id: 'Milking Yield', label: 'Milking Yield', icon: Milk, color: '#0369a1', bg: '#f0f9ff' },
    { id: 'Weight Check', label: 'Weight Check', icon: Weight, color: '#7e22ce', bg: '#faf5ff' },
    { id: 'Pregnancy Check', label: 'Pregnancy Check', icon: Heart, color: '#be185d', bg: '#fdf2f8' },
    { id: 'General', label: 'General Task / Note', icon: Bell, color: '#059669', bg: '#ecfdf5' },
  ];

  const initialCat = categories.find((c) => c.id === reminder?.type) || categories[0];

  const formatLocalDatetime = (dateStr) => {
    if (!dateStr) return new Date().toISOString().slice(0, 16);
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const isScheduled = reminder?.title?.toLowerCase().startsWith('scheduled');

  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [reminderTitle, setReminderTitle] = useState(reminder?.title ? reminder.title.replace(/^Scheduled:\s*/, '') : '');
  const [reminderDate, setReminderDate] = useState(formatLocalDatetime(reminder?.date));
  const [reminderNotes, setReminderNotes] = useState(reminder?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const titlePrefix = isScheduled ? 'Scheduled: ' : '';
    const cleanTitle = reminderTitle.trim() || selectedCategory.label;

    try {
      if (onSave) {
        await onSave(reminder.id, {
          type: selectedCategory.id,
          title: `${titlePrefix}${cleanTitle}`,
          date: new Date(reminderDate).toISOString(),
          notes: reminderNotes.trim()
        });
      }
      handleAnimatedClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleAnimatedClose} style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', fontFamily: "'Outfit', sans-serif" }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {isScheduled ? 'Edit Scheduled Task' : 'Edit Timeline Health Event'}
          </h3>
          <button className="close-btn" onClick={handleAnimatedClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* DATE & TIME PICKER (BEIRUT LOCAL TIME) */}
            <div className="form-group">
              <label className="form-label">Date & Time *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {/* CATEGORY CUSTOM CARDS GRID */}
            <div className="form-group">
              <label className="form-label">Event Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory.id === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => !submitting && setSelectedCategory(cat)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${cat.color}` : '1px solid var(--border-color)',
                        background: isSelected ? cat.bg : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        textAlign: 'center'
                      }}
                    >
                      <Icon size={16} color={cat.color} />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isSelected ? cat.color : 'var(--text-main)', lineHeight: 1.1 }}>
                        {cat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Title / Description *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CD&T Vaccination, Dewormer, Weight Log..."
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes & Instructions</label>
              <textarea
                className="form-textarea"
                placeholder="Enter specific instructions or observations..."
                value={reminderNotes}
                onChange={(e) => setReminderNotes(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleAnimatedClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="spinner" /> Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
