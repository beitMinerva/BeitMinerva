import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import BarcodeSVG from './BarcodeSVG';
import DeleteConfirmModal from './DeleteConfirmModal';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../config/supabase';

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
  const [photoUrl, setPhotoUrl] = useState(goatToEdit?.photo_url || '');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [showRemovePhotoModal, setShowRemovePhotoModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const breeds = ['Alpine', 'Boer', 'Nubian', 'Saanen', 'Nigerian Dwarf', 'Kiko', 'Pygmy', 'Toggenburg', 'Crossbreed'];
  const statuses = ['Healthy', 'Under Treatment', 'Pregnant', 'Dry', 'Quarantine', 'Sold'];

  const getStoragePathFromUrl = (url) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0] === 'storage' && pathParts[1] === 'v1') {
        return decodeURIComponent(pathParts.slice(3).join('/'));
      }
      return decodeURIComponent(pathParts.slice(1).join('/'));
    } catch (err) {
      return null;
    }
  };

  const compressImageFile = async (file, options = {}) => {
    const maxSizeMB = options.maxSizeMB ?? 3;
    const maxWidth = options.maxWidth ?? 1400;
    const initialQuality = options.quality ?? 0.82;

    if (!file) return file;

    const imageOptions = {
      maxSizeMB,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
      initialQuality,
      fileType: 'image/jpeg',
      maxIteration: 8
    };

    try {
      const compressed = await imageCompression(file, imageOptions);
      return compressed;
    } catch (err) {
      console.error('Image compression failed:', err);
      return file;
    }
  };

  const uploadPhotoToStorage = async (file) => {
    if (!file) {
      return photoUrl || null;
    }

    const processedFile = await compressImageFile(file, { maxSizeMB: 3, maxWidth: 1400, quality: 0.82 });
    const bucketName = 'goat-photos';
    const safeTag = (tagId || goatToEdit?.tag_id || name || 'goat')
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .toLowerCase()
      .slice(0, 40) || 'goat';
    const extension = (processedFile.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${safeTag}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, processedFile, {
      cacheControl: '3600',
      upsert: true,
      contentType: processedFile.type || 'image/jpeg'
    });

    if (uploadError) {
      if (uploadError.message && uploadError.message.toLowerCase().includes('not found')) {
        throw new Error('The goat-photos storage bucket does not exist yet in Supabase Storage. Create a public bucket named "goat-photos" first.');
      }
      throw new Error(uploadError.message || 'Failed to upload goat photo.');
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    return publicUrlData?.publicUrl || null;
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processedFile = await compressImageFile(file, { maxSizeMB: 3, maxWidth: 1400, quality: 0.82 });
    setSelectedPhotoFile(processedFile);
    const previewUrl = URL.createObjectURL(processedFile);
    setPhotoUrl(previewUrl);
  };

  const handleRemovePhoto = () => {
    setSelectedPhotoFile(null);
    setPhotoUrl('');
    setShowRemovePhotoModal(false);
  };

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
      let finalPhotoUrl = photoUrl || null;

      if (selectedPhotoFile) {
        if (goatToEdit?.photo_url) {
          const oldPhotoPath = getStoragePathFromUrl(goatToEdit.photo_url);
          if (oldPhotoPath) {
            await supabase.storage.from('goat-photos').remove([oldPhotoPath]).catch(() => {});
          }
        }

        finalPhotoUrl = await uploadPhotoToStorage(selectedPhotoFile);
      }

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
        notes: notes.trim(),
        photo_url: finalPhotoUrl || null
      });
      handleAnimatedClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save goat photo.');
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
            <div className="card" style={{ padding: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', overflow: 'hidden', background: '#e2e8f0', border: '1px solid var(--border-color)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {photoUrl ? (
                  <img src={photoUrl} alt={name || 'Goat'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '20px', fontWeight: '800', color: '#475569' }}>{(name || 'G').charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px' }}>GOAT PHOTO</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label htmlFor="goat-photo-upload" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '102px', height: '30px', padding: '6px 10px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary-dark)', border: '1px solid var(--primary-border)', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                    {photoUrl ? 'Replace Photo' : 'Upload Photo'}
                  </label>
                  <input id="goat-photo-upload" type="file" accept="image/*" hidden onChange={handlePhotoChange} />
                  {photoUrl && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRemovePhotoModal(true)} style={{ minWidth: '94px', height: '30px', fontSize: '11px', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderColor: '#fecaca', color: '#b91c1c', background: '#fff1f2' }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

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

        {showRemovePhotoModal && (
          <DeleteConfirmModal
            title="Remove Photo"
            message="Are you sure you want to remove this goat photo?"
            onClose={() => setShowRemovePhotoModal(false)}
            onConfirm={handleRemovePhoto}
          />
        )}
      </div>
    </div>
  );
}
