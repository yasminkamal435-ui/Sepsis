"""
تدريب نموذج Deep Learning حقيقي للتنبؤ ببقاء مريض الإنتان على قيد الحياة.

الداتا: Sepsis Survival Minimal Clinical Records (Chicco & Jurman, 2020)
        Nature Scientific Reports — DOI: 10.1038/s41598-020-73558-3
        مرخّصة CC BY 4.0، محفوظة في data/real/ (110,204 حالة حقيقية من النرويج)

الموديل: شبكة MLP عميقة حقيقية (4 طبقات مخفية + BatchNorm + Dropout)،
        بتتدرب فعليًا هنا وتتحفظ أوزانها الحقيقية في models/survival_mlp.pt
        بالإضافة لنسخة JSON من الأوزان (models/survival_mlp_weights.json)
        عشان الموقع يقدر يستخدمها كـ fallback لو السيرفر الخلفي مقفول.

الفرق عن نموذج الـ Sepsis Onset (GRU+CNN في model_fusion.py): ده نموذج تاني
منفصل، هدفه التنبؤ ببقاء المريض حي بعد التشخيص، مبني على 3 متغيرات بس
(العمر، الجنس، عدد نوبات الإنتان السابقة) — أبسط، لكنه مُدرَّب فعليًا على
بيانات حقيقية، عكس نموذج الـ GRU+CNN اللي لسه محتاج بيانات PhysioNet الحقيقية.
"""
import json
import os
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, accuracy_score, f1_score, confusion_matrix

DATA_PATH = "data/real/sepsis_survival_primary_cohort.csv"
VAL_EXTERNAL_PATH = "data/real/sepsis_survival_validation_cohort.csv"
MODEL_DIR = "models"
FEATURES = ["age_years", "sex_0male_1female", "episode_number"]
LABEL = "hospital_outcome_1alive_0dead"


class SurvivalMLP(nn.Module):
    """شبكة MLP عميقة حقيقية: 3 -> 64 -> 32 -> 16 -> 1، مع BatchNorm وDropout"""

    def __init__(self, n_features=3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(n_features, 64), nn.BatchNorm1d(64), nn.ReLU(), nn.Dropout(0.25),
            nn.Linear(64, 32), nn.BatchNorm1d(32), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(32, 16), nn.BatchNorm1d(16), nn.ReLU(),
            nn.Linear(16, 1),
        )

    def forward(self, x):
        return self.net(x).squeeze(-1)


def load_data():
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES].values.astype(np.float32)
    y = df[LABEL].values.astype(np.float32)
    # الهدف الأصلي "حي=1"؛ بنقلبه لـ "خطر وفاة" (1=مات) عشان يتماشى مع باقي
    # الموقع اللي بيعرض "درجة خطورة" مش "درجة نجاة"
    y_risk = 1.0 - y
    return X, y_risk


