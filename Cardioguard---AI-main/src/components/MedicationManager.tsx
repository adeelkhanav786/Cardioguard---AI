/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Medication } from "../types";
import { 
  Plus, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  Tablets,
  CalendarCheck,
  CalendarDays,
  Sparkles,
  Bell,
  BellOff
} from "lucide-react";
import { notificationService, extractAllTimeSlots } from "../services/notificationService";

interface MedicationManagerProps {
  medications: Medication[];
  onToggleTake: (id: string) => Promise<void>;
  onAddMedication: (med: {
    name: string;
    dosage: string;
    time: string;
    frequency: string;
    category: string;
    totalPills: number;
    instructions: string;
    reminderEnabled?: boolean;
  }) => Promise<void>;
  onDeleteMedication: (id: string) => Promise<void>;
  onToggleReminder?: (id: string, enabled: boolean) => Promise<void>;
  compactMode?: boolean;
}

export default function MedicationManager({
  medications,
  onToggleTake,
  onAddMedication,
  onDeleteMedication,
  onToggleReminder,
  compactMode = false
}: MedicationManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [category, setCategory] = useState("Beta-Blocker");
  const [totalPills, setTotalPills] = useState(30);
  const [instructions, setInstructions] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Structured multi-dose time state ensuring unambiguous AM/PM
  const [dose1Hour, setDose1Hour] = useState("10");
  const [dose1Minute, setDose1Minute] = useState("00");
  const [dose1Period, setDose1Period] = useState<"AM" | "PM">("AM");

  const [dose2Hour, setDose2Hour] = useState("10");
  const [dose2Minute, setDose2Minute] = useState("00");
  const [dose2Period, setDose2Period] = useState<"AM" | "PM">("PM");

  const [dose3Hour, setDose3Hour] = useState("02");
  const [dose3Minute, setDose3Minute] = useState("00");
  const [dose3Period, setDose3Period] = useState<"AM" | "PM">("PM");

  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState("");

  const handleFrequencyChange = (newFreq: string) => {
    setFrequency(newFreq);
    if (newFreq === "Twice Daily") {
      setDose1Hour("10");
      setDose1Minute("00");
      setDose1Period("AM");
      setDose2Hour("10");
      setDose2Minute("00");
      setDose2Period("PM");
    } else if (newFreq === "Three Times Daily") {
      setDose1Hour("08");
      setDose1Minute("00");
      setDose1Period("AM");
      setDose2Hour("02");
      setDose2Minute("00");
      setDose2Period("PM");
      setDose3Hour("08");
      setDose3Minute("00");
      setDose3Period("PM");
    } else {
      setDose1Hour("10");
      setDose1Minute("00");
      setDose1Period("AM");
    }
  };

  // Filter tabs: 'today' | 'week' | 'month'
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage) return;

    setIsSubmitting(true);
    try {
      if (reminderEnabled) {
        await notificationService.requestPermissions();
      }

      // Compute unambiguous formatted time string
      let resolvedTime = "";
      if (useCustomTime && customTime.trim()) {
        resolvedTime = customTime.trim();
      } else if (frequency === "Twice Daily") {
        const d1 = `${dose1Hour.padStart(2, '0')}:${dose1Minute.padStart(2, '0')} ${dose1Period}`;
        const d2 = `${dose2Hour.padStart(2, '0')}:${dose2Minute.padStart(2, '0')} ${dose2Period}`;
        resolvedTime = `${d1}, ${d2}`;
      } else if (frequency === "Three Times Daily") {
        const d1 = `${dose1Hour.padStart(2, '0')}:${dose1Minute.padStart(2, '0')} ${dose1Period}`;
        const d2 = `${dose2Hour.padStart(2, '0')}:${dose2Minute.padStart(2, '0')} ${dose2Period}`;
        const d3 = `${dose3Hour.padStart(2, '0')}:${dose3Minute.padStart(2, '0')} ${dose3Period}`;
        resolvedTime = `${d1}, ${d2}, ${d3}`;
      } else if (frequency === "As Needed (PRN)") {
        resolvedTime = "As Needed (PRN)";
      } else {
        resolvedTime = `${dose1Hour.padStart(2, '0')}:${dose1Minute.padStart(2, '0')} ${dose1Period}`;
      }

      await onAddMedication({
        name,
        dosage,
        time: resolvedTime,
        frequency,
        category,
        totalPills,
        instructions,
        reminderEnabled
      });

      // Reset form
      setName("");
      setDosage("");
      setFrequency("Daily");
      setDose1Hour("10");
      setDose1Minute("00");
      setDose1Period("AM");
      setDose2Hour("10");
      setDose2Minute("00");
      setDose2Period("PM");
      setUseCustomTime(false);
      setCustomTime("");
      setCategory("Beta-Blocker");
      setTotalPills(30);
      setInstructions("");
      setReminderEnabled(true);
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add medication", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate Compliance statistics
  const takenCount = medications.filter(m => m.isTakenToday).length;
  const totalCount = medications.length;
  const complianceRate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 100;

  // Filter logic based on tab choice
  const getFilteredMeds = () => {
    if (activeTab === 'today') {
      // Show all meds today
      return medications;
    } else if (activeTab === 'week') {
      // Filter out meds that are As Needed
      return medications.filter(m => m.frequency !== 'As Needed (PRN)');
    } else {
      // Show general maintenance meds
      return medications.filter(m => m.frequency === 'Daily' || m.frequency === 'Twice Daily');
    }
  };

  const filteredMeds = getFilteredMeds();

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${compactMode ? "p-3 space-y-3 bg-red-50/30" : "p-6 space-y-4 bg-white rounded-2xl border border-red-100 shadow-md shadow-red-100/10"}`}>
      
      {/* Header section with Stats */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className={`${compactMode ? "text-base" : "text-xl"} font-bold text-slate-900 flex items-center space-x-2`}>
            <Tablets className="w-5 h-5 text-red-500" />
            <span>Medications & Routine</span>
          </h2>
          <p className="text-xs text-slate-500">Manage daily cardiac prescriptions</p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Med</span>
          </button>
        )}
      </div>

      {/* Compliance Ring Banner */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="space-y-1 flex-1">
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Compliance Rate Today</span>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-extrabold text-slate-900">{complianceRate}%</span>
            <span className="text-xs text-slate-500">completed today</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1 max-w-[220px]">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                complianceRate === 100 ? "bg-emerald-500" : complianceRate >= 50 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${complianceRate}%` }}
            ></div>
          </div>
        </div>

        <div className="text-right bg-white px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="text-[9px] text-slate-400 font-bold block uppercase">Progress</span>
          <span className="text-xs font-extrabold text-slate-700">{takenCount} / {totalCount} Taken</span>
        </div>
      </div>

      {/* Filter Selector tabs matching UI design from image */}
      <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl flex-shrink-0">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === 'today' 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5 text-red-500" />
          <span>Today</span>
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === 'week' 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5 text-red-500" />
          <span>Week</span>
        </button>
        <button
          onClick={() => setActiveTab('month')}
          className={`flex-1 flex items-center justify-center space-x-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
            activeTab === 'month' 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-red-500" />
          <span>Month</span>
        </button>
      </div>

      {/* Add Medication Form Overlay/Expandable */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-red-200 space-y-3 animate-fadeIn flex-shrink-0">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider">New Prescribed Medication</h3>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Medication Name *</label>
              <input
                type="text"
                placeholder="e.g. Carvedilol"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Dosage *</label>
              <input
                type="text"
                placeholder="e.g. 25mg"
                value={dosage}
                onChange={e => setDosage(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Frequency *</label>
              <select
                value={frequency}
                onChange={e => handleFrequencyChange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500 font-semibold"
              >
                <option>Daily</option>
                <option>Twice Daily</option>
                <option>Three Times Daily</option>
                <option>Weekly</option>
                <option>As Needed (PRN)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Refill Pill Count</label>
              <input
                type="number"
                value={totalPills}
                onChange={e => setTotalPills(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Structured Time Scheduler with Explicit AM / PM Toggles */}
            <div className="col-span-2 bg-white p-3 rounded-xl border border-red-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-wide">
                    {frequency === "Twice Daily" 
                      ? "2 Times a Day Schedule (AM & PM)" 
                      : frequency === "Three Times Daily" 
                      ? "3 Times a Day Schedule" 
                      : "Daily Alarm Time"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className="text-[9px] text-red-600 hover:text-red-700 font-bold underline cursor-pointer"
                >
                  {useCustomTime ? "Use Guided Pickers" : "Custom Text"}
                </button>
              </div>

              {useCustomTime ? (
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block mb-1">
                    Free-form Time (e.g. "10:00 AM, 10:00 PM" or "22:00")
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM, 10:00 PM"
                    value={customTime}
                    onChange={e => setCustomTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
                  />
                </div>
              ) : frequency === "Twice Daily" ? (
                <div className="space-y-2.5">
                  {/* Quick Presets for Twice Daily */}
                  <div className="flex items-center space-x-2 pt-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDose1Hour("10"); setDose1Minute("00"); setDose1Period("AM");
                        setDose2Hour("10"); setDose2Minute("00"); setDose2Period("PM");
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                        dose1Hour === "10" && dose1Period === "AM" && dose2Hour === "10" && dose2Period === "PM"
                          ? "bg-red-600 text-white border-red-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ⚡ 10:00 AM & 10:00 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDose1Hour("08"); setDose1Minute("00"); setDose1Period("AM");
                        setDose2Hour("08"); setDose2Minute("00"); setDose2Period("PM");
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                        dose1Hour === "08" && dose1Period === "AM" && dose2Hour === "08" && dose2Period === "PM"
                          ? "bg-red-600 text-white border-red-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      ⚡ 08:00 AM & 08:00 PM
                    </button>
                  </div>

                  {/* Dose 1 (Morning) */}
                  <div className="flex items-center justify-between bg-amber-50/60 border border-amber-200/70 p-2 rounded-lg">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-extrabold text-amber-900 bg-amber-200/70 px-1.5 py-0.5 rounded">Dose 1</span>
                      <span className="text-[10px] text-amber-800 font-medium">Morning</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={dose1Hour}
                        onChange={e => setDose1Hour(e.target.value)}
                        className="bg-white border border-amber-300 rounded px-1.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-xs font-bold text-slate-500">:</span>
                      <select
                        value={dose1Minute}
                        onChange={e => setDose1Minute(e.target.value)}
                        className="bg-white border border-amber-300 rounded px-1.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {["00", "15", "30", "45"].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <div className="flex rounded-md border border-amber-300 overflow-hidden text-[10px] font-black">
                        <button
                          type="button"
                          onClick={() => setDose1Period("AM")}
                          className={`px-2 py-1 transition-colors ${dose1Period === "AM" ? "bg-amber-600 text-white font-extrabold" : "bg-white text-slate-600"}`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setDose1Period("PM")}
                          className={`px-2 py-1 transition-colors ${dose1Period === "PM" ? "bg-amber-600 text-white font-extrabold" : "bg-white text-slate-600"}`}
                        >
                          PM
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dose 2 (Evening / Night) */}
                  <div className="flex items-center justify-between bg-purple-50/60 border border-purple-200/70 p-2 rounded-lg">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-extrabold text-purple-900 bg-purple-200/70 px-1.5 py-0.5 rounded">Dose 2</span>
                      <span className="text-[10px] text-purple-800 font-medium">Night</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={dose2Hour}
                        onChange={e => setDose2Hour(e.target.value)}
                        className="bg-white border border-purple-300 rounded px-1.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="text-xs font-bold text-slate-500">:</span>
                      <select
                        value={dose2Minute}
                        onChange={e => setDose2Minute(e.target.value)}
                        className="bg-white border border-purple-300 rounded px-1.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {["00", "15", "30", "45"].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <div className="flex rounded-md border border-purple-300 overflow-hidden text-[10px] font-black">
                        <button
                          type="button"
                          onClick={() => setDose2Period("AM")}
                          className={`px-2 py-1 transition-colors ${dose2Period === "AM" ? "bg-purple-600 text-white font-extrabold" : "bg-white text-slate-600"}`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setDose2Period("PM")}
                          className={`px-2 py-1 transition-colors ${dose2Period === "PM" ? "bg-purple-600 text-white font-extrabold" : "bg-white text-slate-600"}`}
                        >
                          PM
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : frequency === "Three Times Daily" ? (
                <div className="space-y-2">
                  {/* Dose 1, 2, 3 */}
                  {[
                    { label: "Morning", h: dose1Hour, setH: setDose1Hour, m: dose1Minute, setM: setDose1Minute, p: dose1Period, setP: setDose1Period, bg: "bg-amber-50/60 border-amber-200/70 text-amber-900", badge: "bg-amber-200/70" },
                    { label: "Midday", h: dose2Hour, setH: setDose2Hour, m: dose2Minute, setM: setDose2Minute, p: dose2Period, setP: setDose2Period, bg: "bg-sky-50/60 border-sky-200/70 text-sky-900", badge: "bg-sky-200/70" },
                    { label: "Evening", h: dose3Hour, setH: setDose3Hour, m: dose3Minute, setM: setDose3Minute, p: dose3Period, setP: setDose3Period, bg: "bg-purple-50/60 border-purple-200/70 text-purple-900", badge: "bg-purple-200/70" }
                  ].map((d, i) => (
                    <div key={i} className={`flex items-center justify-between border p-2 rounded-lg ${d.bg}`}>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.badge}`}>{d.label}</span>
                      <div className="flex items-center space-x-1">
                        <select value={d.h} onChange={e => d.setH(e.target.value)} className="bg-white border rounded px-1 text-xs font-bold text-slate-800">
                          {Array.from({ length: 12 }, (_, k) => String(k + 1).padStart(2, '0')).map(val => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                        <span className="text-xs font-bold text-slate-400">:</span>
                        <select value={d.m} onChange={e => d.setM(e.target.value)} className="bg-white border rounded px-1 text-xs font-bold text-slate-800">
                          {["00", "15", "30", "45"].map(val => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                        <div className="flex rounded border overflow-hidden text-[9px] font-bold">
                          <button type="button" onClick={() => d.setP("AM")} className={`px-1.5 py-0.5 ${d.p === "AM" ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}>AM</button>
                          <button type="button" onClick={() => d.setP("PM")} className={`px-1.5 py-0.5 ${d.p === "PM" ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}>PM</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Daily Single Dose */
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-700">Dose Time</span>
                  <div className="flex items-center space-x-1.5">
                    <select
                      value={dose1Hour}
                      onChange={e => setDose1Hour(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-xs font-bold text-slate-500">:</span>
                    <select
                      value={dose1Minute}
                      onChange={e => setDose1Minute(e.target.value)}
                      className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {["00", "15", "30", "45"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <div className="flex rounded-md border border-slate-300 overflow-hidden text-[10px] font-black">
                      <button
                        type="button"
                        onClick={() => setDose1Period("AM")}
                        className={`px-2 py-1 transition-colors ${dose1Period === "AM" ? "bg-red-600 text-white font-extrabold" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setDose1Period("PM")}
                        className={`px-2 py-1 transition-colors ${dose1Period === "PM" ? "bg-red-600 text-white font-extrabold" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Preview of scheduled times */}
              <div className="bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-medium">Daily Alarm Slots:</span>
                <span className="font-mono font-bold text-red-700">
                  {frequency === "Twice Daily"
                    ? `${dose1Hour}:${dose1Minute} ${dose1Period} & ${dose2Hour}:${dose2Minute} ${dose2Period}`
                    : frequency === "Three Times Daily"
                    ? `${dose1Hour}:${dose1Minute} ${dose1Period}, ${dose2Hour}:${dose2Minute} ${dose2Period}, ${dose3Hour}:${dose3Minute} ${dose3Period}`
                    : `${dose1Hour}:${dose1Minute} ${dose1Period}`}
                </span>
              </div>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Drug Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              >
                <option>Beta-Blocker</option>
                <option>ACE-Inhibitor</option>
                <option>Blood-Thinner</option>
                <option>Statin</option>
                <option>Diuretic</option>
                <option>Other</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Special Instructions</label>
              <textarea
                placeholder="e.g. Take with dinner, avoid grapefruits"
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="col-span-2 flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-red-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Daily Reminder Alarm</span>
                  <span className="text-[9px] text-slate-500 block">Notify on lock screen and desktop at scheduled time</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={e => setReminderEnabled(e.target.checked)}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center space-x-1"
          >
            {isSubmitting ? "Saving..." : "Save Medication Routine"}
          </button>
        </form>
      )}

      {/* Medication list check items */}
      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto pr-1">
        {filteredMeds.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <Tablets className="w-8 h-8 mx-auto stroke-1 text-slate-400" />
            <p className="text-xs">No active medications for this period.</p>
          </div>
        ) : (
          filteredMeds.map((med) => {
            const isLowPills = med.remainingPills <= 5;
            return (
              <div 
                key={med.id}
                className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  med.isTakenToday 
                    ? "bg-slate-50 border-slate-100 opacity-60" 
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {/* Checkbox button */}
                    <button
                      onClick={() => onToggleTake(med.id)}
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150 ${
                        med.isTakenToday 
                          ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-500" 
                          : "border-slate-300 hover:border-red-500 hover:bg-red-500/10"
                      }`}
                    >
                      {med.isTakenToday && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-baseline space-x-1.5 flex-wrap gap-y-1">
                        <span className={`text-xs font-black ${med.isTakenToday ? "text-slate-400 line-through" : "text-slate-900"}`}>
                          {med.name}
                        </span>
                        <span className="text-[10px] text-slate-600 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                          {med.dosage}
                        </span>
                        <span className="text-[9px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          {med.category}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 flex-wrap gap-y-1 text-[10px] text-slate-500 font-medium">
                        <div className="flex items-center space-x-1 flex-wrap gap-1">
                          <Clock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          {extractAllTimeSlots(med.time).map((slot, sIdx) => {
                            const isPM = slot.toUpperCase().includes("PM");
                            return (
                              <span 
                                key={sIdx} 
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${
                                  isPM 
                                    ? "bg-purple-50 text-purple-700 border-purple-200" 
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {slot}
                              </span>
                            );
                          })}
                        </div>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{med.frequency}</span>
                      </div>

                      {med.instructions && (
                        <p className="text-[10px] text-slate-600 italic font-sans max-w-[240px]">
                          💡 {med.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Alerts */}
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex items-center space-x-1">
                      {onToggleReminder && (
                        <button
                          onClick={() => onToggleReminder(med.id, !(med.reminderEnabled !== false))}
                          className={`p-1 rounded-md transition-colors ${
                            med.reminderEnabled !== false 
                              ? "text-red-500 hover:text-red-600 bg-red-50" 
                              : "text-slate-300 hover:text-slate-500"
                          }`}
                          title={med.reminderEnabled !== false ? "Reminder Active (Click to mute)" : "Reminder Muted (Click to enable)"}
                        >
                          {med.reminderEnabled !== false ? <Bell className="w-3.5 h-3.5 fill-red-500/20" /> : <BellOff className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteMedication(med.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                        title="Delete medication"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className={`text-[9px] block font-mono ${isLowPills ? "text-amber-600 font-extrabold" : "text-slate-500"}`}>
                        {med.remainingPills} / {med.totalPills} remaining
                      </span>
                    </div>
                  </div>
                </div>

                {isLowPills && (
                  <div className="mt-2.5 flex items-center space-x-1.5 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1.5 rounded-lg text-[9px] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-550" />
                    <span>Low stock! Ask Dr. Jenkins for a prescription renewal soon.</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
