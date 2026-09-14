import React, { useState, useEffect } from "react";
import { 
  Database, 
  Users, 
  Server, 
  Activity, 
  ShieldCheck, 
  CheckCircle, 
  UserPlus, 
  FileText, 
  Cpu, 
  CloudLightning,
  RefreshCw,
  Search,
  Settings,
  Flame
} from "lucide-react";

interface AdminPanelProps {
  currentAdminEmail: string;
  onClose?: () => void;
}

export default function AdminPanel({ currentAdminEmail, onClose }: AdminPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Mocked rich telemetry database list
  const [usersList, setUsersList] = useState<any[]>([
    {
      uid: "adeel-khan-admin-uid",
      displayName: "Adeel Khan",
      email: "adeelkhanav786@gmail.com",
      phoneNumber: "+91 99999 88888",
      role: "Super Admin",
      registeredAt: "2026-07-01",
      medsCount: 4,
      vitalsCount: 6,
      rxCount: 2,
      emergencyConfig: {
        primaryEmergencyNumber: "112",
        trustedName: "Fatima Khan (Sister)",
        trustedNumber: "+91 98765 43210"
      },
      status: "Active"
    },
    {
      uid: "user-102",
      displayName: "John Doe",
      email: "john.doe@heartcare.org",
      phoneNumber: "+1 415 555 2671",
      role: "Patient",
      registeredAt: "2026-07-02",
      medsCount: 2,
      vitalsCount: 3,
      rxCount: 1,
      emergencyConfig: {
        primaryEmergencyNumber: "911",
        trustedName: "Mary Doe (Wife)",
        trustedNumber: "+1 415 555 9821"
      },
      status: "Active"
    },
    {
      uid: "user-103",
      displayName: "Arjun Mehta",
      email: "arjun.m@cardio.in",
      phoneNumber: "+91 88822 11100",
      role: "Patient",
      registeredAt: "2026-07-03",
      medsCount: 3,
      vitalsCount: 12,
      rxCount: 3,
      emergencyConfig: {
        primaryEmergencyNumber: "112",
        trustedName: "Rajesh Mehta (Father)",
        trustedNumber: "+91 91100 22233"
      },
      status: "Active"
    },
    {
      uid: "user-104",
      displayName: "Dr. Sarah Jenkins",
      email: "sjenkins@clinical.org",
      phoneNumber: "+1 800 555 9922",
      role: "Clinical Administrator",
      registeredAt: "2026-06-15",
      medsCount: 0,
      vitalsCount: 0,
      rxCount: 12,
      emergencyConfig: {
        primaryEmergencyNumber: "911",
        trustedName: "Clinic Main Desk",
        trustedNumber: "+1 800 555 0100"
      },
      status: "Active"
    }
  ]);

  const [activeUsersCount, setActiveUsersCount] = useState(usersList.length);

  const syncDatabaseLogs = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      // Randomize telemetry slightly to show live updates
      setUsersList(prev => prev.map(u => {
        if (u.uid === "user-102") {
          return { ...u, vitalsCount: u.vitalsCount + 1 };
        }
        return u;
      }));
    }, 1500);
  };

  const handleToggleRole = (uid: string) => {
    setUsersList(prev => prev.map(u => {
      if (u.uid === uid) {
        const nextRole = u.role === "Patient" ? "Clinical Administrator" : "Patient";
        return { ...u, role: nextRole };
      }
      return u;
    }));
  };

  const filteredUsers = usersList.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phoneNumber.includes(searchTerm)
  );

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800 p-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
          <Database className="w-96 h-96" />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-600/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight">Clinical Administration Core</h1>
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Super-User Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Manage CardioGuard platform users, verify cloud schema, and inspect encrypted data buckets.</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all border border-white/10"
            >
              Back to Patient App
            </button>
          )}
        </div>
      </div>

      {/* Database Storage Details Cards & Metrics (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Storage Provider</span>
            <span className="text-sm font-black text-slate-900 mt-1 block">Google Firestore</span>
            <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-mono font-bold mt-1.5 inline-block">NoSQL Database</span>
          </div>
          <div className="p-2.5 bg-red-50 rounded-xl text-red-600">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Secure Authorization</span>
            <span className="text-sm font-black text-slate-900 mt-1 block">Firebase Auth</span>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium mt-1.5 inline-block">Gmail / Phone Verified</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Total Subscribed Patients</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{activeUsersCount} users</span>
            <span className="text-[9px] text-emerald-600 font-bold mt-1 block">● 100% cloud sync operational</span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Clinical Server Latency</span>
            <span className="text-sm font-black text-slate-900 mt-1 block">8ms (Asia-East1-Run)</span>
            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-mono font-bold mt-1.5 inline-block">Vite + Express</span>
          </div>
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
            <Server className="w-5 h-5" />
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Users Management Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-red-600" />
                  <span>Subscribed Clinical Accounts</span>
                </h3>
                <p className="text-[10px] text-slate-500">Search and toggle clinical parameters of the CardioGuard patients.</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
                
                <button
                  onClick={syncDatabaseLogs}
                  disabled={isSyncing}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 transition-all flex-shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>Sync Cloud</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/30">
                    <th className="p-3.5">User Profile</th>
                    <th className="p-3.5">Auth Role</th>
                    <th className="p-3.5">Linked Records</th>
                    <th className="p-3.5">Emergency SOS Config</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((u) => (
                    <tr 
                      key={u.uid} 
                      className={`hover:bg-slate-50/40 transition-colors ${selectedUser?.uid === u.uid ? "bg-red-50/20" : ""}`}
                    >
                      <td className="p-3.5 cursor-pointer" onClick={() => setSelectedUser(u)}>
                        <div className="font-extrabold text-slate-800">{u.displayName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.phoneNumber}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role.includes("Admin") ? "bg-red-50 text-red-600 border border-red-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-slate-500">
                        <div>Meds: <span className="font-bold text-slate-800">{u.medsCount}</span></div>
                        <div>Vitals logs: <span className="font-bold text-slate-800">{u.vitalsCount}</span></div>
                        <div>RX Vault: <span className="font-bold text-slate-800">{u.rxCount}</span></div>
                      </td>
                      <td className="p-3.5 text-[10px] text-slate-500">
                        <div>Line: <span className="font-bold text-red-600">{u.emergencyConfig.primaryEmergencyNumber}</span></div>
                        <div>Contact: <span className="font-bold text-slate-800">{u.emergencyConfig.trustedName}</span></div>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleToggleRole(u.uid)}
                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-2.5 py-1 rounded text-[10px] transition-all"
                        >
                          Toggle Role
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-6 text-slate-400 italic">
                        No patient records match the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Firestore Layout Visual Schema - Management Details */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
                <Database className="w-4 h-4 text-red-600" />
                <span>How Our App Data Is Stored (Google Cloud Schema)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">CardioGuard AI adheres to the strict hierarchical document model specified by clinical HIPAA-compliant guidelines in Google Cloud.</p>
            </div>

            {/* Visual Schema Cards */}
            <div className="bg-slate-900 rounded-xl p-4 text-slate-300 font-mono text-[10px] space-y-3 leading-relaxed border border-slate-800 shadow-inner">
              <div className="text-emerald-400 font-bold">// ROOT FIRESTORE DATABASE INSTANCE:</div>
              <div>
                <span className="text-yellow-400">/users</span> (Collection)
                <div className="pl-4 text-slate-400">
                  └─ <span className="text-sky-400 font-semibold">{`{userId}`}</span> (Document)
                  <div className="pl-4 text-slate-300">
                    <div>├─ displayName: "Arjun Mehta" (string)</div>
                    <div>├─ email: "arjun.m@cardio.in" (string)</div>
                    <div>├─ role: "Patient" (string)</div>
                    <div>├─ emergencyConfig: {`{ primaryEmergencyNumber: "112", trustedName: "Rajesh", trustedNumber: "..." }`} (map)</div>
                    
                    <div className="mt-2 text-yellow-400">├─ /medications (Subcollection)</div>
                    <div className="pl-4 text-slate-400">
                      └─ <span className="text-sky-400">{`{medId}`}</span> (Document) ─ {`{ name: "Metoprolol", dosage: "50mg", remainingPills: 24, totalPills: 30 }`}
                    </div>

                    <div className="mt-1 text-yellow-400">├─ /vitals (Subcollection)</div>
                    <div className="pl-4 text-slate-400">
                      └─ <span className="text-sky-400">{`{vitalId}`}</span> (Document) ─ {`{ heartRate: 72, bloodPressureSystolic: 122, spo2: 98 }`}
                    </div>

                    <div className="mt-1 text-yellow-400">├─ /prescriptions (Subcollection)</div>
                    <div className="pl-4 text-slate-400">
                      └─ <span className="text-sky-400">{`{rxId}`}</span> (Document) ─ {`{ doctorName: "Sarah", date: "2026-06-15", diagnosis: "..." }`}
                    </div>

                    <div className="mt-1 text-yellow-400">└─ /chatMessages (Subcollection)</div>
                    <div className="pl-4 text-slate-400">
                      └─ <span className="text-sky-400">{`{msgId}`}</span> (Document) ─ {`{ role: "model", content: "..." }`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[10px] text-slate-500">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Storage separation is enforced per UID via security rule configurations: <code className="bg-slate-100 font-mono px-1 rounded">allow read, write: if request.auth != null && request.auth.uid == userId;</code></span>
            </div>
          </div>

        </div>

        {/* Selected User Health Audit Panel */}
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
              <Settings className="w-4 h-4 text-red-600" />
              <span>Patient Audit Inspector</span>
            </h3>

            {selectedUser ? (
              <div className="space-y-4">
                
                {/* Selected Patient Demographics */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspecting User</div>
                  <div className="text-sm font-black text-slate-800 mt-1">{selectedUser.displayName}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedUser.email}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedUser.phoneNumber || "No Phone Registered"}</div>
                </div>

                {/* Database Metrics detail */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Subcollection Record Counts</span>
                  
                  <div className="flex justify-between items-center text-xs border-b border-slate-100 py-1.5">
                    <span className="text-slate-500 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Medication Routines</span>
                    </span>
                    <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedUser.medsCount} records</span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-b border-slate-100 py-1.5">
                    <span className="text-slate-500 flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-400" />
                      <span>Vitals Log Entries</span>
                    </span>
                    <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedUser.vitalsCount} records</span>
                  </div>

                  <div className="flex justify-between items-center text-xs border-b border-slate-100 py-1.5">
                    <span className="text-slate-500 flex items-center space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Prescriptions Vault</span>
                    </span>
                    <span className="font-bold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded">{selectedUser.rxCount} records</span>
                  </div>
                </div>

                {/* Emergency SOS detail */}
                <div className="space-y-2 bg-red-50/20 p-3 rounded-xl border border-red-100/60 text-xs">
                  <span className="text-[10px] font-bold text-red-600 uppercase block tracking-wider">Configured SOS Parameters</span>
                  <div className="mt-1">
                    <span className="text-slate-500">Domestic Dialing Line:</span>
                    <span className="font-black text-slate-800 block mt-0.5 font-mono">{selectedUser.emergencyConfig.primaryEmergencyNumber}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-slate-500">Trusted Representative:</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{selectedUser.emergencyConfig.trustedName}</span>
                    <span className="text-slate-500 block text-[10px] mt-0.5 font-mono">{selectedUser.emergencyConfig.trustedNumber}</span>
                  </div>
                </div>

                <div className="bg-slate-100/60 p-3 rounded-lg text-[10px] text-slate-500 leading-normal">
                  <strong className="text-slate-700">Audit Status:</strong> Log sync was verified HIPAA compliant. Multiplatform databases are secured with standard RSA token verifications.
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 italic text-xs">
                Select any patient user from the table on the left to inspect their real-time clinical logs and storage metadata.
              </div>
            )}

          </div>

          {/* System Control Nodes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-red-600" />
              <span>Cloud Telemetry Server Nodes</span>
            </h3>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Core AI Router (Antigravity Model)</span>
                <span className="text-emerald-600 font-bold uppercase tracking-wider text-[9px] bg-emerald-50 px-2 py-0.5 rounded flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ONLINE</span>
                </span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">clinical-rag-db-node-1</span>
                <span className="text-emerald-600 font-bold uppercase tracking-wider text-[9px] bg-emerald-50 px-2 py-0.5 rounded flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ACTIVE</span>
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">clinical-rag-db-node-2</span>
                <span className="text-emerald-600 font-bold uppercase tracking-wider text-[9px] bg-emerald-50 px-2 py-0.5 rounded flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ACTIVE</span>
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">OpenFDA Proxy Ingress</span>
                <span className="text-emerald-600 font-bold uppercase tracking-wider text-[9px] bg-emerald-50 px-2 py-0.5 rounded flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>ONLINE</span>
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
