/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Capacitor, PluginListenerHandle } from '@capacitor/core';
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
 * Formats a 24-hour hour and minute into a standard "HH:mm AM/PM" string.
 */
export function formatHourMinuteTo12h(hour: number, minute: number): string {
  const clampedHour = Math.max(0, Math.min(23, Math.floor(hour)));
  const clampedMinute = Math.max(0, Math.min(59, Math.floor(minute)));
  const period = clampedHour >= 12 ? 'PM' : 'AM';
  const displayHour = clampedHour % 12 === 0 ? 12 : clampedHour % 12;
  const strHour = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
  const strMin = clampedMinute < 10 ? `0${clampedMinute}` : `${clampedMinute}`;
  return `${strHour}:${strMin} ${period}`;
}

/**
 * Parses any time representation (12-hour AM/PM, 24-hour, descriptive)
 * into exact 24-hour hour (0-23) and minute (0-59), preserving AM vs PM accurately.
 */
export function parseTimeToHourMinute(timeStr: string): { 
  hour: number; 
  minute: number; 
  period: 'AM' | 'PM'; 
  formatted12h: string; 
} {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hour: 10, minute: 0, period: 'AM', formatted12h: '10:00 AM' };
  }

  const clean = timeStr.trim().toUpperCase().replace(/\./g, '');

  // 1. Explicit 12-hour format with AM/PM (e.g. "10:00 AM", "10:00 PM", "10AM", "10 PM", "8:30PM")
  const twelveHourMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (twelveHourMatch) {
    let hour = parseInt(twelveHourMatch[1], 10);
    const minute = twelveHourMatch[2] ? parseInt(twelveHourMatch[2], 10) : 0;
    const period = twelveHourMatch[3] as 'AM' | 'PM';

    // Standard 12-hour to 24-hour conversion
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return {
      hour,
      minute,
      period,
      formatted12h: formatHourMinuteTo12h(hour, minute)
    };
  }

  // 2. 24-hour format (e.g. "22:00", "10:00", "14:30", "08:00")
  const twentyFourMatch = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    let hour = parseInt(twentyFourMatch[1], 10);
    const minute = parseInt(twentyFourMatch[2], 10);
    hour = Math.min(23, hour);
    const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
    return {
      hour,
      minute,
      period,
      formatted12h: formatHourMinuteTo12h(hour, minute)
    };
  }

  // 3. Standalone hour number (e.g. "10", "22")
  const singleNumberMatch = clean.match(/^(\d{1,2})$/);
  if (singleNumberMatch) {
    let hour = parseInt(singleNumberMatch[1], 10);
    if (hour >= 0 && hour <= 23) {
      const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
      return {
        hour,
        minute: 0,
        period,
        formatted12h: formatHourMinuteTo12h(hour, 0)
      };
    }
  }

  // 4. Fallback for descriptive text like "Morning", "Night", "Evening", "Noon"
  if (clean.includes('MORNING')) {
    return { hour: 10, minute: 0, period: 'AM', formatted12h: '10:00 AM' };
  }
  if (clean.includes('NOON') || clean.includes('AFTERNOON')) {
    return { hour: 13, minute: 0, period: 'PM', formatted12h: '01:00 PM' };
  }
  if (clean.includes('EVENING')) {
    return { hour: 18, minute: 0, period: 'PM', formatted12h: '06:00 PM' };
  }
  if (clean.includes('NIGHT') || clean.includes('BEDTIME')) {
    return { hour: 22, minute: 0, period: 'PM', formatted12h: '10:00 PM' };
  }

  // Default fallback: 10:00 AM
  return { hour: 10, minute: 0, period: 'AM', formatted12h: '10:00 AM' };
}

/**
 * Splits multi-dose strings such as "10:00 AM, 10:00 PM", "10 AM and 10 PM",
 * "08:00 AM / 08:00 PM" into individual normalized dose time strings.
 */
