/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Heart, 
  Activity, 
  Calendar, 
  FileText, 
  Sparkles, 
  ChevronLeft,
  Settings
} from "lucide-react";

interface AndroidFrameProps {
  activeTab: 'home' | 'meds' | 'vitals' | 'prescriptions' | 'chat';
  setActiveTab: (tab: 'home' | 'meds' | 'vitals' | 'prescriptions' | 'chat') => void;
  onOpenSettings?: () => void;
  children: React.ReactNode;
}

export default function AndroidFrame({ activeTab, setActiveTab, onOpenSettings, children }: AndroidFrameProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Clean App Container */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm flex flex-col overflow-hidden h-[680px]">
        
        {/* App Title Bar */}
        <div className="bg-white text-slate-950 px-4 py-3 flex items-center justify-between border-b border-red-100">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-red-600 rounded-lg">
              <Heart className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wide text-slate-900 font-sans">CardioGuard AI</h1>
              <p className="text-[9px] text-red-600 font-bold uppercase tracking-wider">Heart Health Companion</p>
            </div>
          </div>
          
          {activeTab !== 'home' ? (
            <button 
              onClick={() => setActiveTab('home')}
              className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded-md hover:text-slate-900 hover:bg-slate-100 border border-slate-200 flex items-center space-x-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            onOpenSettings && (
              <button 
                onClick={onOpenSettings}
                className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 flex items-center transition-colors"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>

        {/* Dynamic App Screens Container */}
        <div className="flex-1 bg-slate-50 overflow-y-auto text-slate-900 flex flex-col">
          {children}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="bg-white border-t border-red-100 px-2 py-2 flex justify-around items-center text-slate-500">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
              activeTab === 'home' ? "text-red-600 bg-red-50 font-bold" : "hover:text-slate-800"
            }`}
          >
            <Heart className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button 
            onClick={() => setActiveTab('meds')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
              activeTab === 'meds' ? "text-red-600 bg-red-50 font-bold" : "hover:text-slate-800"
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Meds</span>
          </button>

          <button 
            onClick={() => setActiveTab('vitals')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
              activeTab === 'vitals' ? "text-red-600 bg-red-50 font-bold" : "hover:text-slate-800"
            }`}
          >
            <Activity className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Vitals</span>
          </button>

          <button 
            onClick={() => setActiveTab('prescriptions')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
              activeTab === 'prescriptions' ? "text-red-600 bg-red-50 font-bold" : "hover:text-slate-800"
            }`}
          >
            <FileText className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">Rx</span>
          </button>

          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
              activeTab === 'chat' ? "text-red-600 bg-red-50 font-bold" : "hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">AI Nurse</span>
          </button>
        </div>

      </div>
    </div>
  );
}
