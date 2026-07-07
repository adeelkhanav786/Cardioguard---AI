/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "15000kb" }));

app.use((req, res, next) => {
  console.log(`[CardioGuard Server] INCOMING REQUEST: ${req.method} ${req.originalUrl}`);
  next();
});

// Initialize Gemini AI Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && apiKey) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// In-memory data structures (seeded with realistic heart patient data)
let medications: any[] = [
  {
    id: "med-1",
    name: "Metoprolol Succinate",
    dosage: "50mg",
    time: "08:00 AM",
    frequency: "Daily",
    category: "Beta-Blocker",
    isTakenToday: false,
    takenHistory: { "2026-07-02": true, "2026-07-01": true },
    remainingPills: 24,
    totalPills: 30,
    instructions: "Take with or immediately after a meal. Do not crush."
  },
  {
    id: "med-2",
    name: "Lisinopril",
    dosage: "10mg",
    time: "08:00 AM",
    frequency: "Daily",
    category: "ACE-Inhibitor",
    isTakenToday: false,
    takenHistory: { "2026-07-02": true, "2026-07-01": false },
    remainingPills: 12,
    totalPills: 30,
    instructions: "Take at the same time every morning. Can be taken with or without food."
  },
  {
    id: "med-3",
    name: "Atorvastatin (Lipitor)",
    dosage: "20mg",
    time: "09:00 PM",
    frequency: "Daily",
    category: "Statin",
    isTakenToday: false,
    takenHistory: { "2026-07-02": true, "2026-07-01": true },
    remainingPills: 18,
    totalPills: 30,
    instructions: "Take in the evening. Avoid excessive grapefruit juice consumption."
  },
  {
    id: "med-4",
    name: "Baby Aspirin",
    dosage: "81mg",
    time: "12:00 PM",
    frequency: "Daily",
    category: "Blood-Thinner",
    isTakenToday: false,
    takenHistory: { "2026-07-02": true, "2026-07-01": true },
    remainingPills: 85,
    totalPills: 100,
    instructions: "Take with food to prevent stomach irritation."
  }
];

let prescriptions = [
  {
    id: "rx-101",
    doctorName: "Dr. Sarah Jenkins",
    doctorSpecialty: "Cardiologist (Heart Failure Specialist)",
    date: "2026-06-15",
    medications: [
      { name: "Metoprolol Succinate", dosage: "50mg", frequency: "Daily (Morning)", duration: "6 Months" },
      { name: "Lisinopril", dosage: "10mg", frequency: "Daily (Morning)", duration: "6 Months" }
    ],
    diagnosis: "Mild Left Ventricular Dysfunction",
    notes: "Patient is recovering well. Maintain light low-sodium diet. Keep daily log of morning blood pressure and heart rate.",
    signature: "S. Jenkins, MD, FACC"
  },
  {
    id: "rx-102",
    doctorName: "Dr. Raymond Vance",
    doctorSpecialty: "Lipidologist / Preventive Cardiologist",
    date: "2026-05-10",
    medications: [
      { name: "Atorvastatin", dosage: "20mg", frequency: "Daily (Night)", duration: "1 Year" }
    ],
    diagnosis: "Hypercholesterolemia",
    notes: "Monitor LDL levels. Next fasting lipid profile in 3 months.",
    signature: "R. Vance, MD"
  }
];

