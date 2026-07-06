/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string; // e.g., "08:00 AM" or "08:00"
  frequency: string; // "Daily", "Twice Daily", "Weekly", "As Needed"
  category: 'Beta-Blocker' | 'ACE-Inhibitor' | 'Blood-Thinner' | 'Statin' | 'Diuretic' | 'Other';
  isTakenToday: boolean;
  takenHistory: { [date: string]: boolean }; // e.g. { "2026-07-03": true }
  remainingPills: number;
  totalPills: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  date: string; // YYYY-MM-DD
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  notes: string;
  diagnosis: string;
  signature: string;
}

export interface VitalSign {
  id: string;
  timestamp: string; // ISO string
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  spo2: number; // Percentage
  weight?: number; // Weight in kg
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}
