import React, { useState } from 'react';
import { Search, Plus, ArrowRightLeft, Pencil, Edit2, Trash2, X, Loader2, ChevronRight, Wheat, History } from 'lucide-react';
import GoatCard from '../components/GoatCard';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import PenFeedingFormModal from '../components/PenFeedingFormModal';
import PenFeedingHistoryModal from '../components/PenFeedingHistoryModal';

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

  // Feeding Modals State (Form vs History)
  const [showFeedingFormModal, setShowFeedingFormModal] = useState(false);
  const [showFeedingHistoryModal, setShowFeedingHistoryModal] = useState(false);
  const [editingPenFeeding, setEditingPenFeeding] = useState(null);

  // Inline Edit State inside manage modal
  const [editingPenId, setEditingPenId] = useState(null);
  const [editLetter, setEditLetter] = useState('');
  const [editName, setEditName] = useState('');

  // Add New Pen Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLetter, setNewLetter] = useState('');
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedPen = pens.find((p) => p.id === selectedPenId) || pens[0];

  const goatsInSelectedPen = goats.filter((g) => {
    const inPen = g.area_id === selectedPen.id;
    if (!searchTerm.trim()) return inPen;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      g.name.toLowerCase().includes(q) ||
      g.tag_id.toLowerCase().includes(q) ||
      g.breed.toLowerCase().includes(q);
    return inPen && matchesSearch;
  });

  const handleCloseManage = () => {
    setIsManageClosing(true);
    setTimeout(() => {
      setShowManageModal(false);
      setIsManageClosing(false);
      setEditingPenId(null);
      setShowAddForm(false);
    }, 220);
  };

  const handleStartEdit = (pen) => {
    setEditingPenId(pen.id);
    setEditLetter(pen.letter);
    setEditName(pen.name || `Pen ${pen.letter}`);
  };

  const handleSaveEdit = async (penId) => {
    setSubmitting(true);
    try {
      if (onUpdateBarnArea) {
        await onUpdateBarnArea(penId, {
          letter: editLetter.trim().toUpperCase(),
          name: editName.trim()
        });
      }
      setEditingPenId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFeedingInfo = async (penId, jsonString) => {
    if (onUpdateBarnArea) {
      const pen = pens.find((p) => p.id === penId);
      await onUpdateBarnArea(penId, {
        name: pen ? pen.name : 'Pen',
        feeding_info: jsonString
      });
    }
  };

  const handleAddPen = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (onAddBarnArea) {
        const letter = newLetter.trim().toUpperCase() || String.fromCharCode(65 + pens.length);
        await onAddBarnArea({
          letter,
          name: newNote.trim() || `Pen ${letter}`
        });
      }
      setNewLetter('');
      setNewNote('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (targetAreaId) => {
    if (!transferringGoat) return;
    try {
      if (onTransferGoatArea) {
        await onTransferGoatArea(transferringGoat.id, targetAreaId);
      }
      setTransferringGoat(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Outfit', sans-serif" }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}>Barn Pens & Feeding Rations</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
          Manage barn pen layouts, view custom food & weight rations, and move goats between areas.
        </p>
      </div>

      {/* BARN PEN CARDS GRID */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', fontFamily: "'Outfit', sans-serif" }}>Barn Pens ({pens.length})</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (onRequireAdmin) {
                onRequireAdmin(() => setShowManageModal(true));
              } else {
                setShowManageModal(true);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: "'Outfit', sans-serif" }}
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
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justify: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? 'var(--primary-glow)' : 'var(--shadow-sm)',
                  fontFamily: "'Outfit', sans-serif"
                }}
              >
                {/* BIG LETTER */}
                <span style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1', fontFamily: "'Outfit', sans-serif" }}>
                  {pen.letter}
                </span>

                {/* GOAT COUNT PILL */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    marginTop: '4px',
                    background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isSelected ? 'white' : 'var(--text-main)',
                    padding: '2px 9px',
                    borderRadius: '9999px',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                >
                  {penGoats.length} goats
                </span>

                {/* PEN NAME OR NOTE */}
                {pen.name && pen.name !== `Pen ${pen.letter}` && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      marginTop: '6px',
                      opacity: isSelected ? 0.95 : 0.8,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                      fontFamily: "'Outfit', sans-serif"
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

      {/* SEARCH BAR WITHIN SELECTED PEN */}
      <div className="search-input-wrapper">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="form-input"
          placeholder={`Search goats inside Pen ${selectedPen.letter}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ fontFamily: "'Outfit', sans-serif" }}
        />
      </div>

      {/* SELECTED PEN & GOATS DIRECTORY */}
      {selectedPen && (
        <div className="card" style={{ padding: '16px', fontFamily: "'Outfit', sans-serif" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                Pen {selectedPen.letter} {selectedPen.name && selectedPen.name !== `Pen ${selectedPen.letter}` ? `• ${selectedPen.name}` : ''}
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
                {goatsInSelectedPen.length} {goatsInSelectedPen.length === 1 ? 'goat' : 'goats'} inside pen
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const action = () => {
                    setEditingPenFeeding(selectedPen);
                    setShowFeedingFormModal(true);
                  };
                  if (onRequireAdmin) onRequireAdmin(action);
                  else action();
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800', fontFamily: "'Outfit', sans-serif", padding: '6px 10px' }}
              >
                <Wheat size={13} color="var(--primary)" /> Change Feed
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditingPenFeeding(selectedPen);
                  setShowFeedingHistoryModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '800', fontFamily: "'Outfit', sans-serif", padding: '6px 10px' }}
              >
                <History size={13} color="var(--primary)" /> Feed History
              </button>

              <button className="btn btn-outline btn-sm" onClick={onOpenAddGoat} style={{ fontSize: '11px', fontFamily: "'Outfit', sans-serif", padding: '6px 10px' }}>
                <Plus size={13} /> Register Goat
              </button>
            </div>
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

      {/* CHANGE FEED FORM MODAL */}
      {showFeedingFormModal && editingPenFeeding && (
        <PenFeedingFormModal
          pen={editingPenFeeding}
          onClose={() => {
            setShowFeedingFormModal(false);
            setEditingPenFeeding(null);
          }}
          onSave={handleSaveFeedingInfo}
        />
      )}

      {/* FEEDING HISTORY MODAL */}
      {showFeedingHistoryModal && editingPenFeeding && (
        <PenFeedingHistoryModal
          pen={editingPenFeeding}
          onClose={() => {
            setShowFeedingHistoryModal(false);
            setEditingPenFeeding(null);
          }}
          onOpenEditForm={(pen) => {
            setShowFeedingHistoryModal(false);
            setEditingPenFeeding(pen);
            const action = () => setShowFeedingFormModal(true);
            if (onRequireAdmin) onRequireAdmin(action);
            else action();
          }}
        />
      )}

      {/* MANAGE PENS MODAL (ADD / REMOVE / RENAME) */}
      {showManageModal && (
        <div className={`modal-overlay ${isManageClosing ? 'closing' : ''}`} onClick={handleCloseManage}>
          <div
            className={`modal-content ${isManageClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', fontFamily: "'Outfit', sans-serif" }}
          >
            <div className="modal-header">
              <h3 className="modal-title">Manage Barn Pens</h3>
              <button className="close-btn" onClick={handleCloseManage}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Customize your barn layout. Edit pen names or add new pens.
              </p>

              {/* LIST OF PENS WITH INLINE EDIT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                {pens.map((pen) => {
                  const count = goats.filter((g) => g.area_id === pen.id).length;
                  const isEditing = editingPenId === pen.id;

                  return (
                    <div
                      key={pen.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '10px 12px'
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editLetter}
                              onChange={(e) => setEditLetter(e.target.value.toUpperCase())}
                              placeholder="Pen Letter (e.g. A)"
                              maxLength={3}
                              style={{ width: '60px', textAlign: 'center', fontWeight: '800' }}
                            />
                            <input
                              type="text"
                              className="form-input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Pen Name (e.g. Nursery)"
                              style={{ flex: 1 }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => setEditingPenId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              onClick={() => handleSaveEdit(pen.id)}
                              disabled={submitting}
                            >
                              {submitting ? <Loader2 size={12} className="spinner" /> : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '10px',
                              background: 'var(--primary-gradient)', display: 'grid', placeItems: 'center',
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

              {/* ADD NEW PEN FORM */}
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

      {/* DELETE PEN CONFIRM MODAL */}
      {penToDelete && (
        <DeleteConfirmModal
          title="Delete Barn Pen"
          message={`Are you sure you want to delete Pen ${penToDelete.letter} (${penToDelete.name})?`}
          onClose={() => setPenToDelete(null)}
          onConfirm={async () => {
            if (onDeleteBarnArea) {
              await onDeleteBarnArea(penToDelete.id);
            }
            setPenToDelete(null);
          }}
        />
      )}
    </div>
  );
}
