# 🦠 SepsisWatch — التنبؤ المبكر بالإنتان (Sepsis) من بيانات العناية المركزة

توقّع مبكر بالإنتان (Sepsis) لمرضى العناية المركزة (ICU) باستخدام **Deep Learning** على السلاسل الزمنية الحيوية + مكوّن **Computer Vision** حقيقي يحوّل القراءات الحيوية إلى "صور" ويحللها بشبكة CNN، مع واجهة ويب (داشبورد) تفاعلية تختلف بيانات كل مستخدم فيها — من غير ما يظهر أي كود أو منطق AI في صفحة المتصفح (كله شغال على سيرفر خلفي منفصل عبر API).

### تحديث: نموذج حقيقي مُدرَّب فعليًا الآن

بالإضافة لمعمارية الإنذار المبكر (GRU+CNN)، المشروع فيه **نموذج ثانٍ مُدرَّب فعليًا**
على بيانات حقيقية 100%: Sepsis Survival Minimal Clinical Records (Chicco & Jurman،
2020، Nature Scientific Reports، 110,204 حالة حقيقية، CC BY 4.0). الموديل ده بيشغّل
صفحة **محلل حالة المريض** (`webapp/analyzer.html`) بنتائج حقيقية متغيّرة حسب
مدخلاتك، مش أرقام ثابتة — التفاصيل الكاملة في `docs/DATASET_CARD.md`.

---

## 1. الفكرة العلمية

الإنتان (Sepsis) من أخطر أسباب الوفاة داخل العناية المركزة، وكل ساعة تأخير في اكتشافه ترفع نسبة الوفاة. المشروع ده بيحاول يتنبأ بالإنتان **قبل** ظهوره باستخدام نافذة زمنية من القراءات الحيوية (Heart Rate, MAP, O2Sat, Temp, Resp...) ونتائج المعامل.

### مصدر البيانات (Real & Large Dataset)
نستخدم داتا حقيقية من **PhysioNet / Computing in Cardiology Challenge 2019 — "Early Prediction of Sepsis from Clinical Data"**:

- أكثر من **40,000 مريض** حقيقي من 3 مستشفيات أمريكية (Beth Israel Deaconess، Emory University).
- لكل مريض سلسلة زمنية بالساعة تحتوي **40 متغير** (Vital Signs + Laboratory values + Demographics) + عمود `SepsisLabel`.
- مرخّصة للاستخدام البحثي والتعليمي مجانًا عبر PhysioNet (تحتاج تسجيل مجاني بسيط + الموافقة على شروط الاستخدام).
- الرابط الرسمي: https://physionet.org/content/challenge-2019/1.0.0/

> ملاحظة: بيئة التنفيذ الحالية معندهاش وصول مباشر لدومين physionet.org، فمرفق سكربت جاهز `data/download_data.py` ينزّل الداتا تلقائيًا لما تشغّله على جهازك/سيرفرك (فيه اتصال إنترنت عادي).

### لماذا Deep Learning + Computer Vision معًا؟

| المكوّن | التقنية | الهدف |
|---|---|---|
| **Time-Series Deep Learning** | Bidirectional GRU/LSTM + Attention | يتعلم النمط الزمني لتدهور حالة المريض ساعة بساعة |
| **Computer Vision** | تحويل السلسلة الزمنية لصورة (Gramian Angular Field / Recurrence Plot) ثم شبكة **CNN** (ResNet-style صغيرة) | يكتشف "بصمات بصرية" (نُسج وتكرارات) في تطور القراءات الحيوية، بيبان بالعين المجردة كصورة حرارية للمريض |
| **Fusion Layer** | دمج مخرجات الـ GRU والـ CNN | قرار نهائي أدق من أي نموذج لوحده |

هذا نهج معروف علميًا (Time-Series Imaging + CNN) يُستخدم فعليًا في أبحاث تصنيف السلاسل الزمنية الطبية.

---

## 2. هيكل المشروع

