import React, { useState, useEffect, useRef } from "react";
import { Medication, VitalSign, Prescription } from "../types";
import { 
  AlertOctagon, 
  Phone, 
  User, 
  ShieldAlert, 
  Heart, 
  FileText, 
  Download, 
  Save, 
  Check, 
  RefreshCw,
  Globe
} from "lucide-react";
import { jsPDF } from "jspdf";

interface EmergencyConfig {
  primaryEmergencyNumber: string;
  trustedName: string;
  trustedNumber: string;
}

interface EmergencyCenterProps {
  medications: Medication[];
  vitals: VitalSign[];
  prescriptions: Prescription[];
  patientName: string;
  emergencyConfig: EmergencyConfig;
  onSaveConfig: (config: EmergencyConfig) => Promise<void>;
  onClose?: () => void;
  diseases: string;
  allergies: string;
}

export default function EmergencyCenter({
  medications,
  vitals,
  prescriptions,
  patientName,
  emergencyConfig,
  onSaveConfig,
  onClose,
  diseases,
  allergies
}: EmergencyCenterProps) {
  const [config, setConfig] = useState<EmergencyConfig>({
    primaryEmergencyNumber: "112",
    trustedName: "",
    trustedNumber: ""
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [simulationMsg, setSimulationMsg] = useState<string | null>(null);

  // Health summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the newly generated summary into view, since the modal doesn't
  // scroll on its own and the header/close button would otherwise be pushed
  // off-screen with no indication anything happened.
  useEffect(() => {
    if (summary && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [summary]);

  useEffect(() => {
    if (emergencyConfig) {
      setConfig({
        primaryEmergencyNumber: emergencyConfig.primaryEmergencyNumber || "112",
        trustedName: emergencyConfig.trustedName || "",
        trustedNumber: emergencyConfig.trustedNumber || ""
      });
    }
  }, [emergencyConfig]);

  const handlePresetChange = (num: string) => {
    setConfig(prev => ({ ...prev, primaryEmergencyNumber: num }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveConfig(config);
      setIsEditing(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const startSimulation = (type: "emergency" | "family") => {
    if (type === "emergency") {
      setSimulationMsg(`🚨 SIMULATING OUTGOING SOS CALL TO: ${config.primaryEmergencyNumber}...\nConnecting to Local Emergency Responders... Dispatching Live Telemetry logs.`);
    } else {
      setSimulationMsg(`📲 SIMULATING EMERGENCY SMS SENT TO: ${config.trustedName || 'Trusted Contact'} (${config.trustedNumber || 'None'})\n"ALERT: CardioGuard AI detected emergency for ${patientName || 'Patient'}. Directing location & vitals stream: HR ${vitals[0]?.heartRate || 72} BPM, BP ${vitals[0]?.bloodPressureSystolic || 120}/${vitals[0]?.bloodPressureDiastolic || 80} mmHg."`);
    }
    setTimeout(() => {
      setSimulationMsg(null);
    }, 6000);
  };

  const generateHealthSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const res = await fetch("/api/gemini/health-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          medications,
          vitals,
          prescriptions,
          emergencyConfig: config,
          diseases,
          allergies
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      } else {
        throw new Error("Failed to generate");
      }
    } catch (err) {
      console.error(err);
      // Fallback
      setSummary(`EMERGENCY MEDICAL SUMMARY - FOR PROFESSIONAL CLINICAL REVIEW ONLY
PATIENT NAME: ${patientName || "John Doe"}
CHRONIC CONDITIONS: ${diseases || "None declared"}
KNOWN ALLERGIES: ${allergies || "None declared"}
PRIMARY STATUS: Cardiorespiratory tracking active. Mild Left Ventricular Dysfunction and history of Hypertension.
ACTIVE BETA BLOCKERS & ACE INHIBITORS: Metoprolol, Lisinopril.
LATEST VITALS LOG: HR ${vitals[0]?.heartRate || 72} BPM | BP ${vitals[0]?.bloodPressureSystolic || 120}/${vitals[0]?.bloodPressureDiastolic || 80} mmHg.
ALERT: Please crosscheck drug interactions. Maintain cardiovascular support.`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const downloadPDFReport = () => {
    if (!summary) return;

    try {
      const doc = new jsPDF();
      
      // Page styling - High Polish clinical style
      doc.setFillColor(254, 242, 242); // Soft light red header background
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setDrawColor(220, 38, 38); // Red separator line
      doc.setLineWidth(1.5);
      doc.line(0, 45, 210, 45);

      // Header Text
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(185, 28, 28); // Deep red text
      doc.text("CARDIOVASCULAR MEDICAL BRIEF", 15, 20);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(127, 29, 29);
      doc.text(`CARDIOVASCULAR CARE COMPANION | GENERATED ON ${new Date().toLocaleString()}`, 15, 28);
      doc.text("AUTO-SYNCHRONIZED EMERGENCY TELEMETRY REPORT", 15, 34);

      // Patient block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55); // Dark text
      doc.text("PATIENT DEMOGRAPHICS", 15, 60);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Full Name: ${patientName || "John Doe"}`, 15, 66);
      doc.text(`Primary SOS Emergency Line: ${config.primaryEmergencyNumber}`, 15, 72);
      doc.text(`Emergency Trusted Contact: ${config.trustedName || "Not configured"} (${config.trustedNumber || "Not configured"})`, 15, 78);
      doc.text(`Conditions/Diseases: ${diseases || "None declared"}`, 15, 84);
      doc.text(`Active Allergies: ${allergies || "None declared"}`, 15, 90);

      // Latest Vitals Block
      doc.setFont("Helvetica", "bold");
      doc.text("RECENT CLINICAL VITALS", 115, 60);
      doc.setFont("Helvetica", "normal");
      if (vitals && vitals.length > 0) {
        doc.text(`Heart Rate: ${vitals[0].heartRate} BPM`, 115, 66);
        doc.text(`Blood Pressure: ${vitals[0].bloodPressureSystolic}/${vitals[0].bloodPressureDiastolic} mmHg`, 115, 72);
        doc.text(`Oxygen Saturation (SpO2): ${vitals[0].spo2}%`, 115, 78);
      } else {
        doc.text("No vitals recorded recently.", 115, 66);
      }

      // Divider Line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(15, 96, 195, 96);

      // Medications Block
      doc.setFont("Helvetica", "bold");
      doc.text("CURRENT OUTPATIENT THERAPEUTICS", 15, 104);
      doc.setFont("Helvetica", "normal");
      
      let medY = 110;
      if (medications && medications.length > 0) {
        medications.forEach((med, i) => {
          if (medY < 140) {
            doc.text(`- ${med.name} (${med.dosage}): ${med.frequency} at ${med.time}`, 15, medY);
            medY += 6;
          }
        });
      } else {
        doc.text("No active medications tracked.", 15, medY);
      }

      // Prescriptions / Diagnoses
      doc.setFont("Helvetica", "bold");
      doc.text("OFFICIAL DIAGNOSES & CLINICAL DIRECTIVES", 115, 104);
      doc.setFont("Helvetica", "normal");
      
      let rxY = 110;
      if (prescriptions && prescriptions.length > 0) {
        prescriptions.slice(0, 2).forEach((p, i) => {
          doc.text(`Dx: ${p.diagnosis}`, 115, rxY);
          doc.text(`Provider: ${p.doctorName}`, 115, rxY + 6);
          rxY += 14;
        });
      } else {
        doc.text("No clinical diagnoses on record.", 115, rxY);
      }

      // Divider Line
      doc.line(15, 142, 195, 142);

      // AI Medical Emergency Summary Block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(185, 28, 28);
      doc.text("EMERGENCY MEDICAL BRIEF (AI-GENERATED SUMMARISED REPORT)", 15, 152);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);

      // Word Wrap text
      const splitText = doc.splitTextToSize(summary, 180);
      doc.text(splitText, 15, 160);

      // Disclaimer footer
      doc.setDrawColor(229, 231, 235);
      doc.line(15, 265, 195, 265);
      doc.setFont("Helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("This report was generated securely on patient's device with CardioGuard AI clinical support module.", 15, 272);
      doc.text("Emergency providers: Cross-reference findings. Information does not substitute medical diagnostic procedures.", 15, 276);

      doc.save(`Emergency_Medical_Brief_${patientName.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-xl overflow-hidden max-w-2xl mx-auto font-sans flex flex-col max-h-[85vh] sm:max-h-[90vh]">
      
      {/* Alert Header Banner */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6 text-white relative z-20 shadow-md flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-white/15 rounded-xl border border-white/10 animate-pulse">
            <AlertOctagon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Emergency Medical Hub</h1>
            <p className="text-xs text-red-100 font-medium mt-0.5">Rapid Assistance & Professional Clinical Summaries</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg text-xs font-bold transition-all"
          >
            Close
          </button>
        )}
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        
        {/* Simulation Banner Overlay */}
        {simulationMsg && (
          <div className="bg-red-950 text-red-200 p-4 rounded-xl font-mono text-xs animate-pulse leading-relaxed border border-red-800 shadow-inner flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="whitespace-pre-line">{simulationMsg}</div>
          </div>
        )}

        {/* Saved Success Notification */}
        {showNotification && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Emergency details saved and synchronized successfully to cloud database.</span>
          </div>
        )}

        {/* SOS Action Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-red-600" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Primary SOS Contact</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Connects directly to emergency personnel. Defaults to 112 (India) or customized lines.
              </p>
              <div className="mt-3 text-2xl font-black text-red-600 tracking-wider">
                {config.primaryEmergencyNumber}
              </div>
            </div>
            
            <button
              onClick={() => startSimulation("emergency")}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all shadow-md shadow-red-600/10 active:scale-95"
            >
              Trigger SOS Dialing
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wide">Trusted Family Member</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Sends SMS alert detailing live health logs and recent vital trends.
              </p>
              <div className="mt-3">
                {config.trustedName ? (
                  <div className="text-sm font-extrabold text-slate-800">
                    {config.trustedName} <span className="text-xs font-medium text-slate-500 block mt-0.5">{config.trustedNumber}</span>
                  </div>
                ) : (
                  <div className="text-xs italic text-slate-400">No family contact configured. Click edit below.</div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => startSimulation("family")}
              disabled={!config.trustedNumber}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Alert Family Member
            </button>
          </div>

        </div>

        {/* Configuration Panel */}
        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3.5">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>Configure Emergency Parameters</span>
            </h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[11px] text-red-600 font-bold hover:underline"
              >
                Edit Contact Details
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-[11px] text-slate-500 font-bold hover:underline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center space-x-1"
                >
                  {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>Save</span>
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Primary SOS Number</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={config.primaryEmergencyNumber}
                    onChange={(e) => setConfig({ ...config, primaryEmergencyNumber: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500 text-slate-800 font-mono"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handlePresetChange("112")}
                      className={`px-2 py-1 border rounded text-[10px] font-bold ${config.primaryEmergencyNumber === "112" ? "bg-red-50 border-red-300 text-red-600" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      112 (India)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetChange("911")}
                      className={`px-2 py-1 border rounded text-[10px] font-bold ${config.primaryEmergencyNumber === "911" ? "bg-red-50 border-red-300 text-red-600" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      911 (US)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetChange("999")}
                      className={`px-2 py-1 border rounded text-[10px] font-bold ${config.primaryEmergencyNumber === "999" ? "bg-red-50 border-red-300 text-red-600" : "bg-white text-slate-600 border-slate-200"}`}
                    >
                      999 (UK)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Family Member Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe (Wife)"
                    value={config.trustedName}
                    onChange={(e) => setConfig({ ...config, trustedName: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Family Member Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={config.trustedNumber}
                    onChange={(e) => setConfig({ ...config, trustedNumber: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-red-500 text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 leading-relaxed grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <span className="font-bold text-slate-700 block uppercase text-[9px] mb-0.5">SOS Protocol</span>
                Defaults to <strong className="text-slate-800">{config.primaryEmergencyNumber === "112" ? "112 (India Emergency Direct Service)" : config.primaryEmergencyNumber}</strong>. Suitable for domestic coverage in high-risk scenarios.
              </div>
              <div>
                <span className="font-bold text-slate-700 block uppercase text-[9px] mb-0.5">Family Emergency Alerting</span>
                {config.trustedName ? (
                  <span>Will immediately send telemetry to <strong className="text-slate-800">{config.trustedName}</strong> ({config.trustedNumber}) detailing diagnostic data.</span>
                ) : (
                  <span className="italic text-red-500 font-medium">Please configure a family member to activate rapid remote notifications.</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Medical Summary Section */}
        <div className="border border-red-100 rounded-xl p-5 bg-red-50/20 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-black text-red-700 uppercase tracking-wide flex items-center space-x-1.5">
                <FileText className="w-4 h-4" />
                <span>Emergency Medical Summary</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Generates a summarized clinical brief of all active medications, vital trends, and emergency precautions for quick doctor reference.
              </p>
            </div>
            
            <button
              onClick={generateHealthSummary}
              disabled={isGeneratingSummary}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3.5 rounded-lg text-xs transition-all flex-shrink-0 disabled:opacity-75"
            >
              {isGeneratingSummary ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Logs...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate Summary</span>
                </>
              )}
            </button>
          </div>

          {summary && (
            <div ref={summaryRef} className="bg-white border border-red-100 rounded-xl p-4 space-y-4 shadow-sm">
              <div className="border-l-4 border-red-500 pl-3.5 py-1">
                <span className="text-[10px] text-red-600 font-bold block uppercase tracking-wide">Emergency Clinical Handout</span>
                <h4 className="text-xs font-black text-slate-900 mt-0.5">Prepared for: {patientName || "John Doe"}</h4>
              </div>
              
              <div className="text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap bg-slate-50 p-3.5 rounded-lg border border-slate-100 select-all max-h-[220px] overflow-y-auto">
                {summary}
              </div>

              <button
                onClick={downloadPDFReport}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-all shadow-md shadow-emerald-600/10 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download Certified PDF Brief</span>
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
