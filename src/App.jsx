import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import GoatDetailModal from './components/GoatDetailModal';
import AddGoatModal from './components/AddGoatModal';
import AddEventModal from './components/AddEventModal';

import BarnSquareView from './views/BarnSquareView';
import ScannerView from './views/ScannerView';
import CalendarView from './views/CalendarView';
import GoatsView from './views/GoatsView';

import {
  getGoats,
  getBarnAreas,
  getTimelineEvents,
  getGoatByTagOrId,
  addGoat,
  updateGoat,
  updateGoatArea,
  addTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent
} from './services/goatService';

export default function App() {
  const [activeTab, setActiveTab] = useState('barn');
  const [goats, setGoats] = useState([]);
  const [barnAreas, setBarnAreas] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [selectedGoatEvents, setSelectedGoatEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
    if (goatToEdit && goatToEdit.id) {
      const updated = await updateGoat(goatToEdit.id, goatData);
      showToast(`Updated goat ${updated.name} (${updated.tag_id}).`);
      if (selectedGoat && selectedGoat.id === updated.id) {
        setSelectedGoat(updated);
      }
    } else {
      const created = await addGoat(goatData);
      showToast(`Registered new goat ${created.name} (${created.tag_id}).`);
      setSelectedGoat(created);
    }
    await loadData();
    setShowAddGoatModal(false);
    setGoatToEdit(null);
  };

  const handleSaveEvent = async (eventData) => {
    await addTimelineEvent(eventData);
    showToast(`Logged ${eventData.type} event.`);
    await loadData();
    if (selectedGoat) {
      const updatedEvents = await getTimelineEvents(selectedGoat.id);
      setSelectedGoatEvents(updatedEvents);
    }
  };

  const handleUpdateEvent = async (eventId, updates) => {
    await updateTimelineEvent(eventId, updates);
    showToast('Updated task reminder.');
    await loadData();
    if (selectedGoat) {
      const updatedEvents = await getTimelineEvents(selectedGoat.id);
      setSelectedGoatEvents(updatedEvents);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    await deleteTimelineEvent(eventId);
    showToast('Deleted timeline entry.');
    await loadData();
    if (selectedGoat) {
      const updatedEvents = await getTimelineEvents(selectedGoat.id);
      setSelectedGoatEvents(updatedEvents);
    }
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
        onOpenAddGoat={() => {
          setGoatToEdit(null);
          setShowAddGoatModal(true);
        }}
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
                onSelectGoat={(g) => setSelectedGoat(g)}
                onOpenAddGoat={() => {
                  setGoatToEdit(null);
                  setShowAddGoatModal(true);
                }}
                onTransferGoatArea={handleTransferGoatArea}
              />
            )}

            {activeTab === 'scanner' && (
              <ScannerView onScanSuccess={handleScanSuccess} />
            )}

            {activeTab === 'calendar' && (
              <CalendarView
                goats={goats}
                events={recentEvents}
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
                onOpenAddGoat={() => {
                  setGoatToEdit(null);
                  setShowAddGoatModal(true);
                }}
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
          onEdit={(g) => {
            setGoatToEdit(g);
            setShowAddGoatModal(true);
          }}
          onAddEvent={(g) => {
            setGoatForEvent(g);
            setShowAddEventModal(true);
          }}
          onSaveReminder={handleSaveEvent}
          onTransferArea={(g) => {
            setActiveTab('barn');
            setSelectedGoat(null);
          }}
          onDeleteEvent={handleDeleteEvent}
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
      {showAddEventModal && goatForEvent && (
        <AddEventModal
          goat={goatForEvent}
          onClose={() => {
            setShowAddEventModal(false);
            setGoatForEvent(null);
          }}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
