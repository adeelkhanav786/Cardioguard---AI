/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { VitalSign } from "../types";
import { 
  Activity, 
  Heart, 
  Plus, 
  TrendingUp, 
  Scale, 
  ChevronRight,
  TrendingDown,
  Info 
} from "lucide-react";
import { 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  XAxis,
  YAxis
} from "recharts";

interface VitalsTrackerProps {
  vitals: VitalSign[];
  onLogVitals: (vitals: {
    heartRate: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    spo2: number;
    weight?: number;
    notes: string;
  }) => Promise<void>;
  compactMode?: boolean;
}

export default function VitalsTracker({ vitals, onLogVitals, compactMode = false }: VitalsTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [heartRate, setHeartRate] = useState(72);
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [spo2, setSpo2] = useState(98);
  const [weight, setWeight] = useState(70);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active chart tab state: 'bp' | 'hr' | 'weight'
  const [activeChartTab, setActiveChartTab] = useState<'bp' | 'hr' | 'weight'>('bp');

  // For active real-time ECG simulation
  const [ecgData, setEcgData] = useState<number[]>([]);
  const animationRef = useRef<number>(0);
  const countRef = useRef<number>(0);

  // Current live values
  const latestVital = vitals[0] || {
    heartRate: 72,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    spo2: 98,
    weight: 70
  };

  // Generate the ECG wave path in real-time
  useEffect(() => {
    const ecgPattern = [
      0, 0, 0, 0, 0, 0, 2, 4, 2, 0, 0, -2, 18, -6, 0, 2, 4, 2, 0, 0, 0, 0, 0, 0, 0
    ];
    
    let active = true;
    const runAnimation = () => {
      if (!active) return;
      
      setEcgData(prev => {
        const nextIdx = countRef.current % ecgPattern.length;
        const nextVal = ecgPattern[nextIdx] + (Math.random() * 0.5 - 0.25);
        countRef.current++;
        
        const updated = [...prev, nextVal];
        if (updated.length > (compactMode ? 40 : 80)) {
          updated.shift();
        }
        return updated;
      });

      const delay = Math.max(30, 100 - (latestVital.heartRate - 60) * 0.5);
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(runAnimation);
      }, delay);
    };

    runAnimation();

    return () => {
      active = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [latestVital.heartRate, compactMode]);

  const drawEcgPath = () => {
    if (ecgData.length === 0) return "";
    const spacing = compactMode ? 8 : 6;
    const midY = 40;
    
    return ecgData.reduce((path, val, idx) => {
      const x = idx * spacing;
      const y = midY - val * 2.2;
      return path + `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onLogVitals({
        heartRate,
        bloodPressureSystolic: systolic,
        bloodPressureDiastolic: diastolic,
        spo2,
        weight: weight || undefined,
        notes
      });
      setNotes("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to log vitals", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process historical data for Recharts (reversing to chronologic order for visual readability)
  const chartData = [...vitals].reverse().map(v => {
    const time = new Date(v.timestamp);
    const label = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return {
      name: label,
      "Heart Rate (BPM)": v.heartRate,
      "Systolic BP": v.bloodPressureSystolic,
      "Diastolic BP": v.bloodPressureDiastolic,
      "SPO2 (%)": v.spo2,
      "Weight (kg)": v.weight || 70
    };
  });

  // Calculate weight difference
  const currentWeight = latestVital.weight || 70;
  const previousWeight = vitals[1]?.weight || currentWeight;
  const weightDiff = Number((currentWeight - previousWeight).toFixed(1));

  return (
    <div className={`flex-1 flex flex-col ${compactMode ? "p-3 space-y-3 bg-red-50/30" : "p-6 space-y-6 bg-white rounded-2xl border border-red-100 shadow-md shadow-red-100/10"}`}>
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`${compactMode ? "text-base" : "text-xl"} font-bold text-slate-900 flex items-center space-x-2`}>
            <Activity className="w-5 h-5 text-red-500" />
            <span>Cardio Vitals</span>
          </h2>
          <p className="text-xs text-slate-500">Real-time cardiovascular telemetry & trends</p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Vitals</span>
          </button>
        )}
      </div>

      {/* Real-time ECG Graph Board */}
      <div className="bg-red-50/50 rounded-xl p-3 border border-red-100 overflow-hidden relative">
        <div className="absolute top-2.5 left-3 flex items-center space-x-1.5 z-10">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
          <span className="text-[9px] uppercase font-bold tracking-wider text-red-600">Live ECG Waveform</span>
        </div>

        {/* Floating Heart Rate indicator */}
        <div className="absolute top-2 right-3 flex items-center space-x-1 bg-white border border-red-100 px-2 py-0.5 rounded-md text-red-600 font-mono text-xs font-semibold z-10">
          <Heart className="w-3 h-3 animate-pulse text-red-500" />
          <span>{latestVital.heartRate} BPM</span>
        </div>

        {/* SVG ECG oscilloscope lines */}
        <div className="h-20 w-full relative mt-3 overflow-hidden">
          {/* Oscilloscope Grid background */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ef4444_1px,transparent_1px),linear-gradient(to_bottom,#ef4444_1px,transparent_1px)] bg-[size:16px_16px]"></div>
          
          <svg className="w-full h-full" viewBox={`0 0 ${compactMode ? 320 : 480} 80`} preserveAspectRatio="none">
            <path
              d={drawEcgPath()}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]"
            />
          </svg>
        </div>
      </div>

      {/* Vital Cards Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Blood Pressure */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Blood Pressure</span>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900 font-mono">
              {latestVital.bloodPressureSystolic}/{latestVital.bloodPressureDiastolic}
            </span>
            <span className="text-[10px] text-slate-500 ml-0.5">mmHg</span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded block text-center font-bold font-sans ${
            latestVital.bloodPressureSystolic < 130 && latestVital.bloodPressureDiastolic < 85
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
              : "bg-amber-50 text-amber-700 border border-amber-100"
          }`}>
            {latestVital.bloodPressureSystolic < 130 && latestVital.bloodPressureDiastolic < 85
              ? "Normal" : "Pre-Hypertension"}
          </span>
        </div>

        {/* Heart Rate */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Heart Rate</span>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900 font-mono">{latestVital.heartRate}</span>
            <span className="text-[10px] text-slate-500 ml-0.5">BPM</span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded block text-center font-bold font-sans ${
            latestVital.heartRate < 60 ? "bg-cyan-50 text-cyan-700 border border-cyan-100" :
            latestVital.heartRate <= 85 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
          }`}>
            {latestVital.heartRate < 60 ? "Bradycardia" :
             latestVital.heartRate <= 85 ? "Normal" : "Elevated"}
          </span>
        </div>

        {/* Weight */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Weight</span>
          <div className="my-1.5">
            <span className="text-xl font-black text-slate-900 font-mono">{currentWeight}</span>
            <span className="text-[10px] text-slate-500 ml-0.5">kg</span>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded block text-center font-bold font-sans flex items-center justify-center space-x-1 ${
            weightDiff < 0 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
              : weightDiff > 0 
              ? "bg-amber-50 text-amber-700 border border-amber-100" 
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}>
            {weightDiff < 0 ? (
              <>
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{Math.abs(weightDiff)} kg from last week</span>
              </>
            ) : weightDiff > 0 ? (
              <>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{weightDiff} kg from last week</span>
              </>
            ) : (
              <span>Stable weight</span>
            )}
          </span>
        </div>
      </div>

      {/* Add Manual Reading Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-red-200 space-y-3">
          <div className="flex justify-between items-center pb-1 border-b border-slate-200">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider">Log Manual Cardiac Reading</h3>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] text-slate-600 block mb-1 font-semibold">Pulse (BPM)</label>
              <input
                type="number"
                value={heartRate}
                onChange={e => setHeartRate(Number(e.target.value))}
                min="40"
                max="200"
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 text-center focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-600 block mb-1 font-semibold">Systolic BP</label>
              <input
                type="number"
                value={systolic}
                onChange={e => setSystolic(Number(e.target.value))}
                min="70"
                max="240"
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 text-center focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-600 block mb-1 font-semibold">Diastolic BP</label>
              <input
                type="number"
                value={diastolic}
                onChange={e => setDiastolic(Number(e.target.value))}
                min="40"
                max="140"
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 text-center focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-600 block mb-1 font-semibold">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(Number(e.target.value))}
                min="30"
                max="300"
                step="0.1"
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 text-center focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-slate-600 block mb-1 font-semibold">Oxygen SpO2 (%)</label>
              <input
                type="number"
                value={spo2}
                onChange={e => setSpo2(Number(e.target.value))}
                min="70"
                max="100"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-slate-600 block mb-1 font-semibold">Notes / Symptoms</label>
              <input
                type="text"
                placeholder="e.g. resting, felt slight fatigue"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-xs font-bold transition-all duration-150 flex items-center justify-center"
          >
            {isSubmitting ? "Saving Log..." : "Log Cardiac Vitals"}
          </button>
        </form>
      )}

      {/* Historical charts with interactive selector tabs */}
      {!compactMode ? (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-red-500" />
              <span>Cardio Vitals Overview & Trends</span>
            </h3>

            {/* Selector Tabs matching Frontend Mockup */}
            <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5 mt-2 sm:mt-0 shadow-inner">
              <button
                onClick={() => setActiveChartTab('bp')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  activeChartTab === 'bp' 
                    ? "bg-red-600 text-white shadow-md" 
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Blood Pressure
              </button>
              <button
                onClick={() => setActiveChartTab('hr')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  activeChartTab === 'hr' 
                    ? "bg-red-600 text-white shadow-md" 
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Heart Rate
              </button>
              <button
                onClick={() => setActiveChartTab('weight')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  activeChartTab === 'weight' 
                    ? "bg-red-600 text-white shadow-md" 
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Weight
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={
                        activeChartTab === 'bp' ? "#ef4444" : 
                        activeChartTab === 'hr' ? "#f43f5e" : "#0ea5e9"
                      } 
                      stopOpacity={0.15}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={
                        activeChartTab === 'bp' ? "#ef4444" : 
                        activeChartTab === 'hr' ? "#f43f5e" : "#0ea5e9"
                      } 
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                <YAxis 
                  domain={
                    activeChartTab === 'bp' ? [60, 160] : 
                    activeChartTab === 'hr' ? [50, 110] : [55, 95]
                  } 
                  stroke="#64748b" 
                  fontSize={9} 
                />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: '10px', color: '#0f172a' }} />
                
                {activeChartTab === 'bp' ? (
                  <>
                    <Area type="monotone" name="Systolic BP" dataKey="Systolic BP" stroke="#ef4444" fillOpacity={1} fill="url(#colorGradient)" strokeWidth={2} />
                    <Area type="monotone" name="Diastolic BP" dataKey="Diastolic BP" stroke="#38bdf8" fillOpacity={0} strokeWidth={1.5} />
                  </>
                ) : activeChartTab === 'hr' ? (
                  <Area type="monotone" name="Heart Rate (BPM)" dataKey="Heart Rate (BPM)" stroke="#f43f5e" fillOpacity={1} fill="url(#colorGradient)" strokeWidth={2} />
                ) : (
                  <Area type="monotone" name="Weight (kg)" dataKey="Weight (kg)" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorGradient)" strokeWidth={2} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[140px] overflow-y-auto">
          <span className="text-[9px] uppercase font-bold text-slate-500 block">Recent Logs</span>
          {vitals.slice(0, 3).map((v) => {
            const dateStr = new Date(v.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) + " " + new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={v.id} className="bg-white border border-slate-100 p-2 rounded-lg flex justify-between items-center text-xs">
                <span className="text-slate-500 text-[10px]">{dateStr}</span>
                <span className="text-slate-900 font-mono font-bold">{v.heartRate} bpm</span>
                <span className="text-red-600 font-mono font-semibold">{v.bloodPressureSystolic}/{v.bloodPressureDiastolic} mmHg</span>
                {v.weight && <span className="text-blue-600 font-mono font-semibold">{v.weight} kg</span>}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