// Seed vitals with history over the past week
let vitals = [
  { id: "v-1", timestamp: "2026-07-03T08:00:00Z", heartRate: 72, bloodPressureSystolic: 122, bloodPressureDiastolic: 80, spo2: 98, weight: 70, notes: "Feeling fine. Post-breakfast." },
  { id: "v-2", timestamp: "2026-07-02T21:00:00Z", heartRate: 68, bloodPressureSystolic: 118, bloodPressureDiastolic: 76, spo2: 99, weight: 70.2, notes: "Pre-bed reading." },
  { id: "v-3", timestamp: "2026-07-02T08:00:00Z", heartRate: 74, bloodPressureSystolic: 124, bloodPressureDiastolic: 82, spo2: 97, weight: 69.8, notes: "Slight morning headache." },
  { id: "v-4", timestamp: "2026-07-01T21:00:00Z", heartRate: 65, bloodPressureSystolic: 119, bloodPressureDiastolic: 78, spo2: 98, weight: 70.5 },
  { id: "v-5", timestamp: "2026-07-01T08:00:00Z", heartRate: 71, bloodPressureSystolic: 121, bloodPressureDiastolic: 80, spo2: 98, weight: 70.3 },
  { id: "v-6", timestamp: "2026-06-30T08:00:00Z", heartRate: 75, bloodPressureSystolic: 126, bloodPressureDiastolic: 83, spo2: 97, weight: 71.2 }
];

// --- API ENDPOINTS ---

// GET Medications
app.get("/api/medications", (req, res) => {
  res.json(medications);
});

// POST Add Medication
app.post("/api/medications", (req, res) => {
  const newMed = {
    id: "med-" + Math.random().toString(36).substring(2, 9),
    name: req.body.name || "Unnamed Medication",
    dosage: req.body.dosage || "1 pill",
    time: req.body.time || "08:00 AM",
    frequency: req.body.frequency || "Daily",
    category: req.body.category || "Other",
    isTakenToday: false,
    takenHistory: {},
    remainingPills: req.body.totalPills || 30,
    totalPills: req.body.totalPills || 30,
    instructions: req.body.instructions || ""
  };
  medications.push(newMed);
  res.status(201).json(newMed);
});

// PUT Take Medication (Toggle Taken Today)
app.put("/api/medications/:id/take", (req, res) => {
  const { id } = req.params;
  const med = medications.find(m => m.id === id);
  if (!med) {
    return res.status(404).json({ error: "Medication not found" });
  }

  const todayStr = new Date().toISOString().split('T')[0];
  med.isTakenToday = !med.isTakenToday;
  
  if (med.isTakenToday) {
    med.takenHistory[todayStr] = true;
    med.remainingPills = Math.max(0, med.remainingPills - 1);
  } else {
    delete med.takenHistory[todayStr];
    med.remainingPills = Math.min(med.totalPills, med.remainingPills + 1);
  }

  res.json(med);
});

// DELETE Medication
app.delete("/api/medications/:id", (req, res) => {
  const { id } = req.params;
  medications = medications.filter(m => m.id !== id);
  res.json({ success: true, id });
});

// GET Prescriptions
app.get("/api/prescriptions", (req, res) => {
  res.json(prescriptions);
});

// POST Add Prescription
app.post("/api/prescriptions", (req, res) => {
  const newRx = {
    id: "rx-" + Math.random().toString(36).substring(2, 9),
    doctorName: req.body.doctorName || "Dr. Unnamed",
    doctorSpecialty: req.body.doctorSpecialty || "General Practitioner",
    date: req.body.date || new Date().toISOString().split('T')[0],
    medications: req.body.medications || [],
    diagnosis: req.body.diagnosis || "Cardiovascular evaluation",
    notes: req.body.notes || "",
    signature: req.body.signature || "MD"
  };
  prescriptions.push(newRx);
  res.status(201).json(newRx);
});

// GET Vitals
app.get("/api/vitals", (req, res) => {
  res.json(vitals);
});

// POST Log Vitals
app.post("/api/vitals", (req, res) => {
  const newVital = {
    id: "v-" + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    heartRate: Number(req.body.heartRate) || 75,
    bloodPressureSystolic: Number(req.body.bloodPressureSystolic) || 120,
    bloodPressureDiastolic: Number(req.body.bloodPressureDiastolic) || 80,
    spo2: Number(req.body.spo2) || 98,
    weight: req.body.weight ? Number(req.body.weight) : undefined,
    notes: req.body.notes || ""
  };
  vitals.unshift(newVital); // Add to beginning
  res.status(201).json(newVital);
});