export function extractAllTimeSlots(timeStr: string): string[] {
  if (!timeStr || !timeStr.trim()) return ["10:00 AM"];

  const raw = timeStr.trim();

  // Try extracting multiple explicit AM/PM time patterns first
  // e.g. "10:00 AM 10:00 PM" or "10:00 AM, 10:00 PM"
  const multiMatches = raw.match(/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\b/gi);
  if (multiMatches && multiMatches.length > 1) {
    return multiMatches.map(t => parseTimeToHourMinute(t).formatted12h);
  }

  // Otherwise split by delimiters: comma, semicolon, slash, "and", "&"
  const segments = raw
    .split(/[,;/]|(?:\s+(?:and|&)\s+)/i)
    .map(s => s.trim())
    .filter(Boolean);

  if (segments.length > 0) {
    return segments.map(s => parseTimeToHourMinute(s).formatted12h);
  }

  return [parseTimeToHourMinute(raw).formatted12h];
}

/**
 * Calculates and divides medication times evenly across a 24-hour cycle based on
 * doctor frequency shorthand (e.g. BD, TDS, QID, 1-0-1, 1-1-1), duration, or
 * dosage count whenever explicit time stamps are omitted in prescriptions.
 */
export function calculateDailyDoseTimes(frequencyStr: string = "", dosageStr: string = "", explicitTime?: string): string {
  if (explicitTime && explicitTime.trim() !== "" && (explicitTime.includes(":") || explicitTime.toUpperCase().includes("AM") || explicitTime.toUpperCase().includes("PM"))) {
    return extractAllTimeSlots(explicitTime).join(", ");
  }

  const combined = `${frequencyStr} ${dosageStr}`.toUpperCase().trim();

  // 1. Four times a day (Every 6 hours) -> 24 / 4 = 6 hrs
  if (
    combined.includes("QID") || 
    combined.includes("4 TIME") || 
    combined.includes("4X") || 
    combined.includes("FOUR TIME") ||
    combined.includes("1-1-1-1") || 
    combined.includes("EVERY 6") || 
    combined.includes("Q6H") ||
    combined.includes("6 HOURLY")
  ) {
    return "06:00 AM, 12:00 PM, 06:00 PM, 12:00 AM";
  }

  // 2. Three times a day (Every 8 hours) -> 24 / 3 = 8 hrs
  if (
    combined.includes("TID") || 
    combined.includes("TDS") || 
    combined.includes("3 TIME") || 
    combined.includes("3X") || 
    combined.includes("THRICE") ||
    combined.includes("THREE TIME") ||
    combined.includes("1-1-1") || 
    combined.includes("EVERY 8") || 
    combined.includes("Q8H") ||
    combined.includes("8 HOURLY")
  ) {
    return "08:00 AM, 02:00 PM, 08:00 PM";
  }

  // 3. Twice a day (Every 12 hours) -> 10:00 AM, 10:00 PM
  if (
    combined.includes("BID") || 
    combined.includes("BD") || 
    combined.includes("2 TIME") || 
    combined.includes("2X") || 
    combined.includes("TWICE") || 
    combined.includes("TWO TIME") ||
    combined.includes("1-0-1") || 
    combined.includes("0-1-1") ||
    combined.includes("EVERY 12") || 
    combined.includes("Q12H") ||
    combined.includes("12 HOURLY")
  ) {
    return "10:00 AM, 10:00 PM";
  }

  // 4. Night / Bedtime dose
  if (
    combined.includes("NIGHT") || 
    combined.includes("BEDTIME") || 
    combined.includes("HS") || 
    combined.includes("0-0-1") || 
    combined.includes("BEFORE SLEEP")
  ) {
    return "10:00 PM";
  }

  // 5. Afternoon / Noon dose
  if (
    combined.includes("NOON") || 
    combined.includes("AFTERNOON") || 
    combined.includes("0-1-0") || 
    combined.includes("MIDDAY")
  ) {
    return "01:00 PM";
  }

  // 6. As needed / SOS / PRN
  if (
    combined.includes("AS NEEDED") || 
    combined.includes("PRN") || 
    combined.includes("SOS") || 
    combined.includes("WHEN REQUIRED")
  ) {
    return "As Needed (PRN)";
  }

  // 7. Alternate Day / Weekly
  if (combined.includes("ALTERNATE") || combined.includes("QOD") || combined.includes("EVERY OTHER DAY")) {
    return "10:00 AM (Alternate Days)";
  }
  if (combined.includes("WEEKLY") || combined.includes("ONCE A WEEK")) {
    return "10:00 AM (Weekly)";
  }

  // 8. Default Daily Single Dose (OD / 1-0-0 / Once Daily)
  return "10:00 AM";
}

