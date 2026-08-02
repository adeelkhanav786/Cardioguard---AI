/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ActionPerformed } from '@capacitor/local-notifications';
import { Medication } from '../types';

export const CHANNEL_ID = 'cardioguard_med_alarms';
export const ACTION_TYPE_ID = 'MEDICATION_ACTIONS';

/**
 * Utility to convert string medication IDs to unique positive 32-bit integers
 * required by Android LocalNotifications.
 */
export function getNumericId(stringId: string): number {
  let hash = 0;
  for (let i = 0; i < stringId.length; i++) {
    const char = stringId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2147483647;
}

/**
 * Parses time strings such as "08:00 AM", "8:30 PM", "14:00", "Daily (Morning)"
 * into standard 24-hour hour and minute integers.
 */
export function parseTimeToHourMinute(timeStr: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 8, minute: 0 };

  const str = timeStr.trim().toUpperCase();

  // Match 12-hour format e.g. "08:00 AM" or "8:30PM"
  const twelveHourMatch = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (twelveHourMatch) {
    let hour = parseInt(twelveHourMatch[1], 10);
    const minute = parseInt(twelveHourMatch[2], 10);
    const period = twelveHourMatch[3];

    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
  }

  // Match 24-hour format e.g. "14:30" or "08:00"
  const twentyFourMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const hour = parseInt(twentyFourMatch[1], 10);
    const minute = parseInt(twentyFourMatch[2], 10);
    return { hour, minute };
  }

  // Fallback for descriptive text like "Morning", "Night", "Evening"
  if (str.includes('MORNING')) return { hour: 8, minute: 0 };
  if (str.includes('NOON') || str.includes('AFTERNOON')) return { hour: 13, minute: 0 };
  if (str.includes('EVENING')) return { hour: 18, minute: 0 };
  if (str.includes('NIGHT')) return { hour: 21, minute: 0 };

  return { hour: 8, minute: 0 };
}

