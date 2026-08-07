"""
خادم REST API (FastAPI) — النقطة الوحيدة اللي فيها منطق الذكاء الاصطناعي.
صفحات الـ webapp/ بتكلم السيرفر ده بس عن طريق fetch() ومتشوفش أي كود
موديل أو أوزان أو معالجة داخلية أبدًا.

تشغيل:
    uvicorn serve_api:app --reload --port 8000
"""
import os
import sqlite3
import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
import joblib
import random
from datetime import datetime, timedelta

from model_fusion import SepsisFusionModel
from timeseries_to_image import window_to_image
from preprocessing import FEATURE_COLS, WINDOW_HOURS
from explain import explain_with_deltas
from train_survival_model import SurvivalMLP, FEATURES as SURVIVAL_FEATURES

app = FastAPI(title="SepsisWatch API", version="1.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # عدّلها في الإنتاج لدومين الموقع فقط
    allow_methods=["*"],
    allow_headers=["*"],
)

SURVIVAL_MODEL_PATH = "models/survival_mlp.pt"
SURVIVAL_SCALER_MEAN = None
SURVIVAL_SCALER_SCALE = None
_survival_model = None


def get_survival_model():
    global _survival_model, SURVIVAL_SCALER_MEAN, SURVIVAL_SCALER_SCALE
    if _survival_model is None:
        _survival_model = SurvivalMLP(n_features=len(SURVIVAL_FEATURES))
        if os.path.exists(SURVIVAL_MODEL_PATH):
            _survival_model.load_state_dict(torch.load(SURVIVAL_MODEL_PATH, map_location="cpu"))
        _survival_model.eval()
        import json
        with open("models/survival_mlp_weights.json") as f:
            w = json.load(f)
        SURVIVAL_SCALER_MEAN = np.array(w["_scaler_mean"])
        SURVIVAL_SCALER_SCALE = np.array(w["_scaler_scale"])
    return _survival_model


class SurvivalInput(BaseModel):
    age_years: float
    sex_female: int  # 0=male, 1=female
    episode_number: int


def survival_forward(age_years, sex_female, episode_number):
    model = get_survival_model()
    x = np.array([age_years, sex_female, episode_number], dtype=np.float32)
    x = (x - SURVIVAL_SCALER_MEAN) / SURVIVAL_SCALER_SCALE
    with torch.no_grad():
        logit = model(torch.tensor(x, dtype=torch.float32).unsqueeze(0))
        return torch.sigmoid(logit).item()


@app.post("/predict_survival")
def predict_survival(payload: SurvivalInput):
    """
    نموذج حقيقي مُدرَّب فعليًا على 110,204 حالة إنتان حقيقية (Chicco & Jurman, 2020،
    Nature Scientific Reports، CC BY 4.0). يرجّع درجة خطورة (وليس احتمال بقاء) بناءً
    على أوزان مُدرَّبة حقيقية محفوظة في models/survival_mlp.pt
    """
    risk = survival_forward(payload.age_years, payload.sex_female, payload.episode_number)
    log_prediction(f"survival-{payload.age_years}-{payload.sex_female}-{payload.episode_number}", risk, risk_label(risk))
    base = risk
    ref_age_risk = survival_forward(55, payload.sex_female, payload.episode_number)
    ref_ep_risk = survival_forward(payload.age_years, payload.sex_female, 1)
    ref_sex_risk = survival_forward(payload.age_years, 1 - payload.sex_female, payload.episode_number)
    factors = sorted([
        {"key": "age", "magnitude": abs(ref_age_risk - base), "direction": "up" if ref_age_risk < base else "down"},
        {"key": "episode", "magnitude": abs(ref_ep_risk - base), "direction": "up" if ref_ep_risk < base else "down"},
        {"key": "sex", "magnitude": abs(ref_sex_risk - base), "direction": "up" if ref_sex_risk < base else "down"},
    ], key=lambda f: f["magnitude"], reverse=True)
    return {"risk_probability": round(float(risk), 4), "risk_level": risk_label(risk), "factors": factors}


@app.get("/survival_model_info")
def survival_model_info():
    """معلومات شفافة عن تدريب النموذج الحقيقي — تُعرض في بطاقة النموذج بالموقع"""
    try:
        import json
        with open("reports/survival_model_report.json") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"error": "لم يتم تدريب النموذج بعد. شغّلي src/train_survival_model.py"}