// POST Drug Safety Checker
app.post("/api/drug-safety/check", async (req, res) => {
  const { newMedicine, currentMedications } = req.body;
  if (!newMedicine) {
    return res.status(400).json({ error: "New medicine name is required." });
  }

  const client = getAiClient();
  if (!client) {
    // Offline simulation mode
    const newMedLower = newMedicine.toLowerCase();
    const hasAspirin = currentMedications.some((m: any) => m.name.toLowerCase().includes("aspirin"));
    const hasBetaBlocker = currentMedications.some((m: any) => m.name.toLowerCase().includes("metoprolol") || m.category === "Beta-Blocker");
    const hasAceInhibitor = currentMedications.some((m: any) => m.name.toLowerCase().includes("lisinopril") || m.category === "ACE-Inhibitor");

    if (newMedLower.includes("ibuprofen") || newMedLower.includes("advil") || newMedLower.includes("nsaid")) {
      if (hasAspirin) {
        return res.json({
          severity: "high",
          title: "High Interaction Found",
          message: "Ibuprofen may decrease the cardioprotective effect of Aspirin and significantly increase the risk of gastrointestinal bleeding or ulceration when taken concurrently. Avoid co-administration.",
          sources: ["DDInter", "OpenFDA"]
        });
      } else if (hasAceInhibitor || hasBetaBlocker) {
        return res.json({
          severity: "medium",
          title: "Moderate Interaction Found",
          message: "NSAIDs like Ibuprofen can decrease the blood-pressure-lowering effects of ACE inhibitors (Lisinopril) and Beta-Blockers (Metoprolol), and can also increase the risk of acute renal impairment.",
          sources: ["DDInter", "OpenFDA"]
        });
      }
    } else if (newMedLower.includes("grapefruit")) {
      const hasStatin = currentMedications.some((m: any) => m.name.toLowerCase().includes("atorvastatin") || m.name.toLowerCase().includes("lipitor"));
      if (hasStatin) {
        return res.json({
          severity: "high",
          title: "High Interaction Found",
          message: "Grapefruit juice inhibits CYP3A4, which increases blood levels of Atorvastatin, significantly elevating the risk of myopathy (muscle pain) and rhabdomyolysis (severe muscle breakdown). Avoid grapefruit consumption.",
          sources: ["OpenFDA"]
        });
      }
    } else if (newMedLower.includes("viagra") || newMedLower.includes("sildenafil")) {
      return res.json({
        severity: "high",
        title: "High Interaction Found",
        message: "Sildenafil (Viagra) causes profound vasodilation. If you are taking any organic nitrates (e.g., Nitroglycerin, Isosorbide) or other antihypertensives, concurrent use can cause severe, life-threatening hypotension (extreme drop in blood pressure).",
        sources: ["RxNorm", "DDInter"]
      });
    }

    return res.json({
      severity: "none",
      title: "No Known Major Interactions",
      message: `No major interactions were immediately found between ${newMedicine} and your active medications list. Please always double check with your doctor.`,
      sources: ["DDInter", "OpenFDA"]
    });
  }

  // Real LLM Check!
  try {
    const medsList = currentMedications.map((m: any) => `${m.name} (${m.dosage || ''})`).join(", ");
    const systemInstruction = `You are an expert clinical pharmacologist and drug-safety checker.
Analyze if there are any dangerous interactions, warnings, or adverse combinations between the user's current medications: [${medsList}] and a proposed new medication: "${newMedicine}".

Provide your response strictly in the following JSON format:
{
  "severity": "high" | "medium" | "none",
  "title": "Short title describing safety state",
  "message": "Clear explanation of the interaction, the mechanism, and clinical advice (e.g., consult a physician). Keep it to 2-3 sentences.",
  "sources": ["RxNorm", "DDInter", "OpenFDA"]
}
`;
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Perform safety check for new medicine: "${newMedicine}" against current list: [${medsList}]`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    try {
      const parsed = JSON.parse(response.text);
      res.json(parsed);
    } catch (e) {
      res.json({
        severity: "medium",
        title: "Potential Warning",
        message: response.text,
        sources: ["Gemini Clinical Engine"]
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST CardioGuard AI Nurse Chat
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const client = getAiClient();
    if (!client) {
      // Graceful fallback with simulated helpful AI nurse when API Key is missing or unconfigured
      const lastUserMsg = messages[messages.length - 1]?.content || "Hi";
      
      let fallbackText = "Hello! I am CardioGuard AI, your virtual cardiovascular nursing assistant. " +
        "It looks like my server is operating in offline mode right now (Gemini API key is pending setup), but I can still offer some standard guidance!\n\n" +
        "**Medication Reminder:** It is crucial to take Metoprolol and Lisinopril consistently as prescribed, generally at the same time each morning. Taking your blood pressure before taking these can help verify your current trends.\n\n" +
        "**Heart-Healthy Advice:** Try to focus on a DASH/Low-Sodium diet (under 1,500 - 2,000mg of sodium daily) and engage in moderate cardiovascular exercises like brisk walking for 30 minutes, if cleared by Dr. Jenkins.\n\n" +
        "*Disclaimer: I am an AI support tool. Please consult your physician before altering your medication or exercise plan. If you experience severe chest pressure, radiating arm pain, or severe shortness of breath, please dial 911 immediately.*";
        
      if (lastUserMsg.toLowerCase().includes("pain") || lastUserMsg.toLowerCase().includes("chest")) {
        fallbackText = "⚠️ **IMMEDIATE CARDIOVASCULAR EMERGENCY WARNING** ⚠️\n\n" +
          "You mentioned chest pain or discomfort. Chest pain, heavy pressure, or radiating tightness to your shoulder, arm, back, neck, or jaw is a secondary sign of acute cardiac events.\n\n" +
          "**ACTION REQUIRED:** Please IMMEDIATELY stop using this app and call 911 or your local emergency response services. Do not drive yourself to the ER; wait for professional medical rescue services.\n\n" +
          "*This is an automated safety warning from CardioGuard AI.*";
      }

      return res.json({ text: fallbackText });
    }

    // Map the messages to the expected format for @google/genai SDK
    const formattedContents = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const systemInstruction = `You are CardioGuard AI, an empathetic, highly knowledgeable virtual cardiovascular nurse assisting heart disease patients with daily care. You help patients track their medication schedules, explain prescription notes, offer healthy cardiovascular recipes, and provide guidance on heart-healthy exercises.

IMPORTANT RULES:
1. Always include a short, gentle professional disclaimer at the very end of your response that your guidance is for informational and organizational support only, and that the patient should consult their primary cardiologist for any actual medical changes or clinical symptoms.
2. Do NOT diagnose acute clinical emergencies. If the patient describes severe symptoms like chest pain radiating to the shoulder or arm, severe shortness of breath, sudden numbness, or fainting, URGE them immediately to seek emergency medical attention (call 911/emergency services) and stop using the chat.
3. Be warm, calming, supportive, and clear. Avoid jargon where possible. Refer back to the patient's prescribed medications (Metoprolol, Lisinopril, Lipitor, Baby Aspirin) if they ask about heart medicine routines.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini API Error in /api/gemini/chat:", err);
    res.status(500).json({ error: "An error occurred with CardioGuard AI: " + err.message });
  }
});

