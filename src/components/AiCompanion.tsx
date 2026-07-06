/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { 
  Sparkles, 
  Send, 
  Mic, 
  ThumbsUp, 
  ThumbsDown, 
  User, 
  Info, 
  AlertTriangle 
} from "lucide-react";

interface AiCompanionProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  compactMode?: boolean;
}

export default function AiCompanion({ messages, onSendMessage, compactMode = false }: AiCompanionProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [likedMessages, setLikedMessages] = useState<{ [id: string]: 'like' | 'dislike' }>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const textToSend = input;
    setInput("");
    setIsLoading(true);
    try {
      await onSendMessage(textToSend);
    } catch (err) {
      console.error("AI error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeedback = (msgId: string, type: 'like' | 'dislike') => {
    setLikedMessages(prev => {
      const current = prev[msgId];
      if (current === type) {
        const copy = { ...prev };
        delete copy[msgId];
        return copy;
      }
      return { ...prev, [msgId]: type };
    });
  };

  const renderFormattedMessage = (content: string) => {
    return content.split('\n').map((line, lIdx) => {
      let isHeader = false;
      let cleanLine = line;
      
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        isHeader = true;
        cleanLine = headerMatch[2];
      } else if (line.trim().startsWith("##") || line.trim().startsWith("###")) {
        isHeader = true;
        cleanLine = line.replace(/^#+\s*/, "");
      }
      
      const parts: React.ReactNode[] = [];
      let currentIndex = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let partIdx = 0;
      while ((match = boldRegex.exec(cleanLine)) !== null) {
        const matchIndex = match.index;
        if (matchIndex > currentIndex) {
          parts.push(cleanLine.substring(currentIndex, matchIndex));
        }
        parts.push(
          <strong key={`${lIdx}-bold-${partIdx}`} className="font-extrabold text-slate-950 px-1 bg-red-50 rounded">
            {match[1]}
          </strong>
        );
        currentIndex = boldRegex.lastIndex;
        partIdx++;
      }
      if (currentIndex < cleanLine.length) {
        parts.push(cleanLine.substring(currentIndex));
      }

      if (isHeader) {
        return (
          <h4 key={lIdx} className="text-xs font-black text-red-600 mt-2.5 mb-1.5 first:mt-0 tracking-tight flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            <span>{parts.length > 0 ? parts : cleanLine}</span>
          </h4>
        );
      }

      return (
        <p key={lIdx} className={lIdx > 0 ? "mt-1.5 leading-relaxed" : "leading-relaxed"}>
          {parts.length > 0 ? parts : cleanLine}
        </p>
      );
    });
  };

  // Check if any message mentions emergency phrases for safety alerts
  const lastMessage = messages[messages.length - 1];
  const containsEmergency = lastMessage && lastMessage.role === 'model' && 
    (lastMessage.content.includes("EMERGENCY") || lastMessage.content.includes("⚠️") || lastMessage.content.includes("911"));

  return (
    <div className={`flex-1 flex flex-col h-full ${compactMode ? "p-3 space-y-3 bg-red-50/30" : "p-6 space-y-4 bg-white rounded-2xl border border-red-100 shadow-md shadow-red-100/10"}`}>
      
      {/* AI Title Banner */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
        <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-md shadow-red-500/10">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
            <span>Ask CardioGuard AI</span>
            <span className="text-[8px] bg-red-50 border border-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              RAG Engine Active
            </span>
          </h2>
          <p className="text-[10px] text-slate-500 font-medium">Cardiovascular clinical nurse assistant</p>
        </div>
      </div>

      {/* Warning Card at top */}
      <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100/60 flex items-start space-x-2 text-[10px] text-slate-600">
        <Info className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Clinical Disclaimer: </span>
          Retrieves active health history from vector DB combined with DDInter/OpenFDA. Always verify therapeutic routines with Dr. Jenkins.
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 overflow-y-auto space-y-3.5 min-h-[320px] flex flex-col justify-between">
        
        <div className="space-y-4 flex-1">
          {/* Welcome Message */}
          <div className="flex items-start space-x-2.5">
            <div className="p-1 bg-red-50 rounded-lg text-red-500 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 text-xs text-slate-700 max-w-[85%] leading-relaxed space-y-2">
              <p>Good morning John! I've loaded your longitudinal health memory (Atrial Fibrillation history, blood pressure logs, and daily medications). How can I assist with your cardiac safety today?</p>
              
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase block">Suggested Questions</span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button 
                    onClick={() => {
                      setInput("Can I take ibuprofen with my BP medicine?");
                      handleSend({ preventDefault: () => {} } as any);
                    }}
                    className="bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-200 text-[10px] text-left text-slate-700 block truncate transition-colors"
                  >
                    Can I take ibuprofen with my BP medicine?
                  </button>
                  <button 
                    onClick={() => {
                      setInput("Is Metoprolol safe with grapefruit juice?");
                      handleSend({ preventDefault: () => {} } as any);
                    }}
                    className="bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-200 text-[10px] text-left text-slate-700 block truncate transition-colors"
                  >
                    Is Metoprolol safe with grapefruit juice?
                  </button>
                  <button 
                    onClick={() => {
                      setInput("What are minor symptoms to watch for on anticoagulants?");
                      handleSend({ preventDefault: () => {} } as any);
                    }}
                    className="bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-200 text-[10px] text-left text-slate-700 block truncate transition-colors"
                  >
                    Symptoms to watch for on anticoagulants?
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User & Model Messages */}
          {messages.map((m) => (
            <div 
              key={m.id}
              className={`flex items-start space-x-2.5 ${m.role === 'user' ? "justify-end" : "justify-start"}`}
            >
              {m.role === 'model' && (
                <div className="p-1 bg-red-50 rounded-lg text-red-500 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              
              <div className="space-y-1 max-w-[85%]">
                <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                  m.role === 'user' 
                    ? "bg-red-600 border-red-500 text-white rounded-tr-none font-medium" 
                    : m.content.includes("⚠️") 
                      ? "bg-red-50 border-red-200 text-slate-800 rounded-tl-none font-semibold"
                      : "bg-white border-slate-200 text-slate-700 rounded-tl-none"
                }`}>
                  {renderFormattedMessage(m.content)}

                  {/* Render Sources Citation Block if model response */}
                  {m.role === 'model' && !m.content.includes("EMERGENCY") && (
                    <div className="mt-3 pt-2.5 border-t border-slate-150 text-[10px] text-slate-500 space-y-1">
                      <span className="font-bold text-slate-700 block uppercase tracking-wider text-[8px]">Sources Checked</span>
                      <div className="flex space-x-2 font-medium">
                        <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-red-600">DDInter</span>
                        <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-sky-600">OpenFDA</span>
                        <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-emerald-600">Vector Longitudinal Memory</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Thumbs up / down feedback panel for model response */}
                {m.role === 'model' && (
                  <div className="flex items-center space-x-2 pl-2">
                    <button 
                      onClick={() => toggleFeedback(m.id, 'like')}
                      className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                        likedMessages[m.id] === 'like' ? "text-red-500" : "text-slate-400"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => toggleFeedback(m.id, 'dislike')}
                      className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                        likedMessages[m.id] === 'dislike' ? "text-red-500" : "text-slate-400"
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="p-1 bg-slate-100 rounded-lg text-slate-600 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2.5">
              <div className="p-1 bg-red-50 rounded-lg text-red-500 animate-spin">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] text-slate-500 italic font-medium">Retrieving vector embeddings & scanning medical APIs...</span>
            </div>
          )}

          {/* Emergency Red Flashing Card */}
          {containsEmergency && (
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 text-center space-y-2 animate-pulse mt-4">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <h4 className="text-xs font-black text-red-600 tracking-wider uppercase">Emergency Warning Triggered</h4>
              <p className="text-[10px] text-slate-700">
                You reported signs of chest pain, pressure, or symptoms of acute events. Do not delay!
              </p>
              <div className="pt-1.5">
                <a 
                  href="tel:911" 
                  className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500 inline-block animate-bounce"
                >
                  🚨 DIAL 911 / EMS NOW
                </a>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

      </div>

      {/* Input Message Form with Mic and Send Buttons */}
      <form onSubmit={handleSend} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "Analyzing guidelines..." : "Ask anything about your health..."}
            disabled={isLoading}
            className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 transition-colors"
          />
          <button
            type="button"
            onClick={() => {
              setInput("Can I take Aspirin with Lisinopril?");
              alert("Microphone feature simulated! Suggested question inserted.");
            }}
            className="absolute right-3 top-3 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-all shadow-md flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
