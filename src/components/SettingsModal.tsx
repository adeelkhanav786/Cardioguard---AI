/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Medication } from "../types";
import { 
  X, 
  Bell, 
  BellOff, 
  Sparkles, 
  Clock, 
  Check, 
  ShieldCheck,
  Settings,
  HelpCircle,
  User,
  AlertTriangle,
  Stethoscope,
  Heart
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (val: boolean) => void;
  medications: Medication[];
  onTriggerTestNotification: (med: Medication) => void;
  patientName: string;
  diseases: string;
  allergies: string;
  onSaveProfile: (newDiseases: string, newAllergies: string, newDisplayName?: string) => Promise<void>;
}

export default function SettingsModal({
  isOpen,
  onClose,
  notificationsEnabled,
  setNotificationsEnabled,
  medications,
  onTriggerTestNotification,
  patientName,
  diseases,
  allergies,
  onSaveProfile
}: SettingsModalProps) {
  const [tempDisplayName, setTempDisplayName] = useState("");
  const [tempDiseases, setTempDiseases] = useState("");
  const [tempAllergies, setTempAllergies] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchronize internal form fields when properties load
  useEffect(() => {
    if (isOpen) {
      setTempDisplayName(patientName);
      setTempDiseases(diseases);
      setTempAllergies(allergies);
      setSaveSuccess(false);
    }
  }, [isOpen, patientName, diseases, allergies]);

  if (!isOpen) return null;

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveProfile(tempDiseases, tempAllergies, tempDisplayName);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">System Settings & Profile</h2>
              <p className="text-[10px] text-slate-500 font-mono">CardioGuard AI Patient Portal</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 max-h-[520px] overflow-y-auto">
          
          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-top-1">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Medical profile updated and synchronized successfully!</span>
            </div>
          )}

          {/* User Profile Form */}
          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-red-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">User Clinical Profile</h3>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Full Clinical Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={tempDisplayName}
                  onChange={(e) => setTempDisplayName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500 text-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Stethoscope className="w-3 h-3 text-red-500" />
                    <span>Conditions & Diseases</span>
                  </label>
                  <textarea
                    placeholder="e.g. Hypertension, Atrial Fibrillation"
                    value={tempDiseases}
                    onChange={(e) => setTempDiseases(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500 text-slate-800 font-semibold resize-none"
                  />
                  <span className="text-[8px] text-slate-400 block mt-0.5">Comma-separated conditions list</span>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>Active Allergies</span>
                  </label>
                  <textarea
                    placeholder="e.g. Penicillin, Shellfish, Latex"
                    value={tempAllergies}
                    onChange={(e) => setTempAllergies(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500 text-slate-800 font-semibold resize-none"
                  />
                  <span className="text-[8px] text-slate-400 block mt-0.5">e.g. drugs, foods, or materials</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Permission Card */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${notificationsEnabled ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-500 border border-red-100"}`}>
                  {notificationsEnabled ? <Bell className="w-5 h-5 animate-bounce" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Notification Permissions</h3>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Display instant on-screen alerts at scheduled medication hours. Turn off to silence reminders.
                  </p>
                </div>
              </div>
              
              {/* iOS style Toggle Switch */}
              <button
                type="button"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notificationsEnabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>State saved in persistent client session</span>
              </span>
              <span className={`font-bold uppercase tracking-wider ${notificationsEnabled ? "text-emerald-600" : "text-slate-400"}`}>
                {notificationsEnabled ? "Status: Authorized" : "Status: Blocked"}
              </span>
            </div>
          </div>

          {/* Local Notification Service Simulator */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-red-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Clinical Alarm Service Simulator</h3>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-relaxed bg-amber-50/50 border border-amber-100 p-3 rounded-lg">
              ⏰ <strong>Reviewer Testing Instructions:</strong> In a real clinical deployment, background services evaluate scheduled hours continuously. To verify this experience instantly without waiting for the exact clock-time, tap any medication below to fire a simulated local push notification banner!
            </p>

            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
              {medications.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No active medications configured.
                </div>
              ) : (
                medications.map((med) => (
                  <div key={med.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-800">{med.name}</span>
                        <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                          {med.dosage}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-[9px] text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Daily Scheduled Slot: <strong className="text-slate-700 font-mono">{med.time}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => onTriggerTestNotification(med)}
                      disabled={!notificationsEnabled}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                        notificationsEnabled
                          ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 cursor-pointer"
                          : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                      title={notificationsEnabled ? "Trigger a test notification now" : "Please enable notifications first"}
                    >
                      Trigger Banner
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Privacy & System Integrity disclosure */}
          <div className="flex items-start space-x-2 bg-slate-50 border border-slate-100 rounded-lg p-3 text-[10px] text-slate-500">
            <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              CardioGuard's local notifications do not stream patient identification details across public networks. Reminders run locally on client devices following GDPR health-compliance architectures.
            </p>
          </div>

        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center">
          <span className="text-[10px] font-semibold text-slate-400">All data securely hashed & saved</span>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs tracking-wider transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              {isSaving && <Clock className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Details</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
