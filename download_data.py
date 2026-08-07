"""
تنزيل داتاسيت PhysioNet / CinC Challenge 2019 الحقيقي:
"Early Prediction of Sepsis from Clinical Data"
https://physionet.org/content/challenge-2019/1.0.0/

الداتا مقسّمة لجزئين (setA و setB) من مستشفيين مختلفين:
- setA: Beth Israel Deaconess Medical Center  (~20,336 مريض)
- setB: Emory University Hospital             (~20,000 مريض)

كل مريض ملف .psv منفصل، كل صف = ساعة واحدة من الإقامة في ICU،
وفيه 40 عمود (Vitals + Labs + Demographics) + عمود SepsisLabel (0/1).

الاستخدام:
    python data/download_data.py --out data/raw
"""
import argparse
import os
import zipfile
import urllib.request
import shutil
import sys

PHYSIONET_BASE = "https://physionet.org/files/challenge-2019/1.0.0/training"
SETS = {
    "setA": f"{PHYSIONET_BASE}/training_setA.zip",
    "setB": f"{PHYSIONET_BASE}/training_setB.zip",
}


def download_file(url: str, dest: str):
    print(f"↓ تنزيل: {url}")
    try:
        with urllib.request.urlopen(url) as response, open(dest, "wb") as out_file:
            total = int(response.getheader("Content-Length", 0))
            downloaded = 0
            chunk = 1024 * 1024
            while True:
                buf = response.read(chunk)
                if not buf:
                    break
                out_file.write(buf)
                downloaded += len(buf)
                if total:
                    pct = downloaded * 100 // total
                    sys.stdout.write(f"\r  {pct}% ({downloaded/1e6:.1f} MB)")
                    sys.stdout.flush()
        print("\n  تم التنزيل ✔")
    except Exception as e:
        print(f"\n  تعذر التنزيل التلقائي: {e}")
        print("  يمكنك التنزيل يدويًا من:")
        print("  https://physionet.org/content/challenge-2019/1.0.0/")
        raise


def main():
    parser = argparse.ArgumentParser(description="Download PhysioNet Sepsis Challenge 2019 dataset")
    parser.add_argument("--out", default="data/raw", help="مجلد الحفظ")
    parser.add_argument("--sets", nargs="+", default=["setA", "setB"], choices=list(SETS.keys()))
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    for name in args.sets:
        url = SETS[name]
        zip_path = os.path.join(args.out, f"{name}.zip")
        extract_path = os.path.join(args.out, name)

        if os.path.isdir(extract_path) and os.listdir(extract_path):
            print(f"✔ {name} موجود بالفعل، تخطي.")
            continue

        download_file(url, zip_path)

        print(f"  فك الضغط...")
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_path)
        os.remove(zip_path)
        print(f"✔ {name} جاهز في {extract_path}")

    print("\nتم تجهيز الداتا الحقيقية. عدد الملفات:")
    for name in args.sets:
        p = os.path.join(args.out, name)
        n = sum(len(files) for _, _, files in os.walk(p) if files)
        print(f"  {name}: {n} ملف مريض (.psv)")

    print("\nالخطوة التالية: python src/preprocessing.py")


if __name__ == "__main__":
    main()
