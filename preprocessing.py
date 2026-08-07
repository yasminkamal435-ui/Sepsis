"""
معالجة بيانات PhysioNet Sepsis Challenge 2019:
- قراءة ملفات .psv (Pipe-separated) لكل مريض
- Imputation (Forward-fill ثم Median) للقيم المفقودة (شائعة جدًا في بيانات ICU)
- تطبيع Z-score لكل متغير حيوي
- بناء نوافذ زمنية منزلقة (Sliding windows) بطول ثابت (مثلاً آخر 12 ساعة)
  للتنبؤ بالإنتان خلال الـ 6 ساعات القادمة (Early prediction الحقيقي)
"""
import os
import glob
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
import joblib

# الأعمدة الأربعين في داتاسيت التحدي (Vitals + Labs + Demographics)
VITAL_COLS = ["HR", "O2Sat", "Temp", "SBP", "MAP", "DBP", "Resp", "EtCO2"]
LAB_COLS = [
    "BaseExcess", "HCO3", "FiO2", "pH", "PaCO2", "SaO2", "AST", "BUN",
    "Alkalinephos", "Calcium", "Chloride", "Creatinine", "Bilirubin_direct",
    "Glucose", "Lactate", "Magnesium", "Phosphate", "Potassium",
    "Bilirubin_total", "TroponinI", "Hct", "Hgb", "PTT", "WBC",
    "Fibrinogen", "Platelets",
]
DEMO_COLS = ["Age", "Gender", "Unit1", "Unit2", "HospAdmTime", "ICULOS"]
LABEL_COL = "SepsisLabel"
FEATURE_COLS = VITAL_COLS + LAB_COLS + DEMO_COLS

WINDOW_HOURS = 12         # طول النافذة الزمنية المستخدمة للتنبؤ
PREDICTION_HORIZON = 6    # نتنبأ بالإنتان قبل حدوثه بكام ساعة (التنبؤ المبكر الحقيقي)


def load_patient_files(raw_dir: str) -> list:
    """يجمع كل ملفات .psv من setA و setB"""
    files = glob.glob(os.path.join(raw_dir, "**", "*.psv"), recursive=True)
    return sorted(files)


def read_patient(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, sep="|")
    df["patient_id"] = os.path.splitext(os.path.basename(path))[0]
    return df


def impute_patient(df: pd.DataFrame) -> pd.DataFrame:
    """Forward-fill ثم تعويض بالوسيط العام لكل عمود (معيار شائع في أبحاث هذا التحدي)"""
    df = df.copy()
    df[FEATURE_COLS] = df[FEATURE_COLS].ffill()
    return df


def build_windows(df: pd.DataFrame, feature_means: dict):
    """
    يبني نوافذ زمنية بطول WINDOW_HOURS لكل ساعة في إقامة المريض،
    والـ label هو: هل هيتشخص بالإنتان خلال PREDICTION_HORIZON ساعة قادمة؟
    """
    df = df.reset_index(drop=True)
    n = len(df)
    windows, labels, ids = [], [], []

    values = df[FEATURE_COLS].fillna(pd.Series(feature_means))
    sepsis_idx = df.index[df[LABEL_COL] == 1]
    onset = sepsis_idx.min() if len(sepsis_idx) else None

    for t in range(WINDOW_HOURS, n):
        window = values.iloc[t - WINDOW_HOURS:t].values
        if onset is not None and onset - PREDICTION_HORIZON <= t <= onset:
            label = 1
        else:
            label = 0
        windows.append(window)
        labels.append(label)
        ids.append(df.loc[t, "patient_id"])

    return windows, labels, ids


