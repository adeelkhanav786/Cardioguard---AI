/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Medication, VitalSign, Prescription, ChatMessage } from "../types";
import VitalsTracker from "./VitalsTracker";
import MedicationManager from "./MedicationManager";
import PrescriptionViewer from "./PrescriptionViewer";
import AiCompanion from "./AiCompanion";
import { 
  Heart, 
  Activity, 
  Sparkles, 
  User, 
  Stethoscope, 
  Flame, 
  ShieldCheck 
} from "lucide-react";

interface DesktopDashboardProps {
  medications: Medication[];
  vitals: VitalSign[];
  prescriptions: Prescription[];
  chatMessages: ChatMessage[];
  onToggleTake: (id: string) => Promise<void>;
  onAddMedication: (med: any) => Promise<void>;
  onDeleteMedication: (id: string) => Promise<void>;
  onLogVitals: (vital: any) => Promise<void>;
  onUploadPrescription: (rx: any) => Promise<void>;
  onImportMedsFromPrescription: (meds: any[]) => void;
  onSendMessage: (text: string) => Promise<void>;
  patientName: string;
  diseases: string;
  allergies: string;
}

export default function DesktopDashboard({
  medications,
  vitals,
  prescriptions,
  chatMessages,
  onToggleTake,
  onAddMedication,
  onDeleteMedication,
  onLogVitals,
  onUploadPrescription,
  onImportMedsFromPrescription,
  onSendMessage,
  patientName,
  diseases,
  allergies
}: DesktopDashboardProps) {

  // Calculate daily progress stats
  const takenCount = medications.filter(m => m.isTakenToday).length;
  const totalCount = medications.length;
  const compliance = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-6 animate-fadeIn p-2">
      
      {/* Top Banner stats bar */}
      <div className="grid grid-cols-4 gap-4">
        
        {/* Welcome Block */}
        <div className="col-span-1 bg-white border border-red-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Patient Profile</span>
            <h2 className="text-base font-extrabold text-slate-900 mt-1 font-sans">{patientName}</h2>
            <p className="text-[9px] text-slate-400 mt-0.5 font-mono">ID: #CG-9255-98</p>
          </div>
          <div className="mt-2 text-slate-700 bg-slate-50 border border-slate-100 p-2 rounded-xl text-[11px] leading-snug space-y-1">
            <div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Chronic Conditions</span>
              <span className="font-bold text-slate-800">{diseases || "None Declared"}</span>
            </div>
            <div className="border-t border-slate-200/50 pt-1 mt-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Active Allergies</span>
              <span className="font-bold text-red-600">{allergies || "None Declared"}</span>
            </div>
          </div>
        </div>

        {/* Primary Cardiology Doctor */}
        <div className="col-span-1 bg-white border border-red-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Lead Cardiologist</span>
            <h3 className="text-sm font-bold text-slate-900 mt-1">Dr. Sarah Jenkins</h3>
            <p className="text-xs text-red-600 mt-0.5">Saint Jude Heart Center</p>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
            <span>Next Appointment: July 15</span>
          </div>
        </div>

        {/* Medication Compliance Goal */}
        <div className="col-span-1 bg-white border border-red-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Daily Pill Intake</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{takenCount}/{totalCount}</span>
              <span className="text-xs text-slate-500">completed today</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3 border border-slate-200/50">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                compliance === 100 ? "bg-emerald-500" : compliance >= 50 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${compliance}%` }}
            ></div>
          </div>
        </div>

        {/* Heart Rate Stats */}
        <div className="col-span-1 bg-white border border-red-100 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Heart Rate State</span>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{vitals[0]?.heartRate || 72}</span>
              <span className="text-xs text-slate-500">BPM</span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-emerald-700 font-medium mt-2">
            <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>Pulsing smoothly</span>
          </div>
        </div>

      </div>

      {/* Bento Grid Core Layout */}
      <div className="grid grid-cols-3 gap-6">
        
        {/* Left Side: Vitals Monitor & History */}
        <div className="col-span-2 space-y-6 flex flex-col">
          <VitalsTracker 
            vitals={vitals} 
            onLogVitals={onLogVitals} 
          />

          <PrescriptionViewer
            prescriptions={prescriptions}
            onUploadPrescriptionMock={onUploadPrescription}
            onImportMedsFromPrescription={onImportMedsFromPrescription}
          />
        </div>

        {/* Right Side: Medications & AI chat side panel */}
        <div className="col-span-1 space-y-6 flex flex-col">
          <MedicationManager
            medications={medications}
            onToggleTake={onToggleTake}
            onAddMedication={onAddMedication}
            onDeleteMedication={onDeleteMedication}
          />

          <div className="flex-1 min-h-[480px]">
            <AiCompanion
              messages={chatMessages}
              onSendMessage={onSendMessage}
            />
          </div>
        </div>

      </div>

    </div>
  );
}
