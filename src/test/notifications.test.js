import { describe, it, expect } from 'vitest';
import { generateDynamicFarmAlerts } from '../services/notificationService';

describe('Dynamic Farm Notification & Alert System', () => {
  const sampleGoats = [
    { id: 'goat-1', name: 'Bella', tag_number: '101', gender: 'Doe', status: 'Healthy', barn_area: 'A', barn_area_id: 'pen-a' },
    { id: 'goat-2', name: 'Daisy', tag_number: '102', gender: 'Doe', status: 'Sick', barn_area: 'B', barn_area_id: 'pen-b' },
    { id: 'goat-3', name: 'Thor', tag_number: '103', gender: 'Buck', status: 'Healthy', barn_area: 'C', barn_area_id: 'pen-c' },
  ];

  const sampleBarnAreas = [
    { id: 'pen-a', letter: 'A', name: 'Pen A' },
    { id: 'pen-b', letter: 'B', name: 'Pen B' },
    { id: 'pen-c', letter: 'C', name: 'Pen C' },
  ];

  it('correctly identifies overdue and due-today tasks', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const events = [
      {
        id: 'ev-1',
        title: 'Scheduled: CDT Booster',
        date: `${yesterdayStr}T10:00:00Z`,
        goat_id: 'goat-1',
        is_scheduled: true,
        status: 'pending'
      },
      {
        id: 'ev-2',
        title: 'Scheduled: Deworming',
        date: `${todayStr}T09:00:00Z`,
        goat_id: 'goat-2',
        is_scheduled: true,
        status: 'pending'
      },
      {
        id: 'ev-3',
        title: 'Scheduled: Completed Task',
        date: `${yesterdayStr}T10:00:00Z`,
        goat_id: 'goat-1',
        is_scheduled: true,
        status: 'completed'
      }
    ];

    const alerts = generateDynamicFarmAlerts({
      events,
      goats: sampleGoats,
      barnAreas: sampleBarnAreas
    });

    const overdue = alerts.find(a => a.type === 'OVERDUE_TASK');
    const today = alerts.find(a => a.type === 'TODAY_TASK');

    expect(overdue).toBeDefined();
    expect(overdue.severity).toBe('urgent');
    expect(overdue.targetName).toBe('Bella');

    expect(today).toBeDefined();
    expect(today.severity).toBe('warning');
    expect(today.targetName).toBe('Daisy');

    // Completed task should not produce an alert
    expect(alerts.some(a => a.id === 'task-ev-3')).toBe(false);
  });

  it('triggers sick watchlist alert for sick or quarantined goats', () => {
    const alerts = generateDynamicFarmAlerts({
      events: [],
      goats: sampleGoats,
      barnAreas: sampleBarnAreas
    });

    const sickAlert = alerts.find(a => a.type === 'SICK_WATCHLIST');
    expect(sickAlert).toBeDefined();
    expect(sickAlert.goatId).toBe('goat-2');
    expect(sickAlert.targetName).toBe('Daisy');
  });

  it('calculates gestation and detects approaching kidding within 7 days', () => {
    // Mating occurred 146 days ago -> Expected kidding in 4 days (within 7 days window)
    const matingDate = new Date(Date.now() - 146 * 24 * 60 * 60 * 1000).toISOString();

    const events = [
      {
        id: 'mating-1',
        type: 'Mating',
        date: matingDate,
        goat_id: 'goat-1',
        status: 'active'
      }
    ];

    const alerts = generateDynamicFarmAlerts({
      events,
      goats: sampleGoats,
      barnAreas: sampleBarnAreas
    });

    const kiddingAlert = alerts.find(a => a.type === 'KIDDING_SOON' || a.type === 'KIDDING_DUE');
    expect(kiddingAlert).toBeDefined();
    expect(kiddingAlert.goatId).toBe('goat-1');
    expect(kiddingAlert.category).toBe('Reproduction');
  });

  it('detects active medication withdrawal periods and warns not to sell milk', () => {
    // Medication given 2 days ago with 7 days withdrawal -> 5 days remaining
    const medDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const events = [
      {
        id: 'med-1',
        type: 'Medication',
        title: 'Penicillin Treatment',
        date: medDate,
        goat_id: 'goat-1',
        custom_fields: { withdrawal_days: 7 }
      }
    ];

    const alerts = generateDynamicFarmAlerts({
      events,
      goats: sampleGoats,
      barnAreas: sampleBarnAreas
    });

    const withdrawalAlert = alerts.find(a => a.type === 'MEDICATION_WITHDRAWAL');
    expect(withdrawalAlert).toBeDefined();
    expect(withdrawalAlert.severity).toBe('urgent');
    expect(withdrawalAlert.description).toContain('Active withdrawal');
  });

  it('filters out dismissed alerts', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const events = [
      {
        id: 'ev-1',
        title: 'Scheduled: Hoof Trimming',
        date: `${todayStr}T10:00:00Z`,
        goat_id: 'goat-1',
        is_scheduled: true,
        status: 'pending'
      }
    ];

    const alertsBefore = generateDynamicFarmAlerts({
      events,
      goats: sampleGoats,
      dismissedAlertIds: []
    });
    expect(alertsBefore.some(a => a.id === 'task-ev-1')).toBe(true);

    const alertsAfter = generateDynamicFarmAlerts({
      events,
      goats: sampleGoats,
      dismissedAlertIds: ['task-ev-1']
    });
    expect(alertsAfter.some(a => a.id === 'task-ev-1')).toBe(false);
  });

  it('elevates severity and formats title for tasks marked as urgent or high priority', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const events = [
      {
        id: 'ev-urgent',
        title: 'Scheduled: Emergency Antibiotic Follow-up',
        date: `${todayStr}T08:00:00Z`,
        goat_id: 'goat-1',
        is_scheduled: true,
        status: 'pending',
        custom_fields: { urgency: 'urgent' }
      },
      {
        id: 'ev-high',
        title: 'Scheduled: Booster Shot',
        date: `${tomorrowStr}T09:00:00Z`,
        goat_id: 'goat-2',
        is_scheduled: true,
        status: 'pending',
        custom_fields: { urgency: 'high' }
      }
    ];

    const alerts = generateDynamicFarmAlerts({
      events,
      goats: sampleGoats,
      barnAreas: sampleBarnAreas
    });

    const urgentAlert = alerts.find(a => a.id === 'task-ev-urgent');
    const highAlert = alerts.find(a => a.id === 'task-ev-high');

    expect(urgentAlert).toBeDefined();
    expect(urgentAlert.severity).toBe('urgent');
    expect(urgentAlert.title).toContain('[Urgent]');
    expect(urgentAlert.urgency).toBe('urgent');

    expect(highAlert).toBeDefined();
    expect(highAlert.severity).toBe('warning');
    expect(highAlert.title).toContain('[High Priority]');
    expect(highAlert.urgency).toBe('high');
  });
});