class NotificationService {
  private isNative: boolean;
  private actionListenerHandle: PluginListenerHandle | null = null;

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
      // Register Android channel with high importance, vibration, and light
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Medication & Health Alarms',
        description: 'Scheduled alerts and reminders for CardioGuard medications and vitals.',
        importance: 5, // High Importance (Interruptive alert)
        visibility: 1, // Public on lockscreen
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
   * Schedule repeating daily medication reminder(s). Supports single and multi-dose intervals (e.g. 10:00 AM & 10:00 PM).
   */
  public async scheduleMedicationReminder(medication: Medication): Promise<void> {
    if (medication.reminderEnabled === false) {
      await this.cancelMedicationReminder(medication.id);
      return;
    }

    if (this.isNative) {
      try {
        // Ensure high priority notification channel is created
        await this.initNotificationChannels();

        // Cancel existing slots for this medication before rescheduling
        await this.cancelMedicationReminder(medication.id);

        const hasPerm = await this.checkPermissions();
        if (!hasPerm) {
          const granted = await this.requestPermissions();
          if (!granted) return;
        }

        // Extract all discrete dose times (e.g. ["10:00 AM", "10:00 PM"])
        const timeSegments = extractAllTimeSlots(medication.time || "10:00 AM");

        const notifications = timeSegments.map((t, idx) => {
          const { hour, minute, formatted12h, period } = parseTimeToHourMinute(t);
          const numId = getNumericId(`${medication.id}-slot-${idx}`);
          const doseLabel = timeSegments.length > 1 ? ` (${formatted12h} dose)` : '';

          return {
            id: numId,
            title: `CardioGuard: Time for ${medication.name}${doseLabel}`,
            body: `Dosage: ${medication.dosage} (${medication.instructions || 'Take with water'}). Scheduled for ${formatted12h}.`,
            channelId: CHANNEL_ID,
            actionTypeId: ACTION_TYPE_ID,
            schedule: {
              on: { hour, minute },
              repeats: true,
              allowWhileIdle: true
            },
            iconColor: '#DC2626',
            extra: {
              medicationId: medication.id,
              medicationName: medication.name,
              slotIndex: idx,
              doseTime: formatted12h,
              period
            }
          };
        });

        if (notifications.length > 0) {
          await LocalNotifications.schedule({ notifications });
          console.log(`[Android] Scheduled ${notifications.length} daily alarm(s) for ${medication.name} at [${timeSegments.join(', ')}]`);
        }
      } catch (err) {
        console.error(`Failed to schedule Android reminder for ${medication.name}:`, err);
      }
    } else if (this.isSupported()) {
      // Desktop / Web Notification
      console.log(`[Desktop] Reminder registered for ${medication.name} at [${medication.time}]`);
    }
  }

  /**
   * Cancel all scheduled medication reminder slots for a given ID.
   */
  public async cancelMedicationReminder(medicationId: string): Promise<void> {
    if (this.isNative) {
      try {
        const idsToCancel = [
          getNumericId(medicationId),
          ...Array.from({ length: 10 }, (_, i) => getNumericId(`${medicationId}-slot-${i}`))
        ];
        await LocalNotifications.cancel({
          notifications: idsToCancel.map(id => ({ id }))
        });
        console.log(`[Android] Cancelled all notification slots for med ${medicationId}`);
      } catch (err) {
        console.warn(`Error cancelling notification for ${medicationId}:`, err);
      }
    }
  }

  /**
   * Bulk sync all active medications with the system alarm scheduler.
   */
  public async syncAllReminders(medications: Medication[]): Promise<void> {
    if (!medications) return;

    if (this.isNative) {
      try {
        // Ensure channels are ready
        await this.initNotificationChannels();

        // Clear all pending notifications to prevent stale or duplicate slots
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map(n => ({ id: n.id }))
          });
        }
      } catch (err) {
        console.warn('Error clearing pending notifications before sync:', err);
      }
    }

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
  ): Promise<PluginListenerHandle | null> {
    if (!this.isNative) return null;

    try {
      // Remove any previously registered action listener to avoid duplicate listener accumulation
      if (this.actionListenerHandle) {
        await this.actionListenerHandle.remove();
        this.actionListenerHandle = null;
      }

      const handle = await LocalNotifications.addListener(
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

      this.actionListenerHandle = handle;
      return handle;
    } catch (err) {
      console.warn('Failed to add local notification action listener:', err);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
