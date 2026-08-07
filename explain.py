"""
Explainable AI — يفسّر ليه النموذج طلّع درجة خطورة معيّنة لمريض معيّن.

بيوفر مستويين:
  1) explain_with_shap(): تفسير حقيقي دقيق باستخدام مكتبة SHAP (GradientExplainer)
     على فرع الـ GRU — يحتاج نموذج مدرَّب فعليًا (models/sepsis_fusion_best.pt)
     وعينة خلفية (background sample) من بيانات التدريب.
  2) explain_with_deltas(): تفسير مبسّط وسريع (Fallback) مبني على اتجاه كل متغير
     حيوي خلال النافذة الزمنية — نفس الفكرة اللي بتظهر في الداشبورد كنسخة تجريبية
     لما السيرفر الحقيقي مش متاح، عشان يبقى في اتساق بين الاتنين.

النتيجة في الحالتين: قايمة بأكتر المتغيرات تأثيرًا في القرار (مثال: "MAP منخفض"،
"HR مرتفع")، بترجع للـ API في serve_api.py وتتعرض في صفحة المريض بالداشبورد.
"""
import numpy as np

from preprocessing import FEATURE_COLS

# أسماء عرض مبسّطة للمتغيرات الأكثر أهمية سريريًا (تُستخدم في التفسير)
DISPLAY_NAMES_AR = {
    "HR": "معدل ضربات القلب", "MAP": "متوسط الضغط الشرياني", "Resp": "معدل التنفس",
    "Temp": "درجة الحرارة", "O2Sat": "تشبع الأكسجين", "SBP": "الضغط الانقباضي",
    "Lactate": "اللاكتات", "WBC": "كرات الدم البيضاء", "Creatinine": "الكرياتينين",
}
DISPLAY_NAMES_EN = {
    "HR": "Heart rate", "MAP": "Mean arterial pressure", "Resp": "Respiration rate",
    "Temp": "Temperature", "O2Sat": "Oxygen saturation", "SBP": "Systolic BP",
    "Lactate": "Lactate", "WBC": "White blood cell count", "Creatinine": "Creatinine",
}


def explain_with_deltas(window: np.ndarray, lang: str = "ar", top_k: int = 4):
    """
    تفسير سريع بدون حاجة لتشغيل الموديل: يقارن أول ربع الساعات بآخر ربعها
    لكل متغير، ويحدد أكتر المتغيرات اللي اتغيّرت باتجاه "غير طبيعي سريريًا"
    (ارتفاع HR/Resp/Temp أو انخفاض MAP/O2Sat).
    window: مصفوفة (T, F) بنفس ترتيب FEATURE_COLS
    """
    names = DISPLAY_NAMES_EN if lang == "en" else DISPLAY_NAMES_AR
    bad_direction = {"HR": +1, "MAP": -1, "Resp": +1, "Temp": +1, "O2Sat": -1,
                      "SBP": -1, "Lactate": +1, "WBC": +1, "Creatinine": +1}

    T = window.shape[0]
    q = max(1, T // 4)
    contributions = []
    for var, direction in bad_direction.items():
        if var not in FEATURE_COLS:
            continue
        col = FEATURE_COLS.index(var)
        first = window[:q, col].mean()
        last = window[-q:, col].mean()
        delta = (last - first) * direction  # موجب = اتجاه سيء سريريًا
        contributions.append({
            "variable": var,
            "display_name": names.get(var, var),
            "delta": float(delta),
            "direction": "up" if (last - first) > 0 else "down",
        })

    contributions.sort(key=lambda c: c["delta"], reverse=True)
    top = contributions[:top_k]
    total = sum(max(c["delta"], 0) for c in top) or 1.0
    for c in top:
        c["weight"] = round(max(c["delta"], 0) / total, 3)
    return top


def explain_with_shap(model, background_batch, sample_window, device="cpu"):
    """
    تفسير دقيق حقيقي باستخدام SHAP — يُستدعى فقط لما يكون فيه نموذج مدرَّب فعليًا.

    model: SepsisGRUModel أو الفرع الزمني من SepsisFusionModel (نطبّق SHAP على
           المدخل الزمني لأنه الأسهل تفسيرًا؛ فرع CNN بيتفسّر بصريًا بدل رقميًا).
    background_batch: عيّنة عشوائية (~50-100) من بيانات التدريب كخلفية مرجعية لـ SHAP
    sample_window: العيّنة المطلوب تفسيرها، شكلها (1, T, F)
    """
    import torch
    try:
        import shap
    except ImportError as e:
        raise RuntimeError(
            "مكتبة shap غير مثبتة. ثبّتيها بـ: pip install shap --break-system-packages"
        ) from e

    model.eval()
    background = torch.tensor(background_batch, dtype=torch.float32).to(device)
    sample = torch.tensor(sample_window, dtype=torch.float32).to(device)

    explainer = shap.GradientExplainer(model, background)
    shap_values = explainer.shap_values(sample)  # shape: (1, T, F)

    # نجمع أهمية كل متغير عبر كل الساعات (مجموع القيم المطلقة)
    per_feature = np.abs(shap_values[0]).sum(axis=0)  # (F,)
    order = np.argsort(per_feature)[::-1]

    results = []
    for idx in order[:6]:
        var = FEATURE_COLS[idx]
        results.append({
            "variable": var,
            "display_name": DISPLAY_NAMES_AR.get(var, var),
            "importance": float(per_feature[idx]),
        })
    total = sum(r["importance"] for r in results) or 1.0
    for r in results:
        r["weight"] = round(r["importance"] / total, 3)
    return results


if __name__ == "__main__":
    # تجربة سريعة بالتفسير المبسّط على بيانات وهمية
    dummy = np.random.randn(12, len(FEATURE_COLS)).astype(np.float32)
    dummy[-3:, FEATURE_COLS.index("MAP")] -= 2.0  # نمثّل هبوط في الضغط
    dummy[-3:, FEATURE_COLS.index("HR")] += 2.0   # ونمثّل ارتفاع في النبض
    for c in explain_with_deltas(dummy):
        print(c)