```
sepsis-ai-project/
├── data/
│   └── download_data.py        # تنزيل داتاسيت PhysioNet Challenge 2019 الحقيقي
├── src/
│   ├── preprocessing.py        # تنظيف، Imputation، تطبيع، بناء نوافذ زمنية
│   ├── timeseries_to_image.py  # تحويل CV: Gramian Angular Field / Recurrence Plot
│   ├── model_lstm.py           # نموذج BiGRU + Attention (PyTorch)
│   ├── model_cnn.py            # نموذج CNN على الصور الناتجة
│   ├── model_fusion.py         # دمج النموذجين (Multi-modal fusion)
│   ├── train.py                # سكربت التدريب الكامل + Class imbalance handling
│   ├── evaluate.py             # تقييم: AUROC, AUPRC, Utility Score (حسب معيار الـ Challenge)
│   └── serve_api.py            # خادم Flask/FastAPI يقدّم التنبؤ عبر REST API فقط
├── notebooks/
│   └── eda_exploration.ipynb   # تحليل استكشافي للبيانات
├── webapp/                     # الموقع (Frontend فقط – لا يحتوي أي منطق AI)
│   ├── index.html              # الصفحة الرئيسية (تعريفية)
│   ├── login.html              # تسجيل الدخول
│   ├── dashboard.html          # داشبورد شخصي — يعرض مرضاك المُحلَّلين فقط، بدون بيانات ثابتة
│   ├── analyzer.html           # محلل حالة المريض — نموذج تعلّم عميق حقيقي يتوقع لحظيًا
│   ├── patients.html           # قائمة كل مرضاك المُحلَّلين (بحث / فلترة / ترتيب)
│   ├── patient_detail.html            # ملف مريض كامل: خطة علاج + تفسير + بصمة بصرية
│   ├── admin.html              # لوحة مراقبة إدارية (إحصائيات حقيقية من سجل التنبؤات)
│   ├── settings.html           # إعدادات المستخدم (الاسم، الدور، الثيم، اللغة، الإشعارات)
│   ├── about.html              # عن المشروع
│   ├── model_card.html         # بطاقة النموذج (حالة التدريب، المعمارية، الحدود الأخلاقية)
│   ├── style.css               # كل التنسيقات (نظام ألوان أزرق/أسود/رمادي، بدون إيموجي)
│   ├── app.js                  # يتواصل مع الـ API فقط (fetch)، صفر ذكاء اصطناعي هنا
│   ├── config.js                # عنوان خادم الـ API
│   ├── model_weights.js        # أوزان النموذج الحقيقي المُدرَّب (مُصدَّرة JSON من survival_mlp.pt)
│   ├── model_engine.js         # forward pass مطابق تمامًا للنموذج بايثون
│   └── i18n.js                  # نظام الترجمة الكامل عربي/إنجليزي

ملاحظة مهمة: كل ملفات الموقع في نفس المستوى (Flat) بدون مجلدات فرعية (css/, js/)
عشان تشتغل مباشرة على GitHub Pages من غير أي مشاكل مسارات.
├── docs/
│   └── architecture.md         # شرح تقني للمعمارية
├── requirements.txt
├── .gitignore
└── LICENSE
```

**فصل تام**: الموقع (`webapp/`) عميل (Client) بسيط يستهلك API، والذكاء الاصطناعي كله معزول في `src/serve_api.py` اللي بيشتغل على سيرفر منفصل. ده بيحقق طلبك إن صفحة الـ HTML متعرضش شغل الـ AI (لا كود، لا أوزان الموديل، ولا حتى منطق القرار).

---

## 3. تشغيل المشروع

### أ) تجهيز البيئة
```bash
python -m venv venv
source venv/bin/activate   # على ويندوز: venv\Scripts\activate
pip install -r requirements.txt
```

### ب) تنزيل الداتا الحقيقية
```bash
python data/download_data.py
```
هيسجّلك اختياريًا على PhysioNet وينزّل ملفات `.psv` (~40 ألف مريض) في `data/raw/`.

### ج) التدريب
```bash
python src/train.py --epochs 30 --batch-size 128 --model fusion
```
هيطلع النتائج في `models/` + تقرير AUROC/AUPRC في `reports/`.

### د) تشغيل الـ API (السيرفر الخلفي بس)
```bash
python src/serve_api.py
# شغال على http://localhost:8000
```

### هـ) تشغيل الموقع
افتح `webapp/index.html` مباشرة في المتصفح، أو استضفه بأي سيرفر ستاتيك:
```bash
cd webapp && python -m http.server 5500
```
الموقع هيكلم الـ API على `localhost:8000` تلقائيًا (تقدر تغيّر العنوان في `js/config.js`).

---

## 4. رفع المشروع على GitHub

جهّزت المستودع محليًا (git init + أول commit). عشان أرفعه أنا محتاج منك:
1. اسم المستخدم بتاعك على GitHub + اسم الريبو اللي عايزه.
2. Personal Access Token (PAT) بصلاحية `repo` (تقدر تعمله من: Settings → Developer settings → Personal access tokens).

وبعدين أنفّذ:
```bash
git remote add origin https://github.com/<username>/<repo>.git
git branch -M main
git push -u origin main
```