class NotificationService {
  private isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Check if notifications are supported on the current environment.
   */
  public isSupported(): boolean {
    if (this.isNative) return true;
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Request notification permissions from the OS / Browser.
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (this.isNative) {
        const status = await LocalNotifications.requestPermissions();
        return status.display === 'granted';
      } else if (this.isSupported()) {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      }
    } catch (err) {
      console.error('Error requesting notification permissions:', err);
    }
    return false;
  }

  /**
   * Check if permissions are currently granted.
   */
  public async checkPermissions(): Promise<boolean> {
    try {
      if (this.isNative) {
        const status = await LocalNotifications.checkPermissions();
        return status.display === 'granted';
      } else if (this.isSupported()) {
        return Notification.permission === 'granted';
      }
    } catch (err) {
      console.error('Error checking notification permissions:', err);
    }
    return false;
  }

  /**
   * Initialize Android high-priority notification channels and action types.
   */
  public async initNotificationChannels(): Promise<void> {
    if (!this.isNative) return;

    try {
      // Register Android channel with high importance, custom sound, and vibration
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Medication & Health Alarms',
        description: 'Scheduled alerts and reminders for CardioGuard medications and vitals.',
        importance: 5, // High Importance (Interruptive alert)
        visibility: 1, // Public on lockscreen
        sound: 'res://raw/notification_sound', // Uses default or bundled sound
        vibration: true,
        lights: true,
        lightColor: '#DC2626' // CardioGuard Red
      });

      // Register quick action buttons for lockscreen / status bar notification
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: ACTION_TYPE_ID,
            actions: [
              {
                id: 'MARK_TAKEN',
                title: 'Mark as Taken 💊'
              },
              {
                id: 'SNOOZE_15',
                title: 'Snooze 15m ⏰'
              }
            ]
          }
        ]
      });

      console.log('CardioGuard Notification Channels & Actions initialized successfully.');
    } catch (err) {
      console.warn('Failed to initialize Android notification channels:', err);
    }
  }

  /**
   * Schedule a repeating daily medication reminder.
   */
  public async scheduleMedicationReminder(medication: Medication): Promise<void> {
    if (medication.reminderEnabled === false) {
      await this.cancelMedicationReminder(medication.id);
      return;
    }

    const numId = getNumericId(medication.id);
    const { hour, minute } = parseTimeToHourMinute(medication.time);

    if (this.isNative) {
      try {
        // Cancel existing before rescheduling
        await this.cancelMedicationReminder(medication.id);

        const hasPerm = await this.checkPermissions();
        if (!hasPerm) {
          const granted = await this.requestPermissions();
          if (!granted) return;
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              id: numId,
              title: `CardioGuard: Time for ${medication.name}`,
              body: `Dosage: ${medication.dosage} (${medication.instructions || 'Take with water'}).`,
              channelId: CHANNEL_ID,
              actionTypeId: ACTION_TYPE_ID,
              schedule: {
                on: {
                  hour,
                  minute
                },
                repeats: true,
                allowWhileIdle: true
              },
              smallIcon: 'ic_stat_name',
              iconColor: '#DC2626',
              extra: {
                medicationId: medication.id,
                medicationName: medication.name
              }
            }
          ]
        });
        console.log(`[Android] Scheduled daily reminder for ${medication.name} at ${hour}:${minute < 10 ? '0' + minute : minute}`);
      } catch (err) {
        console.error(`Failed to schedule Android reminder for ${medication.name}:`, err);
      }
    } else if (this.isSupported()) {
      // Desktop / Web Notification
      console.log(`[Desktop] Reminder registered for ${medication.name} at ${hour}:${minute < 10 ? '0' + minute : minute}`);
    }
  }

  /**
   * Cancel a scheduled medication reminder by ID.
   */
  public async cancelMedicationReminder(medicationId: string): Promise<void> {
    const numId = getNumericId(medicationId);
    if (this.isNative) {
      try {
        await LocalNotifications.cancel({
          notifications: [{ id: numId }]
        });
        console.log(`[Android] Cancelled notification ID ${numId} for med ${medicationId}`);
      } catch (err) {
        console.warn(`Error cancelling notification for ${medicationId}:`, err);
      }
    }
  }

  /**
   * Bulk sync all active medications with the system alarm scheduler.
   */
  public async syncAllReminders(medications: Medication[]): Promise<void> {
    if (!medications || medications.length === 0) return;

    for (const med of medications) {
      if (med.reminderEnabled !== false) {
        await this.scheduleMedicationReminder(med);
      } else {
        await this.cancelMedicationReminder(med.id);
      }

      // Check for low refill stock (< 5 pills remaining)
      if (med.remainingPills !== undefined && med.remainingPills <= 5) {
        await this.scheduleRefillReminder(med);
      }
    }
  }

  /**
   * Trigger low-stock refill alert notification.
   */
  public async scheduleRefillReminder(medication: Medication): Promise<void> {
    const refillNumId = getNumericId(`refill-${medication.id}`);
    const title = `CardioGuard Refill Alert: ${medication.name}`;
    const body = `Only ${medication.remainingPills} pills left! Please contact your pharmacy for a prescription refill.`;

    if (this.isNative) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: refillNumId,
              title,
              body,
              channelId: CHANNEL_ID,
              schedule: { at: new Date(Date.now() + 2000) }, // Trigger in 2 seconds
              smallIcon: 'ic_stat_name',
              iconColor: '#EAB308'
            }
          ]
        });
      } catch (err) {
        console.warn('Error scheduling refill alert:', err);
      }
    } else if (this.isSupported() && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  /**
   * Instantly fire a test notification to verify setup on mobile or desktop.
   */
  public async triggerTestNotification(): Promise<boolean> {
    const hasPerm = await this.requestPermissions();
    if (!hasPerm) return false;

    const title = 'CardioGuard Reminder Test 🩺';
    const body = 'Your medication and vital sign reminders are configured and working active!';

    if (this.isNative) {
      try {
        await this.initNotificationChannels();
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 99999,
              title,
              body,
              channelId: CHANNEL_ID,
              actionTypeId: ACTION_TYPE_ID,
              schedule: { at: new Date(Date.now() + 1000) }, // 1 second delay
              smallIcon: 'ic_stat_name',
              iconColor: '#DC2626'
            }
          ]
        });
        return true;
      } catch (err) {
        console.error('Test notification failed on Android:', err);
        return false;
      }
    } else if (this.isSupported()) {
      new Notification(title, { body, icon: '/favicon.ico' });
      this.playWebAudioChime();
      return true;
    }
    return false;
  }

  /**
   * Web Audio chime fallback for Desktop in-app notification alerts.
   */
  public playWebAudioChime(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Web Audio API not allowed or supported without user interaction.', e);
    }
  }

  /**
   * Attach listeners for notification action buttons (e.g. "Mark as Taken").
   */
  public async setupNotificationListeners(
    onMarkTaken?: (medicationId: string) => void,
    onSnooze?: (medicationId: string) => void
  ): Promise<void> {
    if (!this.isNative) return;

    try {
      await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('Notification action performed:', action);
          const medId = action.notification.extra?.medicationId;

          if (action.actionId === 'MARK_TAKEN' && medId) {
            if (onMarkTaken) onMarkTaken(medId);
          } else if (action.actionId === 'SNOOZE_15' && medId) {
            if (onSnooze) {
              onSnooze(medId);
            } else {
              // Default snooze: reschedule in 15 minutes
              LocalNotifications.schedule({
                notifications: [
                  {
                    id: getNumericId(`snooze-${medId}-${Date.now()}`),
                    title: `Snoozed: ${action.notification.title}`,
                    body: action.notification.body,
                    channelId: CHANNEL_ID,
                    actionTypeId: ACTION_TYPE_ID,
                    schedule: { at: new Date(Date.now() + 15 * 60 * 1000) },
                    extra: action.notification.extra
                  }
                ]
              });
            }
          }
        }
      );
    } catch (err) {
      console.warn('Failed to add local notification action listener:', err);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
