# -*- coding: utf-8 -*-
"""
CardioGuard AI - Python FastAPI Backend
Provides heart health, prescription, and vital monitoring endpoints.
"""

import os
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Try to import Google GenAI for Python if available
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

app = FastAPI(
    title="CardioGuard AI - API Backend",
    description="Cardiovascular support backend with real-time medicine reminders, prescription lists, and vitals tracking.",
    version="1.0.0"
)

# Enable CORS for local cross-origin React frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class MedicationItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str

class PrescriptionCreate(BaseModel):
    doctorName: str
    doctorSpecialty: str
    date: Optional[str] = None
    medications: List[MedicationItem]
    diagnosis: str
    notes: str
    signature: str

class MedicationCreate(BaseModel):
    name: str
    dosage: str
    time: str
    frequency: str
    category: str
    totalPills: int
    instructions: Optional[str] = ""

class VitalSignCreate(BaseModel):
    heartRate: int
    bloodPressureSystolic: int
    bloodPressureDiastolic: int
    spo2: int
    notes: Optional[str] = ""

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# --- In-Memory Seed Data ---
medications_db = [
    {
        "id": "med-1",
        "name": "Metoprolol Succinate",
        "dosage": "50mg",
        "time": "08:00 AM",
        "frequency": "Daily",
        "category": "Beta-Blocker",
        "isTakenToday": False,
        "takenHistory": {"2026-07-02": True, "2026-07-01": True},
        "remainingPills": 24,
        "totalPills": 30,
        "instructions": "Take with or immediately after a meal. Do not crush."
    },
    {
        "id": "med-2",
        "name": "Lisinopril",
        "dosage": "10mg",
        "time": "08:00 AM",
        "frequency": "Daily",
        "category": "ACE-Inhibitor",
        "isTakenToday": False,
        "takenHistory": {"2026-07-02": True, "2026-07-01": False},
        "remainingPills": 12,
        "totalPills": 30,
        "instructions": "Take at the same time every morning. Can be taken with or without food."
    },
    {
        "id": "med-3",
        "name": "Atorvastatin (Lipitor)",
        "dosage": "20mg",
        "time": "09:00 PM",
        "frequency": "Daily",
        "category": "Statin",
        "isTakenToday": False,
        "takenHistory": {"2026-07-02": True, "2026-07-01": True},
        "remainingPills": 18,
        "totalPills": 30,
        "instructions": "Take in the evening. Avoid excessive grapefruit juice consumption."
    }
]

prescriptions_db = [
    {
        "id": "rx-101",
        "doctorName": "Dr. Sarah Jenkins",
        "doctorSpecialty": "Cardiologist (Heart Failure Specialist)",
        "date": "2026-06-15",
        "medications": [
            {"name": "Metoprolol Succinate", "dosage": "50mg", "frequency": "Daily (Morning)", "duration": "6 Months"},
            {"name": "Lisinopril", "dosage": "10mg", "frequency": "Daily (Morning)", "duration": "6 Months"}
        ],
        "diagnosis": "Mild Left Ventricular Dysfunction",
        "notes": "Patient is recovering well. Maintain light low-sodium diet. Keep daily log of morning blood pressure and heart rate.",
        "signature": "S. Jenkins, MD, FACC"
    }
]

vitals_db = [
    {"id": "v-1", "timestamp": "2026-07-03T08:00:00Z", "heartRate": 72, "bloodPressureSystolic": 122, "bloodPressureDiastolic": 80, "spo2": 98, "notes": "Feeling fine. Post-breakfast."},
    {"id": "v-2", "timestamp": "2026-07-02T21:00:00Z", "heartRate": 68, "bloodPressureSystolic": 118, "bloodPressureDiastolic": 76, "spo2": 99, "notes": "Pre-bed reading."},
    {"id": "v-3", "timestamp": "2026-07-02T08:00:00Z", "heartRate": 74, "bloodPressureSystolic": 124, "bloodPressureDiastolic": 82, "spo2": 97, "notes": "Slight morning headache."}
]

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "CardioGuard AI API is active and running.", "platform": "FastAPI"}

@app.get("/api/medications")
def get_medications():
    return medications_db

@app.post("/api/medications", status_code=201)
def add_medication(med: MedicationCreate):
    new_med = {
        "id": f"med-{str(uuid.uuid4())[:7]}",
        "name": med.name,
        "dosage": med.dosage,
        "time": med.time,
        "frequency": med.frequency,
        "category": med.category,
        "isTakenToday": False,
        "takenHistory": {},
        "remainingPills": med.totalPills,
        "totalPills": med.totalPills,
        "instructions": med.instructions
    }
    medications_db.append(new_med)
    return new_med