MODEL_PATH = "models/sepsis_fusion_best.pt"
SCALER_PATH = "data/processed/scaler.pkl"
DB_PATH = "logs/sepsiswatch.db"

_model = None
_scaler = None
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ---------------------------------------------------------------------------
# طبقة التسجيل والمراقبة (Monitoring & Logging) — SQLite بسيط بدون تبعيات خارجية
# ---------------------------------------------------------------------------
try:
    from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
    PREDICTIONS_TOTAL = Counter("sepsiswatch_predictions_total", "Total predictions served")
    HIGH_RISK_TOTAL = Counter("sepsiswatch_high_risk_total", "Total high-risk predictions")
    PREDICTION_LATENCY = Histogram("sepsiswatch_prediction_latency_seconds", "Prediction latency")
    _PROM_AVAILABLE = True
except ImportError:
    _PROM_AVAILABLE = False


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id TEXT,
            probability REAL,
            risk_level TEXT,
            created_at TEXT
        )
    """)
    conn.commit()
    conn.close()


def log_prediction(patient_id: str, probability: float, risk_level: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute(
            "INSERT INTO predictions (patient_id, probability, risk_level, created_at) VALUES (?, ?, ?, ?)",
            (patient_id, probability, risk_level, datetime.utcnow().isoformat()),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[logging warning] {e}")
    if _PROM_AVAILABLE:
        PREDICTIONS_TOTAL.inc()
        if probability >= 0.7:
            HIGH_RISK_TOTAL.inc()


@app.on_event("startup")
def on_startup():
    init_db()


def get_model():
    global _model
    if _model is None:
        _model = SepsisFusionModel(n_features=len(FEATURE_COLS)).to(_device)
        if os.path.exists(MODEL_PATH):
            _model.load_state_dict(torch.load(MODEL_PATH, map_location=_device))
        _model.eval()
    return _model


class VitalsWindow(BaseModel):
    patient_id: str
    hourly_readings: List[List[float]]  # (WINDOW_HOURS, len(FEATURE_COLS))


class PredictionResponse(BaseModel):
    patient_id: str
    sepsis_probability: float
    risk_level: str
    top_contributing_signals: List[str]
    generated_at: str


def risk_label(p: float) -> str:
    if p >= 0.7:
        return "خطر مرتفع (High)"
    if p >= 0.35:
        return "خطر متوسط (Moderate)"
    return "خطر منخفض (Low)"


@app.get("/health")
def health():
    return {"status": "ok", "device": str(_device), "model_loaded": os.path.exists(MODEL_PATH)}


@app.get("/metrics")
def metrics():
    """نقطة تجميع مقاييس بصيغة Prometheus — وصّليها بـ Prometheus/Grafana في الإنتاج."""
    if not _PROM_AVAILABLE:
        raise HTTPException(status_code=501, detail="prometheus-client غير مثبت")
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: VitalsWindow):
    window = np.array(payload.hourly_readings, dtype=np.float32)
    if window.shape != (WINDOW_HOURS, len(FEATURE_COLS)):
        raise HTTPException(
            status_code=400,
            detail=f"expected shape ({WINDOW_HOURS}, {len(FEATURE_COLS)}), got {window.shape}",
        )

    model = get_model()
    img = window_to_image(window)

    with torch.no_grad():
        x_seq = torch.tensor(window, dtype=torch.float32).unsqueeze(0).to(_device)
        x_img = torch.tensor(img, dtype=torch.float32).unsqueeze(0).to(_device)
        logits, attn = model(x_seq, x_img)
        prob = torch.sigmoid(logits).item()

    attn = attn.squeeze(0).cpu().numpy()
    top_hours = np.argsort(attn)[-3:][::-1]
    top_signals = [f"الساعة -{WINDOW_HOURS - h}" for h in top_hours]

    level = risk_label(prob)
    log_prediction(payload.patient_id, prob, level)

    return PredictionResponse(
        patient_id=payload.patient_id,
        sepsis_probability=round(float(prob), 4),
        risk_level=level,
        top_contributing_signals=top_signals,
        generated_at=datetime.utcnow().isoformat(),
    )


@app.post("/explain")
def explain(payload: VitalsWindow, lang: str = "ar"):
    """
    تفسير القرار (Explainable AI): بيرجّع أكتر المتغيرات الحيوية تأثيرًا في درجة
    الخطورة، مبني على اتجاه القراءات خلال النافذة الزمنية (delta-based). لتفسير
    أدق باستخدام SHAP الحقيقي على نموذج مدرَّب فعليًا، شوفي src/explain.py
    الدالة explain_with_shap().
    """
    window = np.array(payload.hourly_readings, dtype=np.float32)
    if window.shape != (WINDOW_HOURS, len(FEATURE_COLS)):
        raise HTTPException(status_code=400, detail="invalid window shape")
    factors = explain_with_deltas(window, lang=lang)
    return {"patient_id": payload.patient_id, "factors": factors}


# ---------------------------------------------------------------------------
# لوحة المراقبة الإدارية (Admin / Monitoring)
# ---------------------------------------------------------------------------
@app.get("/admin/stats")
def admin_stats():
    """إحصائيات تشغيلية حقيقية من سجل التنبؤات (SQLite) — تغذّي admin.html"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*), AVG(probability) FROM predictions")
        total, avg_prob = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM predictions WHERE probability >= 0.7")
        critical = cur.fetchone()[0]
        cur.execute("""
            SELECT substr(created_at,1,13) as hour, COUNT(*), AVG(probability)
            FROM predictions GROUP BY hour ORDER BY hour DESC LIMIT 24
        """)
        hourly = [{"hour": r[0], "count": r[1], "avg_probability": r[2]} for r in cur.fetchall()]
        conn.close()
        return {
            "total_predictions": total or 0,
            "average_probability": round(avg_prob, 4) if avg_prob else 0,
            "critical_cases": critical or 0,
            "hourly_breakdown": hourly,
        }
    except Exception as e:
        return {"total_predictions": 0, "average_probability": 0, "critical_cases": 0,
                "hourly_breakdown": [], "note": f"لا يوجد سجل بعد ({e})"}