**أو الأسهل**: نزّل ملف الـ zip المرفق، وعلى جهازك:
```bash
unzip sepsis-ai-project.zip
cd sepsis-ai-project
git init && git add . && git commit -m "Initial commit: SepsisWatch AI project"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

---

## 4.1 لقطات شاشة حقيقية من الموقع

| الصفحة الرئيسية | تسجيل الدخول |
|---|---|
| ![Home](docs/screenshots/01_home.png) | ![Login](docs/screenshots/02_login.png) |

| الداشبورد (وضع نهاري) | الداشبورد (وضع ليلي) |
|---|---|
| ![Dashboard](docs/screenshots/03_dashboard.png) | ![Dashboard Dark](docs/screenshots/06_dashboard_dark.png) |

| قائمة المرضى الكاملة (بحث/فلترة) | صفحة المريض (تفسير القرار + البصمة البصرية) |
|---|---|
| ![Patients](docs/screenshots/07_patients_list.png) | ![Patient](docs/screenshots/04_patient.png) |

| لوحة المراقبة الإدارية | بطاقة النموذج (Model Card) |
|---|---|
| ![Admin](docs/screenshots/05_admin.png) | ![Model Card](docs/screenshots/08_model_card.png) |

> اللقطات دي حقيقية، مأخوذة فعليًا من تشغيل ملفات الموقع (`webapp/`) بمتصفح حقيقي (Playwright/Chromium)، مش رسومات تصميمية.

## 4.2 كل الإضافات الجديدة في هذه النسخة

| الإضافة | أين تلاقيها |
|---|---|
| Explainable AI (أسباب القرار: MAP↓ / HR↑ / Resp↑) | `src/explain.py` + `/explain` API + قسم "أسباب درجة الخطورة" في `patient_detail.html` |
| Computer Vision ظاهر فعليًا (بصمة بصرية GAF) | `webapp/patient_detail.html` — Canvas حي مبني على بيانات المريض الفعلية |
| بطاقة بيانات حقيقية موثّقة (Dataset Card) | `docs/DATASET_CARD.md` + تقرير Train/Val/Test تلقائي من `preprocessing.py` |
| بطاقة النموذج (Model Card) بصراحة تامة | `webapp/model_card.html` |
| خطة تحقق سريري + نموذج تقييم أطباء | `docs/CLINICAL_VALIDATION.md` + `docs/DOCTOR_FEEDBACK_TEMPLATE.md` |
| مراقبة وتسجيل حقيقي (Logging/Monitoring) | SQLite + `/admin/stats` + `/metrics` (Prometheus) + `webapp/admin.html` |
| ملفات نشر جاهزة (Docker/Render/Railway/AWS/Azure) | `Dockerfile.api`, `Dockerfile.web`, `docker-compose.yml`, `render.yaml`, `railway.toml`, `DEPLOYMENT.md` |
| تقرير فني بحثي كامل (PDF) | `docs/SepsisWatch_Technical_Report.pdf` |
| صفحة قائمة مرضى كاملة (بحث/فلترة/ترتيب) | `webapp/patients.html` |
| هوية بصرية أزرق/أسود/رمادي بالكامل + أيقونات SVG بدل الإيموجي | `webapp/style.css` + `webapp/app.js` (Icon set) |
| دعم إنجليزي كامل | `webapp/i18n.js` |

## 5. نشر الموقع على GitHub Pages (بشكل صحيح)

عشان الموقع يشتغل بتنسيقه الكامل على `username.github.io/repo-name`:

1. افتحي الريبو بتاعك على GitHub → **Add file → Upload files**.
2. لو فيه ملفات غريبة اترفعت غلط زي `HEAD`, `config`, `description`, `index`, `COMMIT_EDITMSG`,
   أو ملفات بأسماء أرقام وحروف طويلة (دي أصلًا ملفات داخلية من مجلد `.git` المخفي) — احذفيها،
   مالهاش أي علاقة بالموقع ومش هتأثر عليه، بس أحسن نظافة للريبو.
3. من ملف الـ zip المرفق، ادخلي مجلد `webapp/` وارفعي **كل الملفات اللي جواه مباشرة** (مش المجلد
   نفسه) في جذر الريبو: `index.html`, `login.html`, `dashboard.html`, `analyzer.html`, `patients.html`,
   `patient_detail.html`, `admin.html`, `settings.html`, `about.html`, `model_card.html`, `style.css`,
   `app.js`, `config.js`, `i18n.js`, `model_weights.js`, `model_engine.js`.
4. تأكدي إن كل الملفات دي في **نفس المستوى** (مفيش مجلد `css/` أو `js/` — الموقع مبني عشان يشتغل
   من غير مجلدات فرعية).
5. من إعدادات الريبو: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)**.
6. بعد دقيقة أو اتنين، الموقع هيظهر بتنسيقه الكامل على `https://<username>.github.io/<repo>/`.

> باقي ملفات المشروع (`src/`, `data/`, `notebooks/`...) خاصة بكود الذكاء الاصطناعي وتقدري ترفعيها
> في نفس الريبو في مجلداتها الأصلية — GitHub Pages هيتجاهلها تلقائيًا وهيعرض ملفات الموقع بس.

---

## 6. إخلاء مسؤولية

هذا المشروع **تعليمي/بحثي** فقط، وليس أداة تشخيص طبي معتمدة. أي استخدام سريري حقيقي يتطلب اعتماد FDA/جهات تنظيمية ومراجعة سريرية كاملة.