@app.put("/api/medications/{med_id}/take")
def take_medication(med_id: str):
    for med in medications_db:
        if med["id"] == med_id:
            today_str = datetime.now().strftime("%Y-%m-%d")
            med["isTakenToday"] = not med["isTakenToday"]
            if med["isTakenToday"]:
                med["takenHistory"][today_str] = True
                med["remainingPills"] = max(0, med["remainingPills"] - 1)
            else:
                if today_str in med["takenHistory"]:
                    del med["takenHistory"][today_str]
                med["remainingPills"] = min(med["totalPills"], med["remainingPills"] + 1)
            return med
    raise HTTPException(status_code=404, detail="Medication not found")

@app.delete("/api/medications/{med_id}")
def delete_medication(med_id: str):
    global medications_db
    initial_len = len(medications_db)
    medications_db = [m for m in medications_db if m["id"] != med_id]
    if len(medications_db) < initial_len:
        return {"success": True, "id": med_id}
    raise HTTPException(status_code=404, detail="Medication not found")

@app.get("/api/prescriptions")
def get_prescriptions():
    return prescriptions_db

@app.post("/api/prescriptions", status_code=201)
def add_prescription(rx: PrescriptionCreate):
    new_rx = {
        "id": f"rx-{str(uuid.uuid4())[:7]}",
        "doctorName": rx.doctorName,
        "doctorSpecialty": rx.doctorSpecialty,
        "date": rx.date or datetime.now().strftime("%Y-%m-%d"),
        "medications": [item.dict() for item in rx.medications],
        "diagnosis": rx.diagnosis,
        "notes": rx.notes,
        "signature": rx.signature
    }
    prescriptions_db.append(new_rx)
    return new_rx

@app.get("/api/vitals")
def get_vitals():
    return vitals_db

@app.post("/api/vitals", status_code=201)
def log_vital(vital: VitalSignCreate):
    new_vital = {
        "id": f"v-{str(uuid.uuid4())[:7]}",
        "timestamp": datetime.now().isoformat() + "Z",
        "heartRate": vital.heartRate,
        "bloodPressureSystolic": vital.bloodPressureSystolic,
        "bloodPressureDiastolic": vital.bloodPressureDiastolic,
        "spo2": vital.spo2,
        "notes": vital.notes
    }
    vitals_db.insert(0, new_vital)
    return new_vital

@app.post("/api/gemini/chat")
def chatbot_interaction(request: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key or genai is None:
        # Graceful emergency warning & response if offline / missing dependencies
        last_msg = request.messages[-1].content if request.messages else "Hi"
        
        fallback_text = "Hello! I am CardioGuard AI, your virtual cardiovascular nursing assistant. " \
                        "My Python backend is in offline mode (or google-genai is pending installation), but I can still support you!\n\n" \
                        "**Vitals Check:** Maintain daily logging. Your blood pressure should ideally be target under 130/80.\n\n" \
                        "*Disclaimer: Please consult your physician before making cardiac changes. If you experience radiating chest tightness, call 911 immediately.*"
        
        if "pain" in last_msg.lower() or "chest" in last_msg.lower():
            fallback_text = "⚠️ **IMMEDIATE CARDIOVASCULAR EMERGENCY WARNING** ⚠️\n\n" \
                            "You reported potential chest pain or tightness. This is a severe cardiac warning sign.\n\n" \
                            "**ACTION REQUIRED:** Please stop using this chat immediately and CALL 911 (or your local emergency services)."
        return {"text": fallback_text}

    try:
        # Initialize modern python SDK
        # client = genai.Client(api_key=api_key)
        # However, to be fully generic and safe to run in multiple environments, 
        # we can use the Client.
        client = genai.Client(api_key=api_key)
        
        formatted_contents = []
        for msg in request.messages:
            formatted_contents.append(
                types.Content(
                    role=msg.role,
                    parts=[types.Part.from_text(text=msg.content)]
                )
            )

        system_instruction = (
            "You are CardioGuard AI, an empathetic, highly knowledgeable virtual cardiovascular nurse "
            "assisting heart disease patients with daily care. You help patients track their medication schedules, "
            "explain prescription notes, offer healthy cardiovascular recipes, and provide guidance on heart-healthy exercises.\n\n"
            "IMPORTANT RULES:\n"
            "1. Always include a short, gentle professional disclaimer at the end of your response stating that you are an AI support tool.\n"
            "2. If the user mentions chest pain, tightness, radiating shoulder pain, severe breathing issues, or fainting, URGE them to immediately call 911 / emergency assistance."
        )

        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=formatted_contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7
            )
        )
        return {"text": response.text}
    except Exception as e:
        return {"error": f"Error running python Gemini API: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
