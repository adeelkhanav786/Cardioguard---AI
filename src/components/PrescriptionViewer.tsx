/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Prescription } from "../types";
import { 
  FileText, 
  Stethoscope, 
  Calendar, 
  Plus, 
  Camera, 
  Upload, 
  ChevronRight,
  Sparkles,
  FileUp
} from "lucide-react";

interface PrescriptionViewerProps {
  prescriptions: Prescription[];
  onUploadPrescriptionMock: (prescription: {
    doctorName: string;
    doctorSpecialty: string;
    date: string;
    diagnosis: string;
    notes: string;
    signature: string;
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
  }) => Promise<void>;
  onImportMedsFromPrescription: (meds: { name: string; dosage: string; frequency: string; instructions: string }[]) => void;
  compactMode?: boolean;
}

export default function PrescriptionViewer({
  prescriptions,
  onUploadPrescriptionMock,
  onImportMedsFromPrescription,
  compactMode = false
}: PrescriptionViewerProps) {
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(prescriptions[0] || null);
  const [isUploading, setIsUploading] = useState(false);
  const [scanStep, setScanStep] = useState<'upload' | 'scanning' | 'results'>('upload');
  const [scannedResult, setScannedResult] = useState<any>(null);

  // Fallback if list changes
  React.useEffect(() => {
    if (prescriptions.length > 0 && !selectedRx) {
      setSelectedRx(prescriptions[0]);
    }
  }, [prescriptions, selectedRx]);

  // Simulation of scanning paper prescription
  const handleSimulateScan = async (source: 'camera' | 'gallery') => {
    setIsUploading(true);
    setScanStep('scanning');
    
    // Simulate OCR + LLM Parsing
    setTimeout(async () => {
      const mockScannedRx = {
        doctorName: "Dr. Arthur Pendelton",
        doctorSpecialty: "Cardiovascular Electrophysiologist",
        date: new Date().toISOString().split('T')[0],
        diagnosis: "Atrial Fibrillation Routine Checkup",
        notes: "Prescribed anticoagulant for stroke prophylaxis and rate control beta-blocker. Avoid strenuous athletics temporarily.",
        signature: "A. Pendelton, MD",
        medications: [
          { name: "Eliquis (Apixaban)", dosage: "5mg", frequency: "Twice Daily", duration: "3 Months" },
          { name: "Carvedilol", dosage: "12.5mg", frequency: "Daily", duration: "6 Months" }
        ]
      };
      
      await onUploadPrescriptionMock(mockScannedRx);
      setScannedResult(mockScannedRx);
      setIsUploading(false);
      setScanStep('results');
    }, 2000);
  };

  const handleImport = (rx: Prescription) => {
    const importable = rx.medications.map(m => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      instructions: `Imported from ${rx.doctorName}'s digital prescription (${rx.date}). Duration: ${m.duration}`
    }));
    onImportMedsFromPrescription(importable);
  };

  const recentScans = [
    { name: "Prescription_12_May.jpg", date: "12 May 2024 - 10:30 AM", doctor: "Dr. Sarah Jenkins" },
    { name: "Discharge_Summary_Cardio.pdf", date: "22 Apr 2024 - 02:15 PM", doctor: "Saint Jude Heart Center" }
  ];

  return (
    <div className={`flex-1 flex flex-col ${compactMode ? "p-3 space-y-3 bg-red-50/30" : "p-6 space-y-6 bg-white rounded-2xl border border-red-100 shadow-md shadow-red-100/10"}`}>
      
      {/* Header */}
      <div>
        <h2 className={`${compactMode ? "text-base" : "text-xl"} font-bold text-slate-900 flex items-center space-x-2`}>
          <FileText className="w-5 h-5 text-red-500" />
          <span>Prescription Scanner & Vault</span>
        </h2>
        <p className="text-xs text-slate-500">Scan paper prescriptions with AI OCR or view digital vault slips</p>
      </div>

      {/* Main Container Layout */}
      <div className={`grid ${compactMode ? "grid-cols-1" : "grid-cols-5"} gap-6`}>
        
        {/* Left/Middle Column: Scanner & Recent Scans */}
        <div className={`space-y-6 ${compactMode ? "" : "col-span-3"}`}>
          
          {/* Scan Panel matching frontend mockups */}
          {scanStep === 'upload' && (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs font-semibold text-slate-600">Upload a clear image of your prescription</span>
              
              <div className="w-24 h-24 rounded-full border border-dashed border-slate-200 flex items-center justify-center bg-white relative">
                <Camera className="w-8 h-8 text-red-500 animate-pulse" />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                <button
                  onClick={() => handleSimulateScan('camera')}
                  className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </button>
                <button
                  onClick={() => handleSimulateScan('gallery')}
                  className="flex-1 flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-xs font-bold border border-slate-200 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload from Gallery</span>
                </button>
              </div>
            </div>
          )}

          {scanStep === 'scanning' && (
            <div className="bg-slate-50 p-8 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center space-y-4 min-h-[220px]">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 animate-pulse">AI OCR Scanner Active...</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Extracting medical text, dosage instructions, and validating safety constraints against active medications database...
                </p>
              </div>
            </div>
          )}

          {scanStep === 'results' && scannedResult && (
            <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="text-xs font-black text-emerald-900 uppercase">AI Scan Success</h4>
                    <span className="text-[10px] text-emerald-700 font-medium">Parsed into clinical schedule</span>
                  </div>
                </div>
                <button 
                  onClick={() => setScanStep('upload')}
                  className="text-xs text-red-600 font-bold hover:text-red-700"
                >
                  Scan Another
                </button>
              </div>

              {/* Scanned Data summary */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Doctor Name</span>
                    <span className="text-slate-900 font-bold block">{scannedResult.doctorName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Specialty</span>
                    <span className="text-red-600 font-semibold block">{scannedResult.doctorSpecialty}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Extracted Meds Schedule</span>
                  {scannedResult.medications.map((med: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-1.5 last:pb-0 last:border-0 border-b border-slate-100">
                      <div>
                        <span className="font-bold text-slate-900 block">{med.name}</span>
                        <span className="text-[10px] text-slate-500">{med.dosage} • {med.frequency}</span>
                      </div>
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[9px] font-bold border border-red-100">
                        {med.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleImport(scannedResult);
                    alert("Routine synced successfully!");
                    setScanStep('upload');
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  Add to Active Reminders
                </button>
                <button
                  onClick={() => setScanStep('upload')}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-xl text-xs border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Recent Scans Block */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Recent Scans</span>
              <button className="text-[10px] text-red-600 font-bold hover:text-red-700">See All</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentScans.map((scan, idx) => (
                <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-all cursor-pointer shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white border border-slate-200 rounded-lg">
                      <FileUp className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-[140px]">{scan.name}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{scan.date}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Digital Vault list & detailed preview */}
        <div className={`space-y-4 ${compactMode ? "" : "col-span-2 border-l border-slate-100 pl-6"}`}>
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Digital Prescription Vault</span>
          
          {/* Active Slip Selector */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto">
            {prescriptions.map((rx) => (
              <button
                key={rx.id}
                onClick={() => setSelectedRx(rx)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedRx?.id === rx.id 
                    ? "bg-red-50/50 border-red-200 text-slate-900 shadow-sm" 
                    : "bg-slate-50/30 border-slate-100 text-slate-500 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Stethoscope className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[11px] font-bold text-slate-800 block truncate">{rx.doctorName}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-500">
                  <span className="truncate max-w-[120px]">{rx.diagnosis}</span>
                  <span>{rx.date}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Selected prescription info card */}
          {selectedRx && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between space-y-3 shadow-sm">
              <div className="border-b border-slate-200 pb-2.5">
                <span className="text-[8px] bg-red-50 border border-red-100 text-red-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1.5">
                  Verified Rx
                </span>
                <h3 className="text-xs font-black text-slate-900">{selectedRx.doctorName}</h3>
                <p className="text-[9px] text-slate-600 mt-0.5">{selectedRx.doctorSpecialty}</p>
                <span className="text-[9px] text-slate-500 block mt-1 font-mono">Date: {selectedRx.date}</span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Condition</span>
                  <span className="text-xs text-slate-900 font-bold">{selectedRx.diagnosis}</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Prescribed Medicines</span>
                  {selectedRx.medications.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-slate-900 block">{m.name}</span>
                        <span className="text-[10px] text-slate-500">{m.dosage} — {m.frequency}</span>
                      </div>
                      <span className="text-[9px] text-red-600 font-bold">{m.duration}</span>
                    </div>
                  ))}
                </div>

                {selectedRx.notes && (
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Notes</span>
                    <p className="text-[11px] text-slate-600 italic mt-0.5">"{selectedRx.notes}"</p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
                <div>
                  <span className="text-[8px] uppercase font-bold text-slate-500 block">Signature</span>
                  <span className="text-[11px] text-slate-800 italic font-serif">{selectedRx.signature}</span>
                </div>

                <button
                  onClick={() => {
                    handleImport(selectedRx);
                    alert(`Imported ${selectedRx.medications.length} medications into schedule.`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                >
                  Import Routines
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
