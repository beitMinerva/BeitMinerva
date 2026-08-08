import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import GoatDetailModal from './components/GoatDetailModal';
import AddGoatModal from './components/AddGoatModal';
import AddEventModal from './components/AddEventModal';
import AdminLoginModal from './components/AdminLoginModal';
import { supabase } from './config/supabase';

import BarnSquareView from './views/BarnSquareView';
import ScannerView from './views/ScannerView';
import CalendarView from './views/CalendarView';
import GoatsView from './views/GoatsView';
import SettingsView from './views/SettingsView';

import {
  getGoats,
  getBarnAreas,
  getTimelineEvents,
  getGoatByTagOrId,
  addGoat,
  updateGoat,
  deleteGoat,
  updateGoatArea,
  addBarnArea,
  updateBarnArea,
  deleteBarnArea,
  addTimelineEvent,
  addBatchTimelineEvents,
  updateTimelineEvent,
  deleteTimelineEvent
} from './services/goatService';

export default function App() {
  const [session, setSession] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('barn');
  const [goats, setGoats] = useState([]);
  const [barnAreas, setBarnAreas] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [selectedGoatEvents, setSelectedGoatEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    showToast('Signed out. You are now in Guest (read-only) mode.');
  };

  const requireAdmin = (actionFn) => {
    if (!session) {
      showToast('🔒 Please sign in as Admin to perform this action.');
      setShowLoginModal(true);
      return false;
    }
    actionFn();
    return true;
  };

  // Modals
  const [selectedGoat, setSelectedGoat] = useState(null);
  const [showAddGoatModal, setShowAddGoatModal] = useState(false);
  const [goatToEdit, setGoatToEdit] = useState(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [goatForEvent, setGoatForEvent] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    try {
      const [goatsData, areasData, eventsData] = await Promise.all([
        getGoats(),
        getBarnAreas(),
        getTimelineEvents()
      ]);
      setGoats(goatsData);
      setBarnAreas(areasData);
      setRecentEvents(eventsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGoat) {
      getTimelineEvents(selectedGoat.id).then((events) => {
        setSelectedGoatEvents(events);
      });
    }
  }, [selectedGoat]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleScanSuccess = async (scannedCode) => {
    const foundGoat = await getGoatByTagOrId(scannedCode);
    if (foundGoat) {
      setSelectedGoat(foundGoat);
      showToast(`Tag ${foundGoat.tag_id} scanned. Opened profile for ${foundGoat.name}.`);
    } else {
      showToast(`Tag "${scannedCode}" not found. Registering as new goat.`);
      setGoatToEdit({ tag_id: scannedCode });
      setShowAddGoatModal(true);
    }
  };

  const handleSaveGoat = async (goatData) => {
    try {
      if (goatToEdit && goatToEdit.id) {
        const updated = await updateGoat(goatToEdit.id, goatData);
        showToast(`Updated goat ${updated.name} (${updated.tag_id}).`);
        if (selectedGoat && selectedGoat.id === updated.id) setSelectedGoat(updated);
      } else {
        const created = await addGoat(goatData);
        showToast(`Registered new goat ${created.name} (${created.tag_id}).`);
        setSelectedGoat(created);
      }
      await loadData();
      setShowAddGoatModal(false);
      setGoatToEdit(null);
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    }
  };

  const handleDeleteGoat = async (goatId) => {
    try {
      await deleteGoat(goatId);
      showToast('Deleted goat record.');
      setSelectedGoat(null);
      await loadData();
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
    }
  };

  const handleAddBarnArea = async (areaData) => {
    try {
      const created = await addBarnArea(areaData);
      showToast(`Created Pen ${created.letter}.`);
      await loadData();
    } catch (err) { showToast(`❌ Error: ${err.message}`); }
  };

  const handleUpdateBarnArea = async (id, updates) => {
    try {
      await updateBarnArea(id, updates);
      showToast('Pen updated.');
      await loadData();
    } catch (err) { showToast(`❌ Error: ${err.message}`); }
  };

  const handleDeleteBarnArea = async (id) => {
    try {
      await deleteBarnArea(id);
      showToast('Pen deleted.');
      await loadData();
    } catch (err) { showToast(`❌ Error: ${err.message}`); }
  };

  const handleSaveEvent = async (eventData) => {
    try {
      if (Array.isArray(eventData)) {
        await addBatchTimelineEvents(eventData);
        showToast(`Logged event for ${eventData.length} goats.`);
      } else {
        await addTimelineEvent(eventData);
        showToast(`Logged ${eventData.type} event.`);
      }
      await loadData();
      if (selectedGoat) {
        const updatedEvents = await getTimelineEvents(selectedGoat.id);
        setSelectedGoatEvents(updatedEvents);
      }
    } catch (err) { showToast(`❌ Error: ${err.message}`); }
  };

  const handleUpdateEvent = async (eventId, updates) => {
    try {
      await updateTimelineEvent(eventId, updates);
      showToast('Updated task reminder.');
      await loadData();
      if (selectedGoat) {
        const updatedEvents = await getTimelineEvents(selectedGoat.id);
        setSelectedGoatEvents(updatedEvents);
      }
    } catch (err) { showToast(`❌ Error: ${err.message}`); }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteTimelineEvent(eventId);
      showToast('Deleted timeline entry.');
      await loadData();
      if (selectedGoat) {
        const updatedEvents = await getTimelineEvents(selectedGoat.id);
        setSelectedGoatEvents(updatedEvents);
      }
    } catch (err) { showToast(`❌ Error: ${err.message}`); }
  };

  const handleTransferGoatArea = async (goatId, newAreaId, sourceAreaName, targetAreaName) => {
    const updated = await updateGoatArea(goatId, newAreaId, sourceAreaName, targetAreaName);
    showToast(`Moved ${updated.name} to ${targetAreaName}.`);
    await loadData();
    if (selectedGoat && selectedGoat.id === goatId) {
      setSelectedGoat(updated);
    }
  };

  return (
    <div className="app-container">
      {/* Beit Minerva Header */}
      <Header
        onOpenScanner={() => setActiveTab('scanner')}
        onOpenAddGoat={() => requireAdmin(() => {
          setGoatToEdit(null);
          setShowAddGoatModal(true);
        })}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: '600',
            zIndex: 100,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Page Content View Router */}
      <main className="main-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            Loading Beit Minerva records...
          </div>
        ) : (
          <>
            {activeTab === 'barn' && (
              <BarnSquareView
                goats={goats}
                barnAreas={barnAreas}
                onRequireAdmin={requireAdmin}
                onSelectGoat={(g) => setSelectedGoat(g)}
                onOpenAddGoat={() => requireAdmin(() => {
                  setGoatToEdit(null);
                  setShowAddGoatModal(true);
                })}
                onTransferGoatArea={handleTransferGoatArea}
                onAddBarnArea={handleAddBarnArea}
                onUpdateBarnArea={handleUpdateBarnArea}
                onDeleteBarnArea={handleDeleteBarnArea}
              />
            )}

            {activeTab === 'scanner' && (
              <ScannerView onScanSuccess={handleScanSuccess} />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                goats={goats}
                events={recentEvents}
                barnAreas={barnAreas}
                onRequireAdmin={requireAdmin}
                onAddTimelineEvent={handleSaveEvent}
                onUpdateTimelineEvent={handleUpdateEvent}
                onDeleteTimelineEvent={handleDeleteEvent}
              />
            )}

            {activeTab === 'goats' && (
              <GoatsView
                goats={goats}
                barnAreas={barnAreas}
                onSelectGoat={(g) => setSelectedGoat(g)}
                onOpenAddGoat={() => requireAdmin(() => {
                  setGoatToEdit(null);
                  setShowAddGoatModal(true);
                })}
                onOpenLogEvent={() => requireAdmin(() => {
                  setGoatForEvent(null);
                  setShowAddEventModal(true);
                })}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                goats={goats}
                session={session}
                onOpenLogin={() => setShowLoginModal(true)}
                onSignOut={handleSignOut}
              />
            )}
          </>
        )}
      </main>

      {/* Page Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Goat Full Page Profile & Timeline View */}
      {selectedGoat && (
        <GoatDetailModal
          goat={selectedGoat}
          barnAreas={barnAreas}
          events={selectedGoatEvents}
          onClose={() => setSelectedGoat(null)}
          onEdit={(g) => requireAdmin(() => {
            setGoatToEdit(g);
            setShowAddGoatModal(true);
          })}
          onAddEvent={(g) => requireAdmin(() => {
            setGoatForEvent(g);
            setShowAddEventModal(true);
          })}
          onSaveReminder={handleSaveEvent}
          onTransferArea={(g) => {
            setActiveTab('barn');
            setSelectedGoat(null);
          }}
          onDeleteEvent={handleDeleteEvent}
          onDeleteGoat={(id) => requireAdmin(() => handleDeleteGoat(id))}
        />
      )}

      {/* Add / Edit Goat Modal */}
      {showAddGoatModal && (
        <AddGoatModal
          goatToEdit={goatToEdit}
          barnAreas={barnAreas}
          onClose={() => {
            setShowAddGoatModal(false);
            setGoatToEdit(null);
          }}
          onSave={handleSaveGoat}
        />
      )}

      {/* Add Timeline Event Modal */}
      {showAddEventModal && (
        <AddEventModal
          goat={goatForEvent}
          goats={goats}
          barnAreas={barnAreas}
          onClose={() => {
            setShowAddEventModal(false);
            setGoatForEvent(null);
          }}
          onSave={handleSaveEvent}
        />
      )}

      {/* Admin Login Modal */}
      {showLoginModal && (
        <AdminLoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={(s) => {
            setSession(s);
            showToast('✅ Signed in as Admin. Full edit access granted.');
          }}
        />
      )}
    </div>
  );
}
