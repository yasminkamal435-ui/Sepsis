"""
مكوّن الـ Computer Vision الحقيقي في المشروع:

يحوّل كل نافذة زمنية من القراءات الحيوية (12 ساعة × N متغير) إلى "صورة"
باستخدام تقنيتين معروفتين في أدبيات تصنيف السلاسل الزمنية بالـ CNN:

1) Gramian Angular Field (GAF) — يحوّل كل متغير حيوي لصورة تعبّر عن
   العلاقات الزاوية بين كل نقطتي زمن، فبتظهر "بصمة بصرية" لاتجاه
   وتسارع تدهور حالة المريض ينفع تكتشفها شبكة CNN بالعين.

2) Recurrence Plot (RP) — يبرز الأنماط المتكررة/غير المستقرة في القراءات
   (زيادة التذبذب في معدل ضربات القلب مثلاً قبل الإنتان بساعات).

الناتج: صورة متعددة القنوات (Multi-channel image) تُغذّى مباشرة لشبكة
CNN في model_cnn.py — وهنا الفرق الحقيقي عن نموذج LSTM عادي: الشبكة
بتشوف نسيج بصري للحالة الصحية مش أرقام مجردة بس.
"""
import numpy as np


def _normalize_series(x: np.ndarray) -> np.ndarray:
    """تطبيع القيم لمدى [-1, 1] وهو شرط أساسي لتحويل GAF"""
    x_min, x_max = x.min(), x.max()
    if x_max - x_min < 1e-8:
        return np.zeros_like(x)
    return 2 * (x - x_min) / (x_max - x_min) - 1


def gramian_angular_field(series: np.ndarray) -> np.ndarray:
    """
    يحوّل سلسلة زمنية 1D بطول T إلى صورة T×T (GASF: Summation variant)
    """
    x = _normalize_series(series)
    x = np.clip(x, -1, 1)
    phi = np.arccos(x)
    gaf = np.cos(phi[:, None] + phi[None, :])
    return gaf.astype(np.float32)


def recurrence_plot(series: np.ndarray, threshold: float = 0.3) -> np.ndarray:
    """يبني Recurrence Plot: مصفوفة T×T تبيّن تشابه القيم عبر الزمن"""
    x = _normalize_series(series)
    dist = np.abs(x[:, None] - x[None, :])
    rp = (dist < threshold).astype(np.float32)
    return rp


def window_to_image(window: np.ndarray, channel_indices=(0, 1, 4, 6)) -> np.ndarray:
    """
    window: مصفوفة (T, F) لنافذة زمنية واحدة (T ساعات × F متغيرات)
    channel_indices: نختار أهم 4 قراءات حيوية للتحويل البصري
        (افتراضيًا: HR, O2Sat, MAP, Resp حسب ترتيب FEATURE_COLS)

    يرجّع صورة متعددة القنوات (C, T, T) جاهزة لـ CNN:
        قناتين GAF + قناتين Recurrence Plot لكل متغير مختار، مدموجة
        في تمثيل بصري واحد (نأخذ متوسط القنوات المختارة لتبسيط الإدخال).
    """
    T = window.shape[0]
    gaf_stack, rp_stack = [], []
    for idx in channel_indices:
        series = window[:, idx]
        gaf_stack.append(gramian_angular_field(series))
        rp_stack.append(recurrence_plot(series))

    gaf_img = np.mean(gaf_stack, axis=0)
    rp_img = np.mean(rp_stack, axis=0)
    image = np.stack([gaf_img, rp_img], axis=0)  # shape: (2, T, T)
    return image.astype(np.float32)


def batch_windows_to_images(X: np.ndarray, channel_indices=(0, 1, 4, 6)) -> np.ndarray:
    """يحوّل دفعة كاملة من النوافذ (N, T, F) إلى صور (N, 2, T, T)"""
    return np.stack([window_to_image(w, channel_indices) for w in X], axis=0)


if __name__ == "__main__":
    # تجربة سريعة على بيانات وهمية للتأكد من صحة الأبعاد
    dummy_window = np.random.randn(12, 34)
    img = window_to_image(dummy_window)
    print("Image shape:", img.shape)  # (2, 12, 12)
