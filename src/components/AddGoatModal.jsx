import React, { useState } from 'react';
import BarcodeSVG from './BarcodeSVG';
import { X, Loader2 } from 'lucide-react';

export default function AddGoatModal({ goatToEdit = null, barnAreas = [], initialPenId = null, onClose, onSave }) {
  const [isClosing, setIsClosing] = useState(false);

  const [tagId, setTagId] = useState(goatToEdit ? goatToEdit.tag_id : '');
  const [name, setName] = useState(goatToEdit ? goatToEdit.name : '');
  const [breed, setBreed] = useState(goatToEdit ? goatToEdit.breed : 'Alpine');
  const [gender, setGender] = useState(goatToEdit ? (goatToEdit.gender === 'Doe' ? 'Female' : goatToEdit.gender === 'Buck' ? 'Male' : goatToEdit.gender) : 'Female');
  const [neuteredStatus, setNeuteredStatus] = useState(goatToEdit ? (goatToEdit.neutered_status || 'Intact') : 'Intact');
  const [birthDate, setBirthDate] = useState(goatToEdit ? goatToEdit.birth_date : new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState(goatToEdit ? (goatToEdit.weight || 45) : 45);
  const [status, setStatus] = useState(goatToEdit ? goatToEdit.status : 'Healthy');
  const [areaId, setAreaId] = useState(() => {
    if (goatToEdit?.area_id) return goatToEdit.area_id;
    if (initialPenId) return initialPenId;
    return barnAreas[0]?.id || 'area-1';
  });
  const [notes, setNotes] = useState(goatToEdit ? goatToEdit.notes : '');
  const [submitting, setSubmitting] = useState(false);

  const breeds = ['Alpine', 'Boer', 'Nubian', 'Saanen', 'Nigerian Dwarf', 'Kiko', 'Pygmy', 'Toggenburg', 'Crossbreed'];
  const statuses = ['Healthy', 'Under Treatment', 'Pregnant', 'Dry', 'Quarantine', 'Sold'];

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave({
        tag_id: tagId.trim().toUpperCase(),
        name: name.trim(),
        breed,
        gender,
        neutered_status: neuteredStatus,
        birth_date: birthDate,
        weight: parseFloat(weight) || 45,
        status,
        area_id: areaId,
        notes: notes.trim()
      });
      handleAnimatedClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'closing' : ''}`} onClick={handleAnimatedClose}>
      <div className={`modal-content ${isClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{goatToEdit ? 'Edit Goat Record' : 'Register New Goat'}</h2>
          <button className="close-btn" onClick={handleAnimatedClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* LIVE BARCODE GENERATION PREVIEW CARD */}
            <div className="card" style={{ padding: '12px', marginBottom: '14px', textAlign: 'center', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                EAR TAG BARCODE (HOLD TO SAVE IMAGE)
              </span>
              <BarcodeSVG value={tagId || 'GT-101'} width={180} height={46} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Ear Tag ID *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. GT-107"
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  required
                  style={{ textTransform: 'uppercase' }}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Goat Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Bella"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* GENDER CUSTOM CARD SELECTION (Female vs Male vs Other) */}
            <div className="form-group">
              <label className="form-label">Gender</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'Female', label: 'Female' },
                  { id: 'Male', label: 'Male' },
                  { id: 'Other', label: 'Other' }
                ].map(({ id, label }) => (
                  <div
                    key={id}
                    onClick={() => !submitting && setGender(id)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '10px',
                      border: gender === id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: gender === id ? 'var(--primary-light)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: '800',
                      fontSize: '13px',
                      color: gender === id ? 'var(--primary-dark)' : 'var(--text-main)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* SPAYED / NEUTERED REPRODUCTIVE STATUS */}
            <div className="form-group">
              <label className="form-label">Spayed / Neutered Status</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'Intact', label: 'Intact (Breeding)' },
                  { id: 'Spayed / Neutered', label: 'Spayed / Neutered' }
                ].map((s) => (
                  <div
                    key={s.id}
                    onClick={() => !submitting && setNeuteredStatus(s.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      border: neuteredStatus === s.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: neuteredStatus === s.id ? 'var(--primary-light)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: '800',
                      color: neuteredStatus === s.id ? 'var(--primary-dark)' : 'var(--text-main)'
                    }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            {/* BREED CUSTOM PILL CHIPS SELECTOR */}
            <div className="form-group">
              <label className="form-label">Breed</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {breeds.map((b) => (
                  <span
                    key={b}
                    onClick={() => !submitting && setBreed(b)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: breed === b ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      background: breed === b ? 'var(--primary-light)' : '#ffffff',
                      color: breed === b ? 'var(--primary-dark)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* STATUS CUSTOM PILL CHIPS SELECTOR */}
            <div className="form-group">
              <label className="form-label">Health Status</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {statuses.map((s) => (
                  <span
                    key={s}
                    onClick={() => !submitting && setStatus(s)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      border: status === s ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      background: status === s ? 'var(--primary-light)' : '#ffffff',
                      color: status === s ? 'var(--primary-dark)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* BARN PEN CUSTOM SELECTION GRID (Pens A-F) */}
            <div className="form-group">
              <label className="form-label">Assign Pen Location</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {barnAreas.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => !submitting && setAreaId(a.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '10px',
                      border: areaId === a.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: areaId === a.id ? 'var(--primary-light)' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <strong style={{ fontSize: '13px', display: 'block', color: areaId === a.id ? 'var(--primary)' : 'var(--text-main)' }}>
                      Pen {a.letter || 'A'}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Birth Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  placeholder="45"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes & Treatment Records</label>
              <textarea
                className="form-textarea"
                placeholder="Enter notes, pedigree info, or health details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                  <Loader2 size={16} className="spinner" /> Saving Record...
                </>
              ) : (
                goatToEdit ? 'Save Record' : 'Register Goat'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