def run_pipeline(raw_dir="data/raw", out_dir="data/processed"):
    os.makedirs(out_dir, exist_ok=True)
    files = load_patient_files(raw_dir)
    print(f"عدد ملفات المرضى: {len(files)}")
    if len(files) == 0:
        print("⚠️  لا توجد ملفات .psv في data/raw — شغّلي أولًا: python data/download_data.py")
        return None, None

    all_df = []
    for f in files:
        all_df.append(read_patient(f))
    full = pd.concat(all_df, ignore_index=True)

    feature_means = full[FEATURE_COLS].median(numeric_only=True).to_dict()
    missing_before = full[FEATURE_COLS].isna().mean().to_dict()

    X, y, pid = [], [], []
    for f in files:
        pdf = impute_patient(read_patient(f))
        w, l, i = build_windows(pdf, feature_means)
        X.extend(w)
        y.extend(l)
        pid.extend(i)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)
    pid = np.array(pid)

    n_samples, n_time, n_feat = X.shape
    scaler = StandardScaler()
    X_flat = X.reshape(-1, n_feat)
    X_flat = scaler.fit_transform(X_flat)
    X = X_flat.reshape(n_samples, n_time, n_feat)

    # --- تقسيم Stratified حقيقي: 70% تدريب / 15% تحقق / 15% اختبار ---
    from sklearn.model_selection import train_test_split
    idx_all = np.arange(n_samples)
    idx_train, idx_temp, y_train, y_temp = train_test_split(
        idx_all, y, test_size=0.30, stratify=y, random_state=42
    )
    idx_val, idx_test, y_val, y_test = train_test_split(
        idx_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=42
    )

    splits = {"train": idx_train, "val": idx_val, "test": idx_test}
    for split_name, idx in splits.items():
        np.save(os.path.join(out_dir, f"X_{split_name}.npy"), X[idx])
        np.save(os.path.join(out_dir, f"y_{split_name}.npy"), y[idx])

    # يحتفظ أيضًا بالمصفوفة الكاملة (X.npy/y.npy) لأدوات التدريب اللي بتعمل split داخليًا
    np.save(os.path.join(out_dir, "X.npy"), X)
    np.save(os.path.join(out_dir, "y.npy"), y)
    joblib.dump(scaler, os.path.join(out_dir, "scaler.pkl"))

    # --- تقرير إحصائي حقيقي (مش أرقام جاهزة، ده ناتج فعلي من الداتا اللي اتحمّلت) ---
    report = {
        "n_patients_files": len(files),
        "n_windows_total": int(n_samples),
        "window_hours": WINDOW_HOURS,
        "prediction_horizon_hours": PREDICTION_HORIZON,
        "n_features": int(n_feat),
        "positive_rate_overall": float(y.mean()),
        "splits": {
            name: {
                "n_windows": int(len(idx)),
                "n_unique_patients": int(len(set(pid[idx]))),
                "positive_rate": float(y[idx].mean()),
            } for name, idx in splits.items()
        },
        "missingness_before_imputation": {k: float(v) for k, v in missing_before.items()},
    }
    with open(os.path.join(out_dir, "dataset_report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    md_lines = [
        "# تقرير الداتاسيت (مُولَّد تلقائيًا من preprocessing.py)\n",
        f"- عدد ملفات المرضى: **{report['n_patients_files']}**",
        f"- إجمالي النوافذ الزمنية (samples): **{report['n_windows_total']}**",
        f"- نسبة حالات الإنتان الإجمالية: **{report['positive_rate_overall']:.3%}**\n",
        "| Split | عدد النوافذ | عدد المرضى الفريدين | نسبة الإنتان |",
        "|---|---|---|---|",
    ]
    for name in ["train", "val", "test"]:
        s = report["splits"][name]
        md_lines.append(f"| {name} | {s['n_windows']} | {s['n_unique_patients']} | {s['positive_rate']:.3%} |")
    with open(os.path.join(out_dir, "dataset_report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines) + "\n")

    print(f"جاهز ✔ | Shape: {X.shape} | نسبة الإنتان: {y.mean():.3%}")
    print(f"تقرير كامل محفوظ في: {out_dir}/dataset_report.md")
    return X, y


if __name__ == "__main__":
    run_pipeline()
