import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import GoatDetailModal from './components/GoatDetailModal';
import AddGoatModal from './components/AddGoatModal';
import AddEventModal from './components/AddEventModal';
import AdminLoginModal from './components/AdminLoginModal';
import FarmAnalyticsModal from './components/FarmAnalyticsModal';
import { supabase } from './config/supabase';

import BarnSquareView from './views/BarnSquareView';
import ScannerView from './views/ScannerView';
import CalendarView from './views/CalendarView';
import GoatsView from './views/GoatsView';
import SettingsView from './views/SettingsView';
import { checkUpcomingTasksAndNotify } from './services/notificationService';

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
  getPenMilkEntries,
  addPenMilkEntry,
  updatePenMilkEntry,
  deletePenMilkEntry,
  getPenFeedingEntries,
  addPenFeedingEntry,
  updatePenFeedingEntry,
  deletePenFeedingEntry,
  addTimelineEvent,
  addBatchTimelineEvents,
  updateTimelineEvent,
  deleteTimelineEvent,
  calculateNextDueDate
} from './services/goatService';

export default function App() {
  const [session, setSession] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('barn');
  const [goats, setGoats] = useState([]);
  const [barnAreas, setBarnAreas] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [penMilkEntries, setPenMilkEntries] = useState([]);
  const [penFeedingEntries, setPenFeedingEntries] = useState([]);
  const [selectedPenForNewGoat, setSelectedPenForNewGoat] = useState(null);
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
  const [initialAddEventMode, setInitialAddEventMode] = useState('LOG');
  const [initialAddEventDate, setInitialAddEventDate] = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    try {
      const [goatsData, areasData, eventsData, milkEntriesData, feedingEntriesData] = await Promise.all([
        getGoats(),
        getBarnAreas(),
        getTimelineEvents(),
        getPenMilkEntries(),
        getPenFeedingEntries()
      ]);
      setGoats(goatsData);
      setBarnAreas(areasData);
      setRecentEvents(eventsData);
      setPenMilkEntries(milkEntriesData);
      setPenFeedingEntries(feedingEntriesData);

      // Check for due tasks & send Web Push Notifications
      checkUpcomingTasksAndNotify(eventsData, goatsData);
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

  const handleSavePenMilkEntry = async (param1, param2, param3 = null) => {
    try {
      let barnAreaId, milkEntry, entryId;
      if (typeof param1 === 'object' && param1 !== null && !param2) {
        milkEntry = param1;
        barnAreaId = param1.barn_area_id || param1.area_id;
        entryId = param1.id;
      } else {
        barnAreaId = param1;
        milkEntry = param2 || {};
        entryId = param3;
      }

      const amountLiters = Number(milkEntry.amount_liters ?? milkEntry.milk_liters ?? milkEntry.amount) || 0;

      if (entryId) {
        const updated = await updatePenMilkEntry(entryId, {
          date: milkEntry.date || new Date().toISOString(),
          amount_liters: amountLiters,
          notes: milkEntry.notes || ''
        });
        setPenMilkEntries((prev) => prev.map((item) => (item.id === entryId ? updated : item)));
        showToast('Updated pen milk entry.');
        return updated;
      }

      const created = await addPenMilkEntry({
        barn_area_id: barnAreaId,
        date: milkEntry.date || new Date().toISOString(),
        amount_liters: amountLiters,
        notes: milkEntry.notes || ''
      });
      setPenMilkEntries((prev) => [created, ...prev]);
      showToast(`Saved pen milk entry (${amountLiters.toFixed(1)} L).`);
      return created;
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
      throw err;
    }
  };

  const handleDeletePenMilkEntry = async (entryId) => {
    try {
      await deletePenMilkEntry(entryId);
      setPenMilkEntries((prev) => prev.filter((item) => item.id !== entryId));
      showToast('Deleted pen milk entry.');
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
      throw err;
    }
  };

  const handleSavePenFeedingEntry = async (param1, param2, param3 = null) => {
    try {
      let barnAreaId, feedingData, entryId;
      if (typeof param1 === 'object' && param1 !== null && !param2) {
        feedingData = param1;
        barnAreaId = param1.barn_area_id || param1.area_id;
        entryId = param1.id;
      } else {
        barnAreaId = param1;
        feedingData = param2 || {};
        entryId = param3;
      }

      if (entryId) {
        const updated = await updatePenFeedingEntry(entryId, {
          food_type: feedingData.food_type || '',
          daily_weight: Number(feedingData.daily_weight) || 0,
          composition: feedingData.composition || '',
          schedule: feedingData.schedule || '',
          notes: feedingData.notes || ''
        });
        setPenFeedingEntries((prev) => prev.map((item) => (item.id === entryId ? updated : item)));
        showToast('Updated pen feeding entry.');
        return updated;
      }

      const created = await addPenFeedingEntry({
        barn_area_id: barnAreaId,
        date: feedingData.date || new Date().toISOString(),
        ...feedingData
      });
      setPenFeedingEntries((prev) => [created, ...prev]);
      showToast('Saved pen feeding entry.');
      return created;
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
      throw err;
    }
  };

  const handleDeletePenFeedingEntry = async (entryId) => {
    try {
      await deletePenFeedingEntry(entryId);
      setPenFeedingEntries((prev) => prev.filter((item) => item.id !== entryId));
      showToast('Deleted pen feeding entry.');
    } catch (err) {
      showToast(`❌ Error: ${err.message}`);
      throw err;
    }
  };

  const [taskToComplete, setTaskToComplete] = useState(null);

  const handleSaveEvent = async (eventData) => {
    try {
      if (Array.isArray(eventData)) {
        await addBatchTimelineEvents(eventData);
        showToast(`Logged event for ${eventData.length} goats.`);
      } else {
        await addTimelineEvent(eventData);
        showToast(`Logged ${eventData.type} event.`);
      }

      // If completing an active scheduled task
      if (taskToComplete) {
        let frequency = 'none';
        let days = 21;
        if (typeof taskToComplete.custom_fields === 'object' && taskToComplete.custom_fields) {
          frequency = taskToComplete.custom_fields.repeat_frequency || 'none';
          days = parseInt(taskToComplete.custom_fields.custom_repeat_days) || 21;
        } else if (typeof taskToComplete.custom_fields === 'string') {
          try {
            const parsed = JSON.parse(taskToComplete.custom_fields);
            if (parsed) {
              frequency = parsed.repeat_frequency || 'none';
              days = parseInt(parsed.custom_repeat_days) || 21;
            }
          } catch (e) {}
        } else if (taskToComplete.repeat_frequency) {
          frequency = taskToComplete.repeat_frequency;
        }

        if (frequency && frequency !== 'none') {
          const actualCompletionDate = (Array.isArray(eventData) ? eventData[0]?.date : eventData?.date) || new Date().toISOString();
          const nextDueDate = calculateNextDueDate(actualCompletionDate, frequency, days);
          await updateTimelineEvent(taskToComplete.id, {
            date: nextDueDate,
            status: 'pending',
            is_scheduled: true
          });
          const nextDateStr = new Date(nextDueDate).toLocaleDateString();
          showToast(`✅ Event logged to history! Next reminder scheduled for ${nextDateStr}.`);
        } else {
          await updateTimelineEvent(taskToComplete.id, {
            status: 'completed',
            is_scheduled: false
          });
          showToast(`✅ Event logged to history & task completed.`);
        }
        setTaskToComplete(null);
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
    } catch (err) { showToast(`Error: ${err.message}`); }
  };

  const handleCompleteTask = (reminder) => {
    setTaskToComplete(reminder);
    if (reminder.goat_id && reminder.goat_id !== 'herd' && !reminder.goat_id.startsWith('pen-')) {
      const g = goats.find((item) => item.id === reminder.goat_id);
      if (g) setGoatForEvent(g);
    } else {
      setGoatForEvent(null);
    }
    setShowAddEventModal(true);
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
        onOpenAddGoat={(penId) => requireAdmin(() => {
          setSelectedPenForNewGoat(penId || null);
          setGoatToEdit(null);
          setShowAddGoatModal(true);
        })}
        showToast={showToast}
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
                events={recentEvents}
                penMilkEntries={penMilkEntries}
                penFeedingEntries={penFeedingEntries}
                onRequireAdmin={requireAdmin}
                onSelectGoat={(g) => setSelectedGoat(g)}
                onOpenAddGoat={(penId) => requireAdmin(() => {
                  setSelectedPenForNewGoat(penId || null);
                  setGoatToEdit(null);
                  setShowAddGoatModal(true);
                })}
                onTransferGoatArea={(goatId, newAreaId) => requireAdmin(() => handleTransferGoatArea(goatId, newAreaId))}
                onAddBarnArea={(newArea) => requireAdmin(() => handleAddBarnArea(newArea))}
                onUpdateBarnArea={(areaId, updates) => requireAdmin(() => handleUpdateBarnArea(areaId, updates))}
                onDeleteBarnArea={(areaId) => requireAdmin(() => handleDeleteBarnArea(areaId))}
                onSavePenMilkEntry={(p1, p2, p3) => requireAdmin(() => handleSavePenMilkEntry(p1, p2, p3))}
                onDeletePenMilkEntry={(entryId) => requireAdmin(() => handleDeletePenMilkEntry(entryId))}
                onSavePenFeedingEntry={(p1, p2, p3) => requireAdmin(() => handleSavePenFeedingEntry(p1, p2, p3))}
                onDeletePenFeedingEntry={(entryId) => requireAdmin(() => handleDeletePenFeedingEntry(entryId))}
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
                onAddTimelineEvent={(eventData) => requireAdmin(() => handleSaveEvent(eventData))}
                onUpdateTimelineEvent={(eventId, updates) => requireAdmin(() => handleUpdateEvent(eventId, updates))}
                onDeleteTimelineEvent={(eventId) => requireAdmin(() => handleDeleteEvent(eventId))}
                onCompleteTimelineEvent={(reminder) => requireAdmin(() => handleCompleteTask(reminder))}
                onOpenAddEvent={(dateStr) => requireAdmin(() => {
                  setGoatForEvent(null);
                  setTaskToComplete(null);
                  setInitialAddEventDate(dateStr || null);
                  setInitialAddEventMode('SCHEDULE');
                  setShowAddEventModal(true);
                })}
              />
            )}

            {activeTab === 'goats' && (
              <GoatsView
                goats={goats}
                barnAreas={barnAreas}
                onSelectGoat={(g) => setSelectedGoat(g)}
                onOpenAddGoat={(penId) => requireAdmin(() => {
                  setSelectedPenForNewGoat(penId || null);
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
                barnAreas={barnAreas}
                session={session}
                onOpenLogin={() => setShowLoginModal(true)}
                onSignOut={handleSignOut}
                onOpenAnalytics={() => setShowAnalyticsModal(true)}
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
          allEvents={recentEvents}
          onClose={() => setSelectedGoat(null)}
          onEdit={(g) => requireAdmin(() => {
            setGoatToEdit(g);
            setShowAddGoatModal(true);
          })}
          onAddEvent={(g) => requireAdmin(() => {
            setGoatForEvent(g);
            setShowAddEventModal(true);
          })}
          onSaveReminder={(eventData) => requireAdmin(() => handleSaveEvent(eventData))}
          onTransferArea={(g) => {
            setActiveTab('barn');
            setSelectedGoat(null);
          }}
          onUpdateEvent={(eventId, updates) => requireAdmin(() => handleUpdateEvent(eventId, updates))}
          onDeleteEvent={(eventId) => requireAdmin(() => handleDeleteEvent(eventId))}
          onDeleteGoat={(id) => requireAdmin(() => handleDeleteGoat(id))}
          onCompleteTask={(reminder) => requireAdmin(() => handleCompleteTask(reminder))}
        />
      )}

      {/* Add / Edit Goat Modal */}
      {showAddGoatModal && (
        <AddGoatModal
          goatToEdit={goatToEdit}
          barnAreas={barnAreas}
          initialPenId={selectedPenForNewGoat}
          onClose={() => {
            setShowAddGoatModal(false);
            setGoatToEdit(null);
            setSelectedPenForNewGoat(null);
          }}
          onSave={(goatData) => requireAdmin(() => handleSaveGoat(goatData))}
        />
      )}

      {/* Add Timeline Event Modal */}
      {showAddEventModal && (
        <AddEventModal
          goat={goatForEvent}
          goats={goats}
          barnAreas={barnAreas}
          taskToComplete={taskToComplete}
          initialMode={initialAddEventMode}
          initialDate={initialAddEventDate}
          onClose={() => {
            setShowAddEventModal(false);
            setGoatForEvent(null);
            setTaskToComplete(null);
            setInitialAddEventMode('LOG');
            setInitialAddEventDate(null);
          }}
          onSave={(eventData) => requireAdmin(() => handleSaveEvent(eventData))}
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

      {/* Farm Business Analytics & Smart Metrics Modal */}
      {showAnalyticsModal && (
        <FarmAnalyticsModal
          goats={goats}
          barnAreas={barnAreas}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </div>
  );
}