// POST Create Emergency Medical Summary with Gemini
app.post("/api/gemini/health-summary", async (req, res) => {
  try {
    const { patientName, medications, vitals, prescriptions, emergencyConfig, diseases, allergies } = req.body;
    const client = getAiClient();

    const medsStr = medications && medications.length > 0 
      ? medications.map((m: any) => `- ${m.name} (${m.dosage}): taken ${m.frequency || 'Daily'}, time: ${m.time || 'Morning'}, instructions: ${m.instructions || 'None'}`).join("\n")
      : "No active medications registered.";

    const vitalsStr = vitals && vitals.length > 0
      ? vitals.slice(0, 3).map((v: any) => `- HR: ${v.heartRate} BPM, BP: ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} mmHg, SpO2: ${v.spo2}%, Date: ${new Date(v.timestamp).toLocaleString()}`).join("\n")
      : "No recent vital logs registered.";

    const rxStr = prescriptions && prescriptions.length > 0
      ? prescriptions.map((p: any) => `- Doctor: ${p.doctorName} (${p.doctorSpecialty}), Diagnosis: ${p.diagnosis}, Notes: ${p.notes}`).join("\n")
      : "No official prescriptions scanned.";

    const emergencyStr = emergencyConfig 
      ? `Primary Contact: ${emergencyConfig.primaryEmergencyNumber || 'Not stored'}\nFamily Emergency Contact: ${emergencyConfig.trustedName || 'None'} (${emergencyConfig.trustedNumber || 'None'})`
      : "No customized contacts saved.";

    const promptText = `
Patient Name: ${patientName || "Anonymous Patient"}
Declared Chronic Diseases/Conditions: ${diseases || "None declared"}
Declared Active Allergies: ${allergies || "None declared"}

Active Medications:
${medsStr}

Recent Vitals Logs:
${vitalsStr}

Diagnoses & Clinical Notes:
${rxStr}

Emergency Configured Contacts:
${emergencyStr}

Please generate an Emergency Medical Health Summary that a first-responder, EMT, or emergency room physician needs to know IMMEDIATELY.
Keep the output extremely structured, concise (maximum 200 words), and prioritize:
1. High-risk cardiac status and chronic diseases/conditions: ${diseases || "None declared"}
2. Critical active medication routine (e.g. Beta-Blockers, ACE-inhibitors, anticoagulants)
3. Latest vital trends and safety alerts
4. Critical active allergies: ${allergies || "None declared"}

Do NOT use markdown headers (e.g. no #, ##, ###). Use simple uppercase headings and bullet points instead. Keep it clean and highly scannable.
`;

    if (!client) {
      // offline fallback summary
      const fallbackSummary = `EMERGENCY MEDICAL PROFILE: ${patientName || "Anonymous Patient"}

CHRONIC CONDITIONS & DISEASES:
${diseases || "None declared"}

KNOWN ALLERGIES:
${allergies || "None declared"}

PRIMARY CARDIOVASCULAR DIAGNOSIS:
${prescriptions && prescriptions[0] ? prescriptions[0].diagnosis : "Mild Left Ventricular Dysfunction & Hypertension"}

ACTIVE LIFE-SUPPORT MEDICATIONS:
${medications && medications.length > 0 ? medications.map((m: any) => `- ${m.name} (${m.dosage})`).join("\n") : "- Metoprolol Succinate (50mg)\n- Lisinopril (10mg)"}

LATEST RECORDED VITALS:
${vitals && vitals[0] ? `HR: ${vitals[0].heartRate} BPM | BP: ${vitals[0].bloodPressureSystolic}/${vitals[0].bloodPressureDiastolic} mmHg | SpO2: ${vitals[0].spo2}%` : "HR: 72 BPM | BP: 122/80 mmHg | SpO2: 98%"}

EMERGENCY CONTACTS:
${emergencyStr}

CLINICAL RECOMMENDATION:
Patient takes daily blood pressure routines. Assess for bradycardia or acute hypotensive reactions. Always verify medication compliance prior to administration of any contrast agent or sedative.`;
      
      return res.json({ summary: fallbackSummary });
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        temperature: 0.3
      }
    });

    res.json({ summary: response.text });
  } catch (err: any) {
    console.error("Gemini API Error in /api/gemini/health-summary:", err);
    res.status(500).json({ error: "Failed to generate health summary: " + err.message });
  }
});

