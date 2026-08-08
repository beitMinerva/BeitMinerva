import React, { useState } from 'react';
import { Search, Plus, ArrowRightLeft, Pencil, Edit2, Trash2, X, Loader2, ChevronRight } from 'lucide-react';
import GoatCard from '../components/GoatCard';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function BarnSquareView({
  goats = [],
  barnAreas = [],
  onRequireAdmin,
  onSelectGoat,
  onOpenAddGoat,
  onTransferGoatArea,
  onAddBarnArea,
  onUpdateBarnArea,
  onDeleteBarnArea
}) {
  // ...
  const pens = barnAreas.length > 0 ? barnAreas : [
    { id: 'area-1', letter: 'A', name: 'Pen A' },
    { id: 'area-2', letter: 'B', name: 'Pen B' },
    { id: 'area-3', letter: 'C', name: 'Pen C' },
    { id: 'area-4', letter: 'D', name: 'Pen D' },
    { id: 'area-5', letter: 'E', name: 'Pen E' },
    { id: 'area-6', letter: 'F', name: 'Pen F' },
  ];

  const [selectedPenId, setSelectedPenId] = useState(pens[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [transferringGoat, setTransferringGoat] = useState(null);

  // Pen Management Modal State
  const [showManageModal, setShowManageModal] = useState(false);
  const [isManageClosing, setIsManageClosing] = useState(false);
  const [penToDelete, setPenToDelete] = useState(null);

  // Inline Edit State inside manage modal
  const [editingPenId, setEditingPenId] = useState(null);
  const [editLetter, setEditLetter] = useState('');
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');

  // Add Pen State inside manage modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLetter, setNewLetter] = useState('');
  const [newName, setNewName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPen = pens.find((p) => p.id === selectedPenId) || pens[0];
  const goatsInSelectedPen = goats.filter((g) => g.area_id === selectedPenId);

  // Search filtered goats
  const searchedGoats = goats.filter((g) => {
    if (!searchTerm.trim()) return false;
    const q = searchTerm.trim().toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.tag_id.toLowerCase().includes(q) ||
      (g.breed || '').toLowerCase().includes(q)
    );
  });

  const handleTransferSubmit = async (targetAreaId) => {
    if (!transferringGoat) return;
    const targetArea = pens.find((p) => p.id === targetAreaId);
    const sourceArea = pens.find((p) => p.id === transferringGoat.area_id);
    await onTransferGoatArea(
      transferringGoat.id,
      targetAreaId,
      sourceArea ? sourceArea.name : '',
      targetArea ? targetArea.name : ''
    );
    setTransferringGoat(null);
  };

  const handleCloseManage = () => {
    setIsManageClosing(true);
    setTimeout(() => {
      setShowManageModal(false);
      setIsManageClosing(false);
      setEditingPenId(null);
      setShowAddForm(false);
    }, 450);
  };

  const handleStartEdit = (pen) => {
    setEditingPenId(pen.id);
    setEditLetter(pen.letter || '');
    setEditNote(pen.note || (pen.name && pen.name !== `Pen ${pen.letter}` ? pen.name : ''));
  };

  const handleSaveEdit = async (pen) => {
    setSubmitting(true);
    try {
      if (onUpdateBarnArea) {
        const newLetter = editLetter.trim().toUpperCase() || pen.letter;
        const newLabel = editNote.trim();
        await onUpdateBarnArea(pen.id, {
          letter: newLetter,
          name: newLabel ? newLabel : `Pen ${newLetter}`
        });
      }
      setEditingPenId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPen = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (onAddBarnArea) {
        const nextLetter = newLetter.trim().toUpperCase() ||
          String.fromCharCode(65 + pens.length);
        const label = newNote.trim();
        await onAddBarnArea({
          letter: nextLetter,
          name: label ? label : `Pen ${nextLetter}`
        });
      }
      setNewLetter('');
      setNewName('');
      setNewNote('');
      setShowAddForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search Bar */}
      <div className="search-input-wrapper" style={{ width: '100%' }}>
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="form-input"
          placeholder="Search ear tag ID, name, or breed..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Instant Search Results */}
      {searchTerm.trim() && (
        <div className="card" style={{ padding: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-muted)' }}>
            Search Results ({searchedGoats.length})
          </h3>
          {searchedGoats.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No goats found matching "{searchTerm}".</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchedGoats.map((g) => (
                <GoatCard key={g.id} goat={g} barnAreas={pens} onClick={onSelectGoat} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORIGINAL 6-PEN GRID WITH BIG LETTER + GOAT COUNT PILL + OPTIONAL NOTE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Barn Pens</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (onRequireAdmin) {
                onRequireAdmin(() => setShowManageModal(true));
              } else {
                setShowManageModal(true);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Pencil size={13} /> Edit Pens
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {pens.map((pen) => {
            const penGoats = goats.filter((g) => g.area_id === pen.id);
            const isSelected = pen.id === selectedPenId;

            return (
              <div
                key={pen.id}
                onClick={() => setSelectedPenId(pen.id)}
                style={{
                  background: isSelected ? 'var(--primary-gradient)' : '#ffffff',
                  color: isSelected ? 'white' : 'var(--text-main)',
                  border: isSelected ? '2px solid var(--primary-dark)' : '2px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '20px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? 'var(--primary-glow)' : 'var(--shadow-sm)'
                }}
              >
                {/* BIG LETTER */}
                <span style={{ fontSize: '38px', fontWeight: '800', lineHeight: '1', fontFamily: 'Outfit, sans-serif' }}>
                  {pen.letter}
                </span>

                {/* GOAT COUNT PILL */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    marginTop: '6px',
                    background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isSelected ? 'white' : 'var(--text-main)',
                    padding: '2px 9px',
                    borderRadius: '9999px'
                  }}
                >
                  {penGoats.length} goats
                </span>

                {/* OPTIONAL SMALL NOTE/SUBTITLE UNDER PILL — only shown if set */}
                {pen.name && pen.name !== `Pen ${pen.letter}` && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      marginTop: '5px',
                      color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {pen.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED PEN GOATS DRAWER */}
      {selectedPen && (
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0 }}>
                Pen {selectedPen.letter}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {goatsInSelectedPen.length} goats inside pen
              </span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onOpenAddGoat}>
              <Plus size={14} /> Register Goat Here
            </button>
          </div>

          {goatsInSelectedPen.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '14px 0', textAlign: 'center' }}>
              Pen {selectedPen.letter} is currently empty.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {goatsInSelectedPen.map((g) => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <GoatCard goat={g} barnAreas={pens} onClick={onSelectGoat} />
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    title="Move Goat"
                    onClick={() => {
                      if (onRequireAdmin) {
                        onRequireAdmin(() => setTransferringGoat(g));
                      } else {
                        setTransferringGoat(g);
                      }
                    }}
                    style={{ padding: '8px 10px', flexShrink: 0 }}
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MANAGE PENS MODAL (ADD / REMOVE / RENAME) */}
      {showManageModal && (
        <div className={`modal-overlay ${isManageClosing ? 'closing' : ''}`} onClick={handleCloseManage}>
          <div
            className={`modal-content ${isManageClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">Manage Barn Pens</h3>
              <button className="close-btn" onClick={handleCloseManage}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* LIST OF EXISTING PENS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {pens.map((pen) => {
                  const count = goats.filter((g) => g.area_id === pen.id).length;
                  const isEditing = editingPenId === pen.id;

                  return (
                    <div key={pen.id} className="pen-row-enter">
                      {isEditing ? (
                        /* INLINE EDIT FORM */
                        <div className="pen-form-enter" style={{ background: '#f0fdf4', border: '1.5px solid var(--primary-border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Editing Pen {pen.letter}</p>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Letter</label>
                              <input
                                type="text"
                                className="form-input"
                                value={editLetter}
                                onChange={(e) => setEditLetter(e.target.value.toUpperCase())}
                                placeholder="A"
                                maxLength={3}
                                style={{ textAlign: 'center', fontWeight: '900', fontSize: '15px', width: '68px' }}
                              />
                            </div>
                            <div className="form-group" style={{ margin: 0, flex: 1 }}>
                              <label className="form-label">Label / Description (optional)</label>
                              <input
                                type="text"
                                className="form-input"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="e.g. Nursery, Milking Goats..."
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(pen)} disabled={submitting}>
                              {submitting ? <Loader2 size={13} className="spinner" /> : 'Save Changes'}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingPenId(null)} disabled={submitting}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* PEN ROW CARD */
                        <div
                          style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            padding: '12px 14px',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {/* GREEN LETTER BADGE */}
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                              background: 'var(--primary-gradient)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '18px', fontWeight: '900', color: 'white',
                              boxShadow: '0 4px 10px -2px rgba(5,150,105,0.35)'
                            }}>
                              {pen.letter}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <strong style={{ fontSize: '14px', fontWeight: '800', display: 'block', lineHeight: 1.2 }}>
                                {pen.name}
                              </strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {count} {count === 1 ? 'goat' : 'goats'}
                                {pen.note && ` · ${pen.note}`}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button
                              onClick={() => handleStartEdit(pen)}
                              style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', padding: '7px', display: 'flex', alignItems: 'center' }}
                              title="Edit Pen"
                            >
                              <Pencil size={13} />
                            </button>
                            {pens.length > 1 && count === 0 && (
                              <button
                                onClick={() => setPenToDelete(pen)}
                                style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', padding: '7px', display: 'flex', alignItems: 'center' }}
                                title="Delete Pen"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ADD NEW PEN FORM (TOGGLE) */}
              {/* DIVIDER */}
              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              {showAddForm ? (
                <form onSubmit={handleAddPen} className="pen-form-enter" style={{ background: '#f0fdf4', border: '1.5px solid var(--primary-border)', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>New Barn Pen</p>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Letter</label>
                      <input
                        type="text"
                        className="form-input"
                        value={newLetter}
                        onChange={(e) => setNewLetter(e.target.value.toUpperCase())}
                        placeholder={String.fromCharCode(65 + pens.length)}
                        maxLength={3}
                        style={{ textAlign: 'center', fontWeight: '900', fontSize: '15px', width: '68px' }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1 }}>
                      <label className="form-label">Label / Description (optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="e.g. Nursery, Milking Goats..."
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                      {submitting ? <Loader2 size={13} className="spinner" /> : <><Plus size={13} /> Create Pen</>}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className="btn btn-outline btn-full"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus size={14} /> Add New Pen
                </button>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseManage}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVE GOAT MODAL */}
      {transferringGoat && (
        <div className="modal-overlay" onClick={() => setTransferringGoat(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '4px' }}>
              Move {transferringGoat.name} ({transferringGoat.tag_id})
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Select target pen:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {pens.map((pen) => (
                <button
                  key={pen.id}
                  className="btn btn-secondary"
                  style={{
                    padding: '12px',
                    borderColor: transferringGoat.area_id === pen.id ? 'var(--primary)' : 'var(--border-color)',
                    background: transferringGoat.area_id === pen.id ? 'var(--primary-light)' : '#ffffff'
                  }}
                  onClick={() => handleTransferSubmit(pen.id)}
                >
                  <span style={{ fontWeight: '800', fontSize: '16px' }}>Pen {pen.letter}</span>
                  {pen.name && pen.name !== `Pen ${pen.letter}` && (
                    <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>{pen.name}</span>
                  )}
                </button>
              ))}
            </div>

            <button className="btn btn-secondary btn-full" onClick={() => setTransferringGoat(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* DELETE PEN CONFIRMATION */}
      {penToDelete && (
        <DeleteConfirmModal
          title={`Delete Pen ${penToDelete.letter}`}
          message={`Are you sure you want to delete Pen ${penToDelete.letter} (${penToDelete.name})?`}
          onClose={() => setPenToDelete(null)}
          onConfirm={() => {
            if (onDeleteBarnArea) onDeleteBarnArea(penToDelete.id);
            setPenToDelete(null);
          }}
        />
      )}
    </div>
  );
}