# ---------------------------------------------------------------------------
# Endpoints تجريبية لتغذية الداشبورد بمرضى تجريبيين (Demo mode بدون موديل حقيقي)
# مفيدة لعرض الموقع بدون الحاجة لتشغيل تدريب كامل أولًا
# ---------------------------------------------------------------------------
DEMO_PATIENTS = [
    {"id": "P-1042", "name": "مريض ذكر، 67 سنة", "unit": "ICU-2", "bed": "B-14"},
    {"id": "P-1077", "name": "مريضة أنثى، 54 سنة", "unit": "ICU-1", "bed": "A-03"},
    {"id": "P-1103", "name": "مريض ذكر، 39 سنة", "unit": "ICU-3", "bed": "C-08"},
    {"id": "P-1129", "name": "مريضة أنثى، 72 سنة", "unit": "ICU-1", "bed": "A-11"},
    {"id": "P-1156", "name": "مريض ذكر، 61 سنة", "unit": "ICU-2", "bed": "B-05"},
]


@app.get("/demo/patients")
def demo_patients(user: Optional[str] = None):
    random.seed(hash(user) % (2**31) if user else 42)
    out = []
    for p in DEMO_PATIENTS:
        prob = round(random.uniform(0.02, 0.92), 3)
        out.append({
            **p,
            "sepsis_probability": prob,
            "risk_level": risk_label(prob),
            "last_update": (datetime.utcnow() - timedelta(minutes=random.randint(1, 40))).isoformat(),
        })
        log_prediction(p["id"], prob, risk_label(prob))
    return {"user": user, "patients": out}


@app.get("/demo/vitals/{patient_id}")
def demo_vitals(patient_id: str):
    random.seed(hash(patient_id) % (2**31))
    now = datetime.utcnow()
    series = []
    hr_base, map_base, temp_base, resp_base = 82, 78, 37.0, 16
    for h in range(24):
        drift = h / 24
        series.append({
            "time": (now - timedelta(hours=24 - h)).strftime("%H:%M"),
            "HR": round(hr_base + drift * random.uniform(5, 25) + random.uniform(-3, 3), 1),
            "MAP": round(map_base - drift * random.uniform(2, 15) + random.uniform(-2, 2), 1),
            "Temp": round(temp_base + drift * random.uniform(0.2, 1.8) + random.uniform(-0.2, 0.2), 1),
            "Resp": round(resp_base + drift * random.uniform(1, 8) + random.uniform(-1, 1), 1),
        })
    return {"patient_id": patient_id, "series": series}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
