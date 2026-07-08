/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Medication, VitalSign, Prescription, ChatMessage } from "./types";
import AndroidFrame from "./components/AndroidFrame";
import DesktopDashboard from "./components/DesktopDashboard";
import MedicationManager from "./components/MedicationManager";
import VitalsTracker from "./components/VitalsTracker";
import PrescriptionViewer from "./components/PrescriptionViewer";
import AiCompanion from "./components/AiCompanion";
import AuthScreen from "./components/AuthScreen";
import AdminPanel from "./components/AdminPanel";
import EmergencyCenter from "./components/EmergencyCenter";
import SettingsModal from "./components/SettingsModal";
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut 
} from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy
} from "firebase/firestore";
import { 
  Laptop, 
  Smartphone, 
  Heart, 
  Sparkles, 
  Info, 
  Activity, 
  Calendar, 
  FileText,
  AlertOctagon,
  LogOut,
  Settings,
  Users,
  User,
  X
} from "lucide-react";

export default function App() {
  // Platform mode state: 'desktop' or 'android'
  const [platformMode, setPlatformMode] = useState<'desktop' | 'android'>('desktop');
  
  // Mobile active screen/tab state
  const [androidTab, setAndroidTab] = useState<'home' | 'meds' | 'vitals' | 'prescriptions' | 'chat'>('home');

  // Authentication & Admin State
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [showEmergencyCenter, setShowEmergencyCenter] = useState<boolean>(false);
  const [emergencyConfig, setEmergencyConfig] = useState<any>({
    primaryEmergencyNumber: "112",
    trustedName: "",
    trustedNumber: ""
  });
  const [diseases, setDiseases] = useState<string>("");
  const [allergies, setAllergies] = useState<string>("");
  const [clinicalName, setClinicalName] = useState<string>("");

  // Settings & Notification States
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("cg_notifications_enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<any[]>([]);

  // Application database state
  const [medications, setMedications] = useState<Medication[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Default Clinical Dataset to seed Firestore on new user register
  const medicationslist =[];

  const vitalsList = [];

  const prescriptionList = [];

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Admin Role check
        const adeelEmail = "adeelkhanav786@gmail.com";
        const isUserAdmin = currentUser.email?.toLowerCase() === adeelEmail.toLowerCase() || 
                            currentUser.uid === "reviewer-demo-uid" || 
                            currentUser.uid === "adeel-khan-admin-uid";
        setIsAdmin(isUserAdmin);

        // Fetch / seed user data
        setIsLoading(true);
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (!userDocSnap.exists()) {
            // Seed new profile
            const newConfig = {
              primaryEmergencyNumber: "112", // India smart default
              trustedName: "",
              trustedNumber: ""
            };
            const defaultName = currentUser.displayName || "Patient User";
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              displayName: defaultName,
              email: currentUser.email || "",
              role: isUserAdmin ? "admin" : "patient",
              emergencyConfig: newConfig,
              diseases: "",
              allergies: "",
              registeredAt: new Date().toISOString().split('T')[0]
            });
            setEmergencyConfig(newConfig);
            setDiseases("");
            setAllergies("");
            setClinicalName(defaultName);

            // Seed default medications, vitals, prescriptions to Firestore
            await Promise.all([
              ...medicationslist.map(m => setDoc(doc(db, "users", currentUser.uid, "medications", m.id), m)),
              ...vitalsList.map(v => setDoc(doc(db, "users", currentUser.uid, "vitals", v.id), v)),
              ...prescriptionList.map(rx => setDoc(doc(db, "users", currentUser.uid, "prescriptions", rx.id), rx))
            ]);

            setMedications(medicationslist as any);
            setVitals(vitalsList as any);
            setPrescriptions(prescriptionList as any);

            // Synchronize with offline cache
            localStorage.setItem(`cg_meds_${currentUser.uid}`, JSON.stringify(medicationslist));
            localStorage.setItem(`cg_vitals_${currentUser.uid}`, JSON.stringify(vitalsList));
            localStorage.setItem(`cg_prescriptions_${currentUser.uid}`, JSON.stringify(prescriptionList));
            localStorage.setItem(`cg_config_${currentUser.uid}`, JSON.stringify(newConfig));
            localStorage.setItem(`cg_diseases_${currentUser.uid}`, "");
            localStorage.setItem(`cg_allergies_${currentUser.uid}`, "");
            localStorage.setItem(`cg_messages_${currentUser.uid}`, JSON.stringify([]));
            setIsOfflineMode(false);
          } else {
            // Existing user profile found
            const data = userDocSnap.data();
            const loadedConfig = data.emergencyConfig || {
              primaryEmergencyNumber: "112",
              trustedName: "",
              trustedNumber: ""
            };
            setEmergencyConfig(loadedConfig);
            
            const loadedDiseases = data.diseases || "";
            const loadedAllergies = data.allergies || "";
            const loadedClinicalName = data.displayName || currentUser.displayName || "Patient User";
            setDiseases(loadedDiseases);
            setAllergies(loadedAllergies);
            setClinicalName(loadedClinicalName);

            // Fetch actual user data from subcollections
            const [medsSnap, vitalsSnap, rxSnap, chatSnap] = await Promise.all([
              getDocs(collection(db, "users", currentUser.uid, "medications")),
              getDocs(collection(db, "users", currentUser.uid, "vitals")),
              getDocs(collection(db, "users", currentUser.uid, "prescriptions")),
              getDocs(collection(db, "users", currentUser.uid, "chatMessages"))
            ]);

            const loadedMeds: any[] = [];
            medsSnap.forEach(doc => loadedMeds.push(doc.data()));
            setMedications(loadedMeds);

            const loadedVitals: any[] = [];
            vitalsSnap.forEach(doc => loadedVitals.push(doc.data()));
            // Sort vitals by timestamp descending
            loadedVitals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setVitals(loadedVitals);

            const loadedRx: any[] = [];
            rxSnap.forEach(doc => loadedRx.push(doc.data()));
            setPrescriptions(loadedRx);

            const loadedMsgs: any[] = [];
            chatSnap.forEach(doc => loadedMsgs.push(doc.data()));
            // Sort messages by timestamp ascending
            loadedMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            setChatMessages(loadedMsgs);

            // Synchronize with offline cache
            localStorage.setItem(`cg_meds_${currentUser.uid}`, JSON.stringify(loadedMeds));
            localStorage.setItem(`cg_vitals_${currentUser.uid}`, JSON.stringify(loadedVitals));
            localStorage.setItem(`cg_prescriptions_${currentUser.uid}`, JSON.stringify(loadedRx));
            localStorage.setItem(`cg_config_${currentUser.uid}`, JSON.stringify(loadedConfig));
            localStorage.setItem(`cg_diseases_${currentUser.uid}`, loadedDiseases);
            localStorage.setItem(`cg_allergies_${currentUser.uid}`, loadedAllergies);
            localStorage.setItem(`cg_clinical_name_${currentUser.uid}`, loadedClinicalName);
            localStorage.setItem(`cg_messages_${currentUser.uid}`, JSON.stringify(loadedMsgs));
            setIsOfflineMode(false);
          }
        } catch (err) {
          console.warn("Firestore loading error. Attempting LocalStorage restore...", err);
          setIsOfflineMode(true);

          // Try loading from LocalStorage for this specific user
          const cachedMeds = localStorage.getItem(`cg_meds_${currentUser.uid}`);
          const cachedVitals = localStorage.getItem(`cg_vitals_${currentUser.uid}`);
          const cachedPrescriptions = localStorage.getItem(`cg_prescriptions_${currentUser.uid}`);
          const cachedConfig = localStorage.getItem(`cg_config_${currentUser.uid}`);
          const cachedDiseases = localStorage.getItem(`cg_diseases_${currentUser.uid}`);
          const cachedAllergies = localStorage.getItem(`cg_allergies_${currentUser.uid}`);
          const cachedClinicalName = localStorage.getItem(`cg_clinical_name_${currentUser.uid}`);
          const cachedMsgs = localStorage.getItem(`cg_messages_${currentUser.uid}`);

          if (cachedMeds && cachedVitals && cachedPrescriptions) {
            setMedications(JSON.parse(cachedMeds));
            setVitals(JSON.parse(cachedVitals));
            setPrescriptions(JSON.parse(cachedPrescriptions));
            if (cachedConfig) setEmergencyConfig(JSON.parse(cachedConfig));
            setDiseases(cachedDiseases || "");
            setAllergies(cachedAllergies || "");
            setClinicalName(cachedClinicalName || currentUser.displayName || "Patient User");
            if (cachedMsgs) setChatMessages(JSON.parse(cachedMsgs));
            console.log("Successfully restored user state from local offline cache.");
          } else {
            console.log("No local cache found. Seeding defaults locally.");
            setMedications(medicationslist as any);
            setVitals(vitalsList as any);
            setPrescriptions(prescriptionList as any);
            const defaultConfig = {
              primaryEmergencyNumber: "112",
              trustedName: "",
              trustedNumber: ""
            };
            const defaultName = currentUser.displayName || "Patient User";
            setEmergencyConfig(defaultConfig);
            setDiseases("");
            setAllergies("");
            setClinicalName(defaultName);
            setChatMessages([]);

            localStorage.setItem(`cg_meds_${currentUser.uid}`, JSON.stringify(medicationslist));
            localStorage.setItem(`cg_vitals_${currentUser.uid}`, JSON.stringify(vitalsList));
            localStorage.setItem(`cg_prescriptions_${currentUser.uid}`, JSON.stringify(prescriptionList));
            localStorage.setItem(`cg_config_${currentUser.uid}`, JSON.stringify(defaultConfig));
            localStorage.setItem(`cg_diseases_${currentUser.uid}`, "");
            localStorage.setItem(`cg_allergies_${currentUser.uid}`, "");
            localStorage.setItem(`cg_clinical_name_${currentUser.uid}`, defaultName);
            localStorage.setItem(`cg_messages_${currentUser.uid}`, JSON.stringify([]));
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setMedications([]);
        setVitals([]);
        setPrescriptions([]);
        setChatMessages([]);
        setIsOfflineMode(false);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (authUser: any) => {
    setUser(authUser);
    const isUserAdmin = authUser.email?.toLowerCase() === "adeelkhanav786@gmail.com" || 
                        authUser.uid === "reviewer-demo-uid" || 
                        authUser.uid === "adeel-khan-admin-uid";
    setIsAdmin(isUserAdmin);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (err) {
      console.error("Logout failed:", err);
      // fallback bypass
      setUser(null);
      setIsAdmin(false);
    }
  };

  // Synchronize notifications permission state to localStorage
  useEffect(() => {
    localStorage.setItem("cg_notifications_enabled", String(notificationsEnabled));
  }, [notificationsEnabled]);

  // Self-healing daily reset: derive "taken today" from the per-date takenHistory map
  // instead of trusting the standalone isTakenToday flag, which otherwise never resets
  // at midnight and would permanently silence reminders/checkmarks after the first dose.
  useEffect(() => {
    const reconcileDailyStatus = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      setMedications(prev => {
        let changed = false;
        const next = prev.map(m => {
          const actuallyTaken = !!(m.takenHistory && m.takenHistory[todayStr]);
          if (m.isTakenToday !== actuallyTaken) {
            changed = true;
            return { ...m, isTakenToday: actuallyTaken };
          }
          return m;
        });
        return changed ? next : prev;
      });
    };
    reconcileDailyStatus(); // fix any stale state from a previous session/day immediately
    const dailyCheckInterval = setInterval(reconcileDailyStatus, 60 * 1000); // catch midnight rollover while app stays open
    return () => clearInterval(dailyCheckInterval);
  }, []);

  // Parse "08:00 AM" style time strings into 24-hour { hour, minute }
  const parseTimeString = (timeStr: string): { hour: number; minute: number } => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return { hour: 8, minute: 0 };
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
  };

  // Stable numeric id required by LocalNotifications, derived from the medication's string id
  const stableNumericId = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 2147483647;
  };

  // Native (Android/iOS) reminders: real OS-scheduled notifications that fire even
  // if the app is closed/backgrounded — unlike the browser setInterval fallback below.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        if (!notificationsEnabled) {
          const pending = await LocalNotifications.getPending();
          if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
          }
          return;
        }

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') {
            console.warn('Notification permission denied; native medication reminders will not fire.');
            return;
          }
        }

        // Clear and reschedule fresh every time the medication list changes
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
        }

        if (medications.length > 0) {
          await LocalNotifications.schedule({
            notifications: medications.map(med => {
              const { hour, minute } = parseTimeString(med.time);
              return {
                id: stableNumericId(med.id),
                title: "Medication Reminder ⏰",
                body: `It's time to take ${med.name} (${med.dosage}).`,
                schedule: { on: { hour, minute }, allowWhileIdle: true }
              };
            })
          });
        }
      } catch (err) {
        console.error('Failed to schedule native medication reminders:', err);
      }
    })();
  }, [medications, notificationsEnabled]);

  const triggerNotificationToast = (med: Medication) => {
    const toastId = "toast-" + Math.random().toString(36).substring(2, 9);
    const newToast = {
      id: toastId,
      medication: med,
      title: "Medication Reminder ⏰",
      message: `It is now ${med.time}. Please take your prescribed dose of ${med.name} (${med.dosage}).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setToasts(prev => [...prev, newToast]);

    // Play subtle synthesized audio chime
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio Context beep was blocked by browser autoplay/iframe restrictions.", e);
    }
  };

  // Background monitoring loop to match time for reminders (web fallback only —
  // native platforms use the real OS-scheduled LocalNotifications above instead)
  useEffect(() => {
    if (!notificationsEnabled) return;
    if (Capacitor.isNativePlatform()) return;

    const interval = setInterval(() => {
      const now = new Date();
      
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strMinutes = minutes < 10 ? '0' + minutes : minutes;
      const strHours = hours < 10 ? '0' + hours : hours;
      const currentTimeString = `${strHours}:${strMinutes} ${ampm}`;

      const dateString = now.toISOString().split('T')[0];

      medications.forEach(med => {
        if (med.time === currentTimeString && !med.isTakenToday) {
          const notificationKey = `notified_${med.id}_${dateString}_${currentTimeString}`;
          const alreadyNotified = sessionStorage.getItem(notificationKey);
          
          if (!alreadyNotified) {
            sessionStorage.setItem(notificationKey, "true");
            triggerNotificationToast(med);
          }
        }
      });
    }, 5000); // Poll clock every 5 seconds

    return () => clearInterval(interval);
  }, [medications, notificationsEnabled]);

  const handleToastTake = async (toastId: string, medId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
    await handleToggleTakeMedication(medId);
  };

  const handleSaveEmergencyConfig = async (newConfig: any) => {
    setEmergencyConfig(newConfig);
    if (user) {
      localStorage.setItem(`cg_config_${user.uid}`, JSON.stringify(newConfig));
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { emergencyConfig: newConfig });
      } catch (err) {
        console.error("Failed to save emergency config to Firestore:", err);
      }
    }
  };

  const handleSaveProfileMedical = async (newDiseases: string, newAllergies: string, newDisplayName?: string) => {
    setDiseases(newDiseases);
    setAllergies(newAllergies);
    if (newDisplayName) {
      setClinicalName(newDisplayName);
    }
    if (user) {
      localStorage.setItem(`cg_diseases_${user.uid}`, newDiseases);
      localStorage.setItem(`cg_allergies_${user.uid}`, newAllergies);
      if (newDisplayName) {
        localStorage.setItem(`cg_clinical_name_${user.uid}`, newDisplayName);
      }
      try {
        const userDocRef = doc(db, "users", user.uid);
        const updates: any = {
          diseases: newDiseases,
          allergies: newAllergies
        };
        if (newDisplayName) {
          updates.displayName = newDisplayName;
        }
        await updateDoc(userDocRef, updates);
      } catch (err) {
        console.error("Failed to save patient medical profile to Firestore:", err);
      }
    }
  };

  // --- BUSINESS LOGIC HANDLERS ---

  // Toggle Medication taken today status
  const handleToggleTakeMedication = async (id: string) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isTaken = !med.isTakenToday;
    const updatedHistory = { ...med.takenHistory };
    if (isTaken) {
      updatedHistory[todayStr] = true;
    } else {
      delete updatedHistory[todayStr];
    }
    const updatedMed = {
      ...med,
      isTakenToday: isTaken,
      takenHistory: updatedHistory,
      remainingPills: isTaken ? Math.max(0, med.remainingPills - 1) : Math.min(med.totalPills, med.remainingPills + 1)
    };

    const nextMeds = medications.map(m => m.id === id ? updatedMed : m);
    // Optimistic local update
    setMedications(nextMeds);

    if (user) {
      localStorage.setItem(`cg_meds_${user.uid}`, JSON.stringify(nextMeds));
      try {
        await setDoc(doc(db, "users", user.uid, "medications", id), updatedMed);
      } catch (err) {
        console.error("Firestore sync failed for medication check:", err);
      }
    }
  };

  // Add Medication routine
  const handleAddMedication = async (newMed: {
    name: string;
    dosage: string;
    time: string;
    frequency: string;
    category: string;
    totalPills: number;
    instructions: string;
  }) => {
    const fallbackMed: Medication = {
      id: "med-" + Math.random().toString(36).substring(2, 9),
      name: newMed.name,
      dosage: newMed.dosage,
      time: newMed.time,
      frequency: newMed.frequency,
      category: newMed.category as any,
      isTakenToday: false,
      takenHistory: {},
      remainingPills: newMed.totalPills,
      totalPills: newMed.totalPills,
      instructions: newMed.instructions
    };

    const nextMeds = [...medications, fallbackMed];
    setMedications(nextMeds);

    if (user) {
      localStorage.setItem(`cg_meds_${user.uid}`, JSON.stringify(nextMeds));
      try {
        await setDoc(doc(db, "users", user.uid, "medications", fallbackMed.id), fallbackMed);
      } catch (err) {
        console.error("Firestore sync failed for adding medication:", err);
      }
    }
  };

  // Delete Medication routine
  const handleDeleteMedication = async (id: string) => {
    const nextMeds = medications.filter(m => m.id !== id);
    setMedications(nextMeds);

    if (user) {
      localStorage.setItem(`cg_meds_${user.uid}`, JSON.stringify(nextMeds));
      try {
        await deleteDoc(doc(db, "users", user.uid, "medications", id));
      } catch (err) {
        console.error("Firestore sync failed for deleting medication:", err);
      }
    }
  };

  // Log Vitals reading
  const handleLogVitals = async (newVital: {
    heartRate: number;
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    spo2: number;
    notes: string;
  }) => {
    const fallbackVital: VitalSign = {
      id: "v-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      heartRate: Number(newVital.heartRate),
      bloodPressureSystolic: Number(newVital.bloodPressureSystolic),
      bloodPressureDiastolic: Number(newVital.bloodPressureDiastolic),
      spo2: Number(newVital.spo2),
      notes: newVital.notes
    };

    const nextVitals = [fallbackVital, ...vitals];
    setVitals(nextVitals);

    if (user) {
      localStorage.setItem(`cg_vitals_${user.uid}`, JSON.stringify(nextVitals));
      try {
        await setDoc(doc(db, "users", user.uid, "vitals", fallbackVital.id), fallbackVital);
      } catch (err) {
        console.error("Firestore sync failed for logging vitals:", err);
      }
    }
  };

  // Upload prescription scan (real AI-extracted data + captured photo)
  const handleUploadPrescriptionMock = async (newRx: {
    doctorName: string;
    doctorSpecialty: string;
    date: string;
    diagnosis: string;
    notes: string;
    signature: string;
    medications: { name: string; dosage: string; frequency: string; duration: string }[];
    imageBase64?: string;
    thumbnailBase64?: string;
  }) => {
    const fallbackRx: Prescription = {
      id: "rx-" + Math.random().toString(36).substring(2, 9),
      doctorName: newRx.doctorName,
      doctorSpecialty: newRx.doctorSpecialty,
      date: newRx.date,
      medications: newRx.medications,
      diagnosis: newRx.diagnosis,
      notes: newRx.notes,
      signature: newRx.signature,
      imageBase64: newRx.imageBase64,
      thumbnailBase64: newRx.thumbnailBase64
    };

    const nextRx = [...prescriptions, fallbackRx];
    setPrescriptions(nextRx);

    if (user) {
      localStorage.setItem(`cg_prescriptions_${user.uid}`, JSON.stringify(nextRx));
      try {
        await setDoc(doc(db, "users", user.uid, "prescriptions", fallbackRx.id), fallbackRx);
      } catch (err) {
        console.error("Firestore sync failed for adding prescription:", err);
      }
    }
  };

  // Auto-sync medications imported from scan
  const handleImportMedsFromPrescription = (meds: { name: string; dosage: string; frequency: string; instructions: string }[]) => {
    meds.forEach(m => {
      handleAddMedication({
        name: m.name,
        dosage: m.dosage,
        time: "08:00 AM",
        frequency: m.frequency,
        category: "Other",
        totalPills: 30,
        instructions: m.instructions
      });
    });
  };

  // Send message to CardioGuard AI Nurse
  const handleSendMessage = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: "msg-" + Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);

    if (user) {
      localStorage.setItem(`cg_messages_${user.uid}`, JSON.stringify(updatedMessages));
      try {
        await setDoc(doc(db, "users", user.uid, "chatMessages", userMsg.id), userMsg);
      } catch (err) {
        console.error("Failed to save user chat message to Firestore:", err);
      }
    }

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages })
      });

      if (res.ok) {
        const data = await res.json();
        const modelMsg: ChatMessage = {
          id: "msg-" + Math.random().toString(36).substring(2, 9),
          role: 'model',
          content: data.text,
          timestamp: new Date().toISOString()
        };
        
        setChatMessages(prev => {
          const nextMsgs = [...prev, modelMsg];
          if (user) localStorage.setItem(`cg_messages_${user.uid}`, JSON.stringify(nextMsgs));
          return nextMsgs;
        });

        if (user) {
          try {
            await setDoc(doc(db, "users", user.uid, "chatMessages", modelMsg.id), modelMsg);
          } catch (err) {
            console.error("Failed to save AI chat message to Firestore:", err);
          }
        }
      } else {
        throw new Error("API failed");
      }
    } catch (err) {
      // Offline fallback state in case API server is unreachable
      const fallbackText = "I'm experiencing connectivity issues reaching our clinical AI core, but remember: keep taking your blood pressure medication on time. If you feel severe shortness of breath or chest tightness, call your configured emergency SOS line immediately.";
      const modelMsg: ChatMessage = {
        id: "msg-" + Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: fallbackText,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => {
        const nextMsgs = [...prev, modelMsg];
        if (user) localStorage.setItem(`cg_messages_${user.uid}`, JSON.stringify(nextMsgs));
        return nextMsgs;
      });

      if (user) {
        try {
          await setDoc(doc(db, "users", user.uid, "chatMessages", modelMsg.id), modelMsg);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  // --- SCREEN RENDERING FOR SIMULATED ANDROID VIEW ---
  const renderAndroidScreen = () => {
    switch (androidTab) {
      case 'meds':
        return (
          <MedicationManager
            medications={medications}
            onToggleTake={handleToggleTakeMedication}
            onAddMedication={handleAddMedication}
            onDeleteMedication={handleDeleteMedication}
            compactMode={true}
          />
        );
      case 'vitals':
        return (
          <VitalsTracker
            vitals={vitals}
            onLogVitals={handleLogVitals}
            compactMode={true}
          />
        );
      case 'prescriptions':
        return (
          <PrescriptionViewer
            prescriptions={prescriptions}
            onUploadPrescription={handleUploadPrescriptionMock}
            onImportMedsFromPrescription={handleImportMedsFromPrescription}
            compactMode={true}
          />
        );
      case 'chat':
        return (
          <AiCompanion
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            compactMode={true}
          />
        );
      case 'home':
      default:
        // Android App Home Screen Dashboard
        const todayStr = "Friday, July 3";
        const pendingCount = medications.filter(m => !m.isTakenToday).length;
        const compliancePct = medications.length > 0 ? Math.round((medications.filter(m => m.isTakenToday).length / medications.length) * 100) : 100;
        const patientName = clinicalName || user?.displayName || user?.email?.split('@')[0] || user?.phoneNumber || "Patient User";

        return (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto bg-slate-50">
            {/* Quick Header */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">{todayStr}</span>
                <h2 className="text-base font-extrabold text-slate-900 font-sans">Hello, {patientName}</h2>
              </div>
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center border border-red-100 text-xs text-red-600 font-bold">
                {patientName.substring(0, 2).toUpperCase()}
              </div>
            </div>

            {/* EMERGENCY SOS TRIGGER WIDGET */}
            <div 
              onClick={() => setShowEmergencyCenter(true)}
              className="bg-gradient-to-r from-red-600 to-rose-600 p-4 rounded-2xl text-white cursor-pointer hover:shadow-lg hover:shadow-red-500/10 transition-all space-y-2.5 relative overflow-hidden"
            >
              <div className="absolute right-[-10px] bottom-[-10px] text-white/5 opacity-25">
                <AlertOctagon className="w-24 h-24" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-100">Clinical SOS Direct</span>
                </div>
                <span className="bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  SOS: {emergencyConfig.primaryEmergencyNumber}
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-tight">Emergency SOS Centre</h3>
                <p className="text-[10px] text-red-100 leading-normal">
                  Tap here to trigger clinical SOS, alert family, and download medical summary PDF.
                </p>
              </div>
            </div>

            {/* Simulated Live ECG Wave Quick Preview Banner */}
            <div 
              onClick={() => setAndroidTab('vitals')}
              className="bg-red-50/50 border border-red-100 p-3 rounded-xl cursor-pointer hover:border-red-200 transition-all flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center space-x-2.5">
                <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Live Telemetry</span>
                  <span className="text-xs font-bold text-slate-900 font-mono">{vitals[0]?.heartRate || 72} BPM • {vitals[0]?.bloodPressureSystolic || 120}/{vitals[0]?.bloodPressureDiastolic || 80} mmHg</span>
                </div>
              </div>
              <span className="text-[10px] text-red-600 font-bold">Monitor →</span>
            </div>

            {/* Clinical Profile Quick Info Snapshot */}
            <div className="bg-white border border-red-100 p-3.5 rounded-xl space-y-2 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-red-50 rounded text-red-600">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900">Clinical Profile Snapshot</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed">
                <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                  <span className="text-slate-400 font-bold uppercase text-[8px] block tracking-wide">Conditions</span>
                  <span className="text-slate-700 font-extrabold block truncate" title={diseases || "None Declared"}>
                    {diseases || "None Declared"}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                  <span className="text-slate-400 font-bold uppercase text-[8px] block tracking-wide">Allergies</span>
                  <span className="text-red-600 font-extrabold block truncate" title={allergies || "None Declared"}>
                    {allergies || "None Declared"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Medicine Checklist Stats card */}
            <div 
              onClick={() => setAndroidTab('meds')}
              className="bg-white border border-red-100 p-4 rounded-xl cursor-pointer hover:border-red-200 transition-all space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-slate-900">Daily Medication Checklist</span>
                </div>
                <span className="text-[10px] bg-red-50 border border-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  {compliancePct}% Done
                </span>
              </div>

              <div className="space-y-1 text-slate-700 text-xs">
                {pendingCount > 0 ? (
                  <p className="font-semibold text-slate-800">⚠️ You have {pendingCount} medicines left to take today.</p>
                ) : (
                  <p className="font-semibold text-emerald-600 flex items-center space-x-1">
                    <span>✓ All medications taken today! Keep up the great work.</span>
                  </p>
                )}
              </div>
            </div>

            {/* Prescriptions Vault Quick access */}
            <div 
              onClick={() => setAndroidTab('prescriptions')}
              className="bg-white border border-red-100 p-3.5 rounded-xl cursor-pointer hover:border-red-200 transition-all flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-red-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900">Digital Prescription Vault</span>
                  <p className="text-[10px] text-slate-500">{prescriptions.length} doctor slips stored securely</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">→</span>
            </div>

            {/* Quick AI Nurse Support button */}
            <div 
              onClick={() => setAndroidTab('chat')}
              className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 p-4 rounded-xl cursor-pointer hover:border-red-200 transition-all space-y-1.5 shadow-sm"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-red-600 animate-bounce" />
                <span className="text-xs font-bold text-slate-900">Consult CardioGuard Nurse AI</span>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Have questions about beta-blocker routines, side effects, or heart-healthy recipes? Ask our virtual medical core!
              </p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <Heart className="w-12 h-12 text-red-600 animate-pulse mb-3" />
        <span className="text-sm font-semibold tracking-wide text-slate-900 animate-pulse">Synchronizing clinical databases...</span>
      </div>
    );
  }

  // Wrapper for non-authenticated states
  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const activePatientName = user?.displayName || user?.email || user?.phoneNumber || "Patient User";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Dynamic Top Navigation Bar / Platform Switcher */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-red-100 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-600/20">
              <Heart className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900 font-sans">CardioGuard AI</h1>
                <span className="bg-red-50 border border-red-100 text-red-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {isAdmin ? "Admin Console" : "Patient Portal"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
                <span>Signed in: <span className="font-bold text-slate-700">{user.email || user.phoneNumber || "Reviewer Mode"}</span></span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center space-x-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOfflineMode ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {isOfflineMode ? "Offline (Saved locally)" : "Cloud Synced"}
                  </span>
                </span>
              </p>
            </div>
          </div>

          {/* Interactive Controls & Platform Toggles */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            
            {/* Quick-Launch Emergency SOS Hub */}
            <button
              onClick={() => setShowEmergencyCenter(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black tracking-wider shadow-md shadow-red-600/10 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <AlertOctagon className="w-4 h-4 text-white animate-pulse" />
              <span>EMERGENCY SOS HUB</span>
            </button>

            {/* Admin Switcher */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(prev => !prev)}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black tracking-wide border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  showAdminPanel 
                    ? "bg-slate-950 border-slate-950 text-white shadow-md shadow-slate-950/10" 
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Users className="w-4 h-4 text-red-500" />
                <span>{showAdminPanel ? "Patient View" : "Clinical Admin Panel"}</span>
              </button>
            )}

            {/* Platform toggler only visible when patient view is active */}
            {!showAdminPanel && (
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-inner">
                <button
                  onClick={() => setPlatformMode('desktop')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                    platformMode === 'desktop' 
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Desktop View</span>
                </button>

                <button
                  onClick={() => setPlatformMode('android')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                    platformMode === 'android' 
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Simulated Phone</span>
                </button>
              </div>
            )}

            {/* Settings */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer hover:border-red-200 hover:text-red-600"
              title="System Settings"
            >
              <Settings className="w-4 h-4 text-slate-500 hover:text-slate-850" />
            </button>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer hover:border-red-200 hover:text-red-600"
              title="Sign Out Account"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>

        </div>
      </header>

      {/* Emergency Center overlay modal */}
      {showEmergencyCenter && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl relative animate-in fade-in zoom-in-95 duration-200 my-8">
            <EmergencyCenter
              medications={medications}
              vitals={vitals}
              prescriptions={prescriptions}
              patientName={activePatientName}
              emergencyConfig={emergencyConfig}
              onSaveConfig={handleSaveEmergencyConfig}
              onClose={() => setShowEmergencyCenter(false)}
              diseases={diseases}
              allergies={allergies}
            />
          </div>
        </div>
      )}

      {/* Main Container Area */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {showAdminPanel ? (
          // Admin Panel System View
          <AdminPanel 
            currentAdminEmail={user?.email || "adeelkhanav786@gmail.com"} 
            onClose={() => setShowAdminPanel(false)} 
          />
        ) : platformMode === 'desktop' ? (
          // Full-Scale Desktop Web Dashboard (Bento Grid)
          <DesktopDashboard
            medications={medications}
            vitals={vitals}
            prescriptions={prescriptions}
            chatMessages={chatMessages}
            onToggleTake={handleToggleTakeMedication}
            onAddMedication={handleAddMedication}
            onDeleteMedication={handleDeleteMedication}
            onLogVitals={handleLogVitals}
            onUploadPrescription={handleUploadPrescriptionMock}
            onImportMedsFromPrescription={handleImportMedsFromPrescription}
            onSendMessage={handleSendMessage}
            patientName={activePatientName}
            diseases={diseases}
            allergies={allergies}
          />
        ) : (
          // Simulated Smartphone view (demonstrating true mobile experience)
          <div className="flex flex-col items-center space-y-4">
            <div className="max-w-md text-center space-y-1 px-4">
              <h3 className="text-sm font-bold text-slate-900 font-sans">Interactive Android Experience</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Check off medication doses, record heart vitals, scan doctors' slips, or message the AI Nurse. Everything syncs dynamically using Firebase Cloud Firestore, simulating standard native multi-client systems.
              </p>
            </div>

            <AndroidFrame 
              activeTab={androidTab} 
              setActiveTab={setAndroidTab}
              onOpenSettings={() => setShowSettingsModal(true)}
            >
              {renderAndroidScreen()}
            </AndroidFrame>
          </div>
        )}
      </main>

      {/* Settings Panel modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        notificationsEnabled={notificationsEnabled}
        setNotificationsEnabled={setNotificationsEnabled}
        medications={medications}
        onTriggerTestNotification={(med) => triggerNotificationToast(med)}
        patientName={activePatientName}
        diseases={diseases}
        allergies={allergies}
        onSaveProfile={handleSaveProfileMedical}
      />

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[150] w-full max-w-sm flex flex-col gap-3 pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 bg-red-600 rounded-lg text-white">
                  <Heart className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-tight">{toast.title}</h4>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
                </div>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
              <span className="text-[9px] text-slate-400 font-mono">Alarm Reminders Panel</span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleToastTake(toast.id, toast.medication.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-md transition-colors"
                >
                  Take Now
                </button>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Footer */}
      <footer className="bg-white border-t border-red-100 py-6 text-center text-xs text-slate-500 shadow-sm">
        <p>© 2026 CardioGuard AI Multiplatform Support. Real-time Firebase Cloud Integrations.</p>
        <p className="mt-1 text-[10px]">Medical Disclaimer: AI predictions are for clinical backup & organizational support. Consult certified cardiologists in core emergencies.</p>
      </footer>

    </div>
  );
}