def train():
    os.makedirs(MODEL_DIR, exist_ok=True)
    X, y = load_data()
    print(f"إجمالي العينات الحقيقية: {len(X)} | نسبة الوفاة (الفئة الموجبة): {y.mean():.4f}")

    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=42)
    print(f"Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_val_s = scaler.transform(X_val)
    X_test_s = scaler.transform(X_test)

    device = torch.device("cpu")
    train_ds = TensorDataset(torch.tensor(X_train_s), torch.tensor(y_train))
    train_loader = DataLoader(train_ds, batch_size=512, shuffle=True)

    model = SurvivalMLP(n_features=len(FEATURES)).to(device)
    pos_weight = torch.tensor([(1 - y_train.mean()) / max(y_train.mean(), 1e-6)])
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)

    X_val_t = torch.tensor(X_val_s)
    y_val_t = torch.tensor(y_val)

    best_auroc = 0.0
    best_state = None
    epochs = 40
    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        for xb, yb in train_loader:
            optimizer.zero_grad()
            logits = model(xb)
            loss = criterion(logits, yb)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        model.eval()
        with torch.no_grad():
            val_logits = model(X_val_t)
            val_probs = torch.sigmoid(val_logits).numpy()
        auroc = roc_auc_score(y_val, val_probs)
        scheduler.step(auroc)

        if auroc > best_auroc:
            best_auroc = auroc
            best_state = {k: v.clone() for k, v in model.state_dict().items()}

        if (epoch + 1) % 5 == 0 or epoch == 0:
            print(f"Epoch {epoch+1}/{epochs} | loss={total_loss/len(train_loader):.4f} | val_AUROC={auroc:.4f}")

    model.load_state_dict(best_state)
    model.eval()

    with torch.no_grad():
        test_logits = model(torch.tensor(X_test_s))
        test_probs = torch.sigmoid(test_logits).numpy()
    test_preds = (test_probs >= 0.5).astype(int)

    test_auroc = roc_auc_score(y_test, test_probs)
    test_acc = accuracy_score(y_test, test_preds)
    test_f1 = f1_score(y_test, test_preds)
    cm = confusion_matrix(y_test, test_preds)

    print("\n=== نتائج حقيقية على مجموعة اختبار معزولة (لم تُستخدم في التدريب) ===")
    print(f"Test AUROC: {test_auroc:.4f}")
    print(f"Test Accuracy: {test_acc:.4f}")
    print(f"Test F1: {test_f1:.4f}")
    print(f"Confusion Matrix:\n{cm}")

    # --- تحقق خارجي حقيقي على "validation cohort" من كوريا الجنوبية (بيانات لم تُستخدم إطلاقًا) ---
    ext_df = pd.read_csv(VAL_EXTERNAL_PATH)
    X_ext = ext_df[FEATURES].values.astype(np.float32)
    y_ext = 1.0 - ext_df[LABEL].values.astype(np.float32)
    X_ext_s = scaler.transform(X_ext)
    with torch.no_grad():
        ext_probs = torch.sigmoid(model(torch.tensor(X_ext_s))).numpy()
    try:
        ext_auroc = roc_auc_score(y_ext, ext_probs)
        print(f"\nAUROC على مجموعة تحقق خارجية حقيقية (كوريا الجنوبية، {len(X_ext)} حالة): {ext_auroc:.4f}")
    except ValueError:
        ext_auroc = None
        print("\n(مجموعة التحقق الخارجية بها فئة واحدة فقط، تعذّر حساب AUROC)")

    torch.save(model.state_dict(), os.path.join(MODEL_DIR, "survival_mlp.pt"))

    # --- تصدير الأوزان لصيغة JSON (يُستخدم كـ fallback في المتصفح لو السيرفر مقفول) ---
    weights_json = {}
    for name, param in model.state_dict().items():
        weights_json[name] = param.numpy().tolist()
    weights_json["_scaler_mean"] = scaler.mean_.tolist()
    weights_json["_scaler_scale"] = scaler.scale_.tolist()
    weights_json["_feature_order"] = FEATURES
    with open(os.path.join(MODEL_DIR, "survival_mlp_weights.json"), "w") as f:
        json.dump(weights_json, f)

    report = {
        "dataset": "Sepsis Survival Minimal Clinical Records (Chicco & Jurman, 2020)",
        "dataset_license": "CC BY 4.0",
        "dataset_doi": "10.1038/s41598-020-73558-3",
        "n_train": len(X_train), "n_val": len(X_val), "n_test": len(X_test),
        "test_auroc": float(test_auroc), "test_accuracy": float(test_acc), "test_f1": float(test_f1),
        "external_validation_auroc": float(ext_auroc) if ext_auroc else None,
        "external_validation_n": len(X_ext),
        "confusion_matrix": cm.tolist(),
    }
    os.makedirs("reports", exist_ok=True)
    with open("reports/survival_model_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"\nتم الحفظ: {MODEL_DIR}/survival_mlp.pt و {MODEL_DIR}/survival_mlp_weights.json")
    print("تقرير كامل: reports/survival_model_report.json")
    return model, scaler, report


if __name__ == "__main__":
    train()