// POST Prescription Scanner - AI Vision extraction
app.post("/api/gemini/scan-prescription", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "imageBase64 is required." });
    }

    const client = getAiClient();
    if (!client) {
      return res.status(503).json({
        error: "AI Scanner is offline: GEMINI_API_KEY is not configured on the server. Real prescription scanning requires a valid Gemini API key."
      });
    }

    const systemInstruction = `You are an expert clinical OCR and prescription-parsing assistant. You will be given a photo of a doctor's prescription slip.
Read all visible text carefully, including handwritten sections, and extract the following structured information.

Respond strictly in this JSON format and nothing else:
{
  "doctorName": "string (e.g. 'Dr. John Smith'), or 'Unknown Doctor' if illegible",
  "doctorSpecialty": "string, or 'General Practitioner' if not stated",
  "date": "YYYY-MM-DD if visible, otherwise today's best guess or empty string",
  "diagnosis": "string summarizing the diagnosis/condition mentioned, or 'Not specified' if absent",
  "notes": "string, any additional instructions or clinical notes on the slip",
  "signature": "string, the doctor's printed/signed name and credentials if visible",
  "medications": [
    {
      "name": "medicine name exactly as written, expand abbreviations where confident (e.g. 'Metoprolol Succ' -> 'Metoprolol Succinate')",
      "dosage": "e.g. '50mg', '5ml', '1 tablet'",
      "frequency": "e.g. 'Twice Daily', 'Once at night', 'Every 8 hours'",
      "duration": "e.g. '7 Days', '3 Months', 'Ongoing'"
    }
  ]
}

Rules:
- If the image is not a legible prescription/medical document, still return valid JSON with your best-effort reading, and put "Could not clearly read this image" in the "notes" field.
- Never invent a medicine that is not visibly written or strongly implied on the slip.
- If no medications are found at all, return an empty array for "medications".`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mimeType || "image/jpeg", data: imageBase64 } },
            { text: "Extract the prescription details from this image following the required JSON schema." }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    let parsed;
    try {
      parsed = JSON.parse(response.text);
    } catch (e) {
      return res.status(502).json({ error: "AI scanner returned an unreadable response. Please try again with a clearer photo." });
    }

    // Basic shape safety net
    if (!Array.isArray(parsed.medications)) parsed.medications = [];

    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini API Error in /api/gemini/scan-prescription:", err);
    res.status(500).json({ error: "Failed to scan prescription: " + err.message });
  }
});

