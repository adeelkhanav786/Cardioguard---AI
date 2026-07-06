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
  Sparkles
} from "lucide-react";

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
  }) => Promise<void>;
  onDeleteMedication: (id: string) => Promise<void>;
  compactMode?: boolean;
}

export default function MedicationManager({
  medications,
  onToggleTake,
  onAddMedication,
  onDeleteMedication,
  compactMode = false
}: MedicationManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00 AM");
  const [frequency, setFrequency] = useState("Daily");
  const [category, setCategory] = useState("Beta-Blocker");
  const [totalPills, setTotalPills] = useState(30);
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter tabs: 'today' | 'week' | 'month'
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage) return;

    setIsSubmitting(true);
    try {
      await onAddMedication({
        name,
        dosage,
        time,
        frequency,
        category,
        totalPills,
        instructions
      });
      // Reset form
      setName("");
      setDosage("");
      setTime("08:00 AM");
      setFrequency("Daily");
      setCategory("Beta-Blocker");
      setTotalPills(30);
      setInstructions("");
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
    <div className={`flex-1 flex flex-col ${compactMode ? "p-3 space-y-3 bg-red-50/30" : "p-6 space-y-5 bg-white rounded-2xl border border-red-100 shadow-md shadow-red-100/10"}`}>
      
      {/* Header section with Stats */}
      <div className="flex justify-between items-center">
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
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
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
      <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
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
          className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
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
          className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
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
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-red-200 space-y-3 animate-fadeIn">
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
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Refill Pill Count</label>
              <input
                type="number"
                value={totalPills}
                onChange={e => setTotalPills(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Time</label>
              <input
                type="text"
                placeholder="e.g. 08:00 AM"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              >
                <option>Daily</option>
                <option>Twice Daily</option>
                <option>Three Times Daily</option>
                <option>Weekly</option>
                <option>As Needed (PRN)</option>
              </select>
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
      <div className="space-y-3 flex-1 overflow-y-auto">
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

                      <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{med.time}</span>
                        </span>
                        <span>•</span>
                        <span>{med.frequency}</span>
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
                    <button
                      onClick={() => onDeleteMedication(med.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                      title="Delete medication"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

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
