/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Prescription } from "../types";
import { 
  FileText, 
  Stethoscope, 
  Camera, 
  Upload, 
  ChevronRight,
  Sparkles,
  FileUp,
  X,
  AlertTriangle,
  RefreshCcw
} from "lucide-react";

interface PrescriptionViewerProps {
  prescriptions: Prescription[];
  onUploadPrescription: (prescription: {
    doctorName: string;
    doctorSpecialty: string;
    date: string;
    diagnosis: string;
    notes: string;
    signature: string;
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
    imageBase64?: string;
    thumbnailBase64?: string;
  }) => Promise<void>;
  onImportMedsFromPrescription: (meds: { name: string; dosage: string; frequency: string; instructions: string }[]) => void;
  compactMode?: boolean;
}

// Resize + re-encode an image data URL on a canvas to keep it small enough for Firestore (1MiB doc cap)
function resizeImage(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

export default function PrescriptionViewer({
  prescriptions,
  onUploadPrescription,
  onImportMedsFromPrescription,
  compactMode = false
}: PrescriptionViewerProps) {
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(prescriptions[0] || null);
  const [scanStep, setScanStep] = useState<'upload' | 'scanning' | 'results'>('upload');
  const [scannedResult, setScannedResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Real camera state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fallback if list changes
  useEffect(() => {
    if (prescriptions.length > 0 && !selectedRx) {
      setSelectedRx(prescriptions[0]);
    }
  }, [prescriptions, selectedRx]);

  // Stop camera tracks whenever the modal closes or component unmounts
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  };

  const openCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission was denied. Please allow camera access in your browser settings and try again.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera was found on this device.");
      } else {
        setCameraError(`Could not access the camera: ${err.message || "unknown error"}.`);
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    processCapturedImage(dataUrl);
  };

  const handleGalleryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => processCapturedImage(reader.result as string);
    reader.onerror = () => setScanError("Failed to read the selected image file.");
    reader.readAsDataURL(file);
  };

  // Compress the raw capture, send it to the real Gemini vision endpoint, and store the result
  const processCapturedImage = async (rawDataUrl: string) => {
    setScanError(null);
    setScanStep('scanning');
    try {
      const [fullImage, thumbnail] = await Promise.all([
        resizeImage(rawDataUrl, 1200, 0.7),
        resizeImage(rawDataUrl, 200, 0.6)
      ]);

      const base64Payload = fullImage.split(",")[1]; // strip "data:image/jpeg;base64,"

      const res = await fetch("/api/gemini/scan-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Payload, mimeType: "image/jpeg" })
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.status === 413
            ? "The photo is too large for the server to accept. Try a smaller or lower-resolution photo."
            : `Server error (status ${res.status}). Please try again.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "The AI scanner could not process this image.");
      }

      const extractedRx = {
        doctorName: data.doctorName || "Unknown Doctor",
        doctorSpecialty: data.doctorSpecialty || "General Practitioner",
        date: data.date || new Date().toISOString().split('T')[0],
        diagnosis: data.diagnosis || "Not specified",
        notes: data.notes || "",
        signature: data.signature || "",
        medications: Array.isArray(data.medications) ? data.medications : [],
        imageBase64: fullImage,
        thumbnailBase64: thumbnail
      };

      // Persist the scanned prescription (with photo + extracted data) to Firestore right away
      await onUploadPrescription(extractedRx);
      setScannedResult(extractedRx);
      setScanStep('results');
    } catch (err: any) {
      console.error("Prescription scan failed:", err);
      setScanError(err.message || "Something went wrong while scanning. Please try again.");
      setScanStep('upload');
    }
  };

  const handleImport = (rx: Prescription | typeof scannedResult) => {
    const importable = rx.medications.map((m: any) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      instructions: `Imported from ${rx.doctorName}'s digital prescription (${rx.date}). Duration: ${m.duration}`
    }));
    onImportMedsFromPrescription(importable);
  };

  // Most recent scans, newest first, derived from real prescription data
  const recentScans = [...prescriptions].reverse().slice(0, 4);

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

              {scanError && (
                <div className="w-full max-w-xs flex items-start space-x-2 bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium p-2.5 rounded-lg text-left">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                <button
                  onClick={openCamera}
                  className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </button>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl text-xs font-bold border border-slate-200 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload from Gallery</span>
                </button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryFile}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Real camera capture modal */}
          {showCamera && (
            <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-2xl overflow-hidden w-full max-w-md relative">
                <button
                  onClick={stopCamera}
                  className="absolute top-3 right-3 z-10 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white"
                >
                  <X className="w-4 h-4" />
                </button>

                {cameraError ? (
                  <div className="p-8 text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs text-slate-200">{cameraError}</p>
                    <button
                      onClick={openCamera}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <video ref={videoRef} className="w-full h-auto max-h-[70vh] bg-black" playsInline muted />
                    <div className="p-4 flex items-center justify-center bg-slate-900">
                      <button
                        onClick={capturePhoto}
                        className="w-16 h-16 rounded-full bg-white border-4 border-red-500 hover:scale-105 transition-transform"
                        aria-label="Capture photo"
                      />
                    </div>
                  </>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
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
                {scannedResult.imageBase64 && (
                  <img
                    src={scannedResult.imageBase64}
                    alt="Captured prescription"
                    className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-white"
                  />
                )}

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
                  {scannedResult.medications.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">No medications were detected on this slip. Try a clearer photo, or add them manually.</p>
                  )}
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
              {recentScans.length === 0 && (
                <p className="text-[11px] text-slate-400 italic col-span-2">No scans yet — take a photo or upload one above to get started.</p>
              )}
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  onClick={() => setSelectedRx(scan)}
                  className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {scan.thumbnailBase64 ? (
                      <img src={scan.thumbnailBase64} alt={scan.doctorName} className="w-10 h-10 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                    ) : (
                      <div className="p-2 bg-white border border-slate-200 rounded-lg flex-shrink-0">
                        <FileUp className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-[140px]">{scan.doctorName}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{scan.date}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
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
              {selectedRx.imageBase64 && (
                <img
                  src={selectedRx.imageBase64}
                  alt="Prescription scan"
                  className="w-full max-h-48 object-contain rounded-lg border border-slate-200 bg-white"
                />
              )}
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