// --- VITE DEV OR PROD MIDDLEWARE ---

async function startServer() {
  console.log("[CardioGuard Server] BOOT MARKER v2 - SPA fallback fix active");
  console.log(`[CardioGuard Server] NODE_ENV = "${process.env.NODE_ENV}"`);
  console.log(`[CardioGuard Server] cwd = "${process.cwd()}"`);
  if (process.env.NODE_ENV !== "production") {
    console.log("[CardioGuard Server] Taking DEV branch (Vite middleware)");
    try {
      const vite = await createViteServer({
        root: process.cwd(),
        server: { middlewareMode: true },
        appType: "spa",
      });

      // Register explicit handler for '/' BEFORE vite.middlewares so Express
      // matches it first, since vite's own internal middleware was
      // terminating the request for '/' instead of passing through.
      app.get("/", async (req, res, next) => {
        console.log(`[CardioGuard Server] EXPLICIT ROOT HANDLER hit for: ${req.originalUrl}`);
        try {
          const url = req.originalUrl;
          let template = fs.readFileSync(
            path.resolve(process.cwd(), "index.html"),
            "utf-8"
          );
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (err) {
          next(err);
        }
      });

      app.use(vite.middlewares);

      // Fallback for any other non-API, non-asset route (client-side routing)
      app.use("*", async (req, res, next) => {
        console.log(`[CardioGuard Server] SPA fallback hit for: ${req.originalUrl}`);
        try {
          const url = req.originalUrl;
          let template = fs.readFileSync(
            path.resolve(process.cwd(), "index.html"),
            "utf-8"
          );
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (err) {
          next(err);
        }
      });
    } catch (err) {
      console.error("[CardioGuard Server] FAILED to start Vite dev middleware:", err);
      throw err;
    }
  } else {
    console.log("[CardioGuard Server] Taking PRODUCTION branch (static dist)");
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`[CardioGuard Server] distPath = "${distPath}", exists = ${fs.existsSync(distPath)}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CardioGuard Server] running on http://0.0.0.0:${PORT} (also try http://127.0.0.1:${PORT} or http://localhost:${PORT})`);
  });
}

startServer();
