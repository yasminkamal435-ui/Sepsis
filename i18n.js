/* =========================================================================
   i18n.js — نظام تبديل اللغة (عربي/إنجليزي) لكل صفحات الموقع.
يعتمد على data-i18n / data-i18n-html / data-i18n-placeholder في الـ HTML.
لا علاقة له بمنطق الذكاء الاصطناعي إطلاقًا — ترجمة نصوص واجهة فقط.
   ========================================================================= */

const I18N = {
  ar: {
    nav_how:"كيف يعمل", nav_features:"المميزات", nav_dataset:"البيانات", nav_about:"عن المشروع",
    nav_login:"تسجيل الدخول", nav_cta:"جرّب الداشبورد",

    hero_eyebrow:"● نظام دعم قرار سريري — تعليمي/بحثي",
    hero_title:"اكتشف <span class=\"accent\">الإنتان</span>قبل ظهوره بساعات، مش بعد ما يتأخر",
    hero_lead:"SepsisWatch بيحلل قراءاتك الحيوية بشبكة عصبية حقيقية، ويوريك مستوى الخطورة وأسبابها بلغة بسيطة، مع خطة رعاية شخصية بتتغيّر حسب حالتك إنت — كله في مكان واحد، ليك إنت بس.",
    hero_cta1:"ابدأ الداشبورد التجريبي", hero_cta2:"شوف الآلية",
    hero_stat1_label:"مريض حقيقي في مجموعة التدريب",
    hero_stat2_num:"6 ساعات", hero_stat2_label:"متوسط أفق التنبؤ المبكر",
    hero_stat3_num:"34 متغير", hero_stat3_label:"حيوي ومعملي لكل مريض",
    wf_label:"HR · MAP · RESP — بث تجريبي",

    how_eyebrow:"الآلية", how_title:"من القراءة الحيوية إلى قرار سريري",
    how_desc:"خط أنابيب من 4 مراحل يحوّل قراءاتك الخام إلى تقييم واضح لخطورتك مع خطة رعاية شخصية — من غير ما نفصح عن التفاصيل الداخلية للنموذج هنا (متاحة كاملة للمطورين في مستودع الكود).",
    pipe1_h:"جمع القراءات ساعة بساعة", pipe1_p:"معدل ضربات القلب، الضغط، التنفس، الحرارة، ونتائج المعامل تُجمّع تلقائيًا من أجهزة المراقبة والسجل الطبي الإلكتروني.",
    pipe2_h:"تحليل النمط الزمني", pipe2_p:"النظام يقارن اتجاه آخر 12 ساعة بآلاف الحالات المشابهة في تاريخه التدريبي، ويحدد هل الاتجاه الحالي يشبه بداية تدهور نحو الإنتان.",
    pipe3_h:"حساب درجة الخطورة", pipe3_p:"تُنتج درجة احتمالية من 0 إلى 100%، مقسّمة لثلاث فئات: منخفض، متوسط، مرتفع — مع توضيح أكثر الساعات تأثيرًا في القرار.",
    pipe4_h:"تنبيه فريق الرعاية", pipe4_p:"تنبيه فوري على الداشبورد يوضح المريض، السرير، ودرجة الخطورة، مع إمكانية تأكيد الاطلاع أو تصعيد الحالة لطبيب مناوب.",

    feat_eyebrow:"مميزات الداشبورد", feat_title:"مصمم حوالين وردية العمل الفعلية",
    feat_desc:"مش مجرد أرقام — الداشبورد بيتغيّر حسب دور المستخدم، تفضيلاته، ووردية عمله.",
    feat1_h:"داشبورد شخصي بيتعلّم منك", feat1_p:"كل حالة تحللها بتتحفظ في داشبوردك الشخصي — الأفكار والتوصيات كلها مبنية على الحالات اللي حللتها إنت فعليًا، مش بيانات عامة.",
    feat2_h:"مركز تنبيهات ذكي", feat2_p:"تنبيهات مرتبة حسب الخطورة، مع إمكانية تأكيد الاطلاع، تصعيد الحالة، أو كتم تنبيهات مريض معيّن مؤقتًا.",
    feat3_h:"ودجات قابلة للتخصيص", feat3_p:"كل مستخدم يقدر يفعّل أو يخفي الودجات اللي يحتاجها (اتجاهات، ملاحظات التسليم، خريطة الأسرّة...) ويتحفظله تلقائيًا.",
    feat4_h:"وضع ليلي مريح للعين", feat4_p:"وضع داكن مريح للعين وقت الاستخدام بالليل، يتفعّل ويتذكر تفضيلك تلقائيًا في كل زيارة.",
    feat5_h:"عربي / إنجليزي", feat5_p:"تبديل فوري للغة الواجهة بين العربية والإنجليزية لفرق العمل متعددة الجنسيات.",
    feat6_h:"سجل زمني لكل مريض", feat6_p:"خط زمني كامل لتطور درجة الخطورة والقراءات الحيوية، مع أهم الملاحظات السريرية المسجّلة.",

    dataset_eyebrow:"مصدر البيانات", dataset_title:"مبني على بيانات حقيقية فعليًا، بصراحة كاملة",
    dataset_desc:"النموذج الشغال دلوقتي في محلل الحالة متدرّب فعليًا على داتاسيت Sepsis Survival Minimal Clinical Records الحقيقي (Chicco & Jurman, 2020). أما مكوّن Computer Vision (GRU+CNN+Fusion) فمبني بالكامل بالكود على معمارية مُصمَّمة لبيانات PhysioNet Challenge 2019 الزمنية، وجاهز للتدريب عليها فور توفّرها.",
    dataset_cta:"تفاصيل المنهجية", dataset_cta2:"بطاقة النموذج بصراحة كاملة",
    dstat1:"سجل حقيقي مُستخدم فعليًا في التدريب", dstat2:"AUROC حقيقي على test set منفصل", dstat3:"مريض PhysioNet لمكوّن الـ CV (روادماب)", dstat4:"شفافية — صفر أرقام مُلفّقة",

    footer_line1:"SepsisWatch © 2026 — مشروع تعليمي/بحثي، وليس أداة تشخيص طبي معتمدة.",
    footer_line2:"مبني على PhysioNet Challenge 2019",

    // تسجيل الدخول
    login_title:"أهلًا بيك", login_sub:"اكتب اسمك، وهتدخل على طول لمحلل حالتك الشخصي.",
    login_name_label:"الاسم", login_name_ph:"اكتب اسمك بالكامل",
    login_submit:"ابدأ الآن",
    login_visual_h:"كل ثانية بتفرق<br>في اكتشاف الإنتان مبكرًا",
    login_visual_p:"اكتب اسمك وابدأ فورًا — الموقع بيفتكر تفضيلاتك وحالاتك اللي حللتها في كل مرة تدخل.",
    login_disclaimer:"مشروع تعليمي/بحثي — البيانات المعروضة هنا تجريبية بالكامل.",

    // الداشبورد
    side_overview: "نظرة عامة", side_bedmap: "خريطة الأسرّة", side_alerts: "التنبيهات",
    side_patients: "قائمة المرضى", side_recent: "زُرت مؤخرًا", side_settings: "الإعدادات",
    side_about:"ℹ عن المشروع", side_logout: "تسجيل الخروج",
    search_ph:"ابحث عن مريض، سرير، أو وحدة...",
    greeting_prefix:"أهلًا بيك،", role_line_prefix:"لوحتك الشخصية لتحليل الحالات وتوليد خطط الرعاية", role_line_suffix:"",
    kpi1:"مرضى تم تحليلهم", kpi2:"حالات خطر مرتفع",
    panel_patients:"مرضاي المُحلَّلون", view_all:"عرض الكل",
    panel_alerts: "آخر التنبيهات", panel_shift: "وردية العمل الحالية",
    shift_user:"مسؤول الوردية", shift_start:"بداية الوردية", shift_end:"نهاية الوردية", shift_beds:"عدد الأسرّة المخصصة",
    panel_widgets: "تخصيص الودجات", w_alerts:"مركز التنبيهات", w_trends:"اتجاهات القراءات", w_shift:"وردية العمل", w_notes:"ملاحظات التسليم",
    panel_notes: "ملاحظات التسليم بين الورديات",
    notes_body:"لا توجد ملاحظات جديدة من الوردية السابقة. آخر تحديث: منذ 3 ساعات — تم تثبيت حالة المريض P-1103 بعد ضبط جرعة السوائل الوريدية.",
    panel_bedmap: "خريطة الحالات الحية",
    no_alerts:"لا توجد تنبيهات نشطة حاليًا ",

    // صفحة المريض
    export_pdf:"تصدير تقرير PDF", escalate:"تصعيد للطبيب المناوب",
    vitals_trend:"اتجاه القراءات الحيوية — آخر 24 ساعة",
    legend_hr:"معدل النبض (HR)", legend_map:"متوسط الضغط الشرياني (MAP)", legend_resp:"معدل التنفس (Resp)",
    gauge_title:"درجة خطورة الإنتان", gauge_calc:"جاري الحساب...",
    top_hours:"أكثر الساعات تأثيرًا", last_update:"آخر تحديث",
    timeline_title:"الخط الزمني للحالة", notes_title:"ملاحظات سريرية",
    note_placeholder:"أضف ملاحظة جديدة...", save_note:"حفظ الملاحظة",

    // عن المشروع
    about_eyebrow:"عن المشروع", about_h1:"SepsisWatch — مشروع تعليمي وبحثي",
    about_intro:"المشروع اتبنى كمثال تطبيقي متكامل لاستخدام الذكاء الاصطناعي في الرعاية الصحية، بيجمع بين تحليل السلاسل الزمنية الطبية وتقنيات رؤية الحاسوب، مبني بالكامل على بيانات عناية مركزة حقيقية ومفتوحة المصدر.",
    about_data_h:"مصدر البيانات",
    about_data_p:"نعتمد على مجموعة بيانات PhysioNet / Computing in Cardiology Challenge 2019 (\"Early Prediction of Sepsis from Clinical Data\")، وهي واحدة من أشهر مجموعات البيانات المفتوحة والمحكّمة علميًا للتنبؤ المبكر بالإنتان، وتضم أكثر من 40 ألف مريض حقيقي من مستشفيين أمريكيين.",
    about_method_h:"المنهجية (نظرة عامة)",
    about_method_p:"يجمع النظام بين فرعين متكاملين: تحليل زمني للاتجاه العام لحالة المريض عبر الساعات، وتحليل بصري يحوّل القراءات الحيوية إلى تمثيل \"صورة\" تُظهر الأنماط والتذبذبات غير المستقرة. النتيجتان تُدمجان في قرار واحد أكثر دقة. التفاصيل الكاملة متاحة بشكل مفتوح في مستودع المشروع على GitHub.",
    about_limits_h:"حدود المشروع وإخلاء المسؤولية",
    about_limits_p:"هذا المشروع تعليمي/بحثي بالكامل، وليس جهازًا طبيًا معتمدًا ولا بديلًا عن التقييم السريري لفريق طبي مؤهل. أي استخدام فعلي يتطلب اعتماد الجهات التنظيمية المختصة ومراجعة أخلاقية وقانونية كاملة.",
    about_code_h:"الكود المصدري",
    about_code_p:"كل كود المعالجة والنماذج متاح في مجلد src/ بالمستودع، منفصل تمامًا عن كود هذا الموقع.",

    who_title:"مبني حواليك إنت بس",
    who_doc_h:"نموذج ذكاء اصطناعي حقيقي بيتعلّم",
    who_doc_1:"شبكة عصبية مُدرَّبة فعليًا على بيانات حقيقية، مش قواعد ثابتة",
    who_doc_2:"خطة رعاية مقترحة تتغيّر مع كل قراءة حيوية مُدخلة، مش نص ثابت",
    who_doc_3:"تفسير Explainable AI بيوضّح إيه العوامل اللي أثّرت على تقييمك",
    who_doc_4:"مكوّن Computer Vision بيحوّل قراءاتك لصور ويحللها بشبكة CNN حقيقية",
    who_pat_h:"تجربة شخصية بالكامل ليك إنت",
    who_pat_1:"أداة \"محلل الحالة\" بمدخلات بسيطة، بدون مصطلحات طبية معقدة",
    who_pat_2:"كل حالة تحللها بتتحفظ في داشبوردك الشخصي، مش بيانات عامة",
    who_pat_3:"خطة رعاية مبنية على القراءات الفعلية اللي دخّلتها إنت",
    who_pat_4:"شفافية كاملة — بطاقة النموذج بتوضح حدود الأداة بصراحة",
    cv_gallery_caption:"Sepsis Survival Minimal Clinical Records — داتاسيت حقيقي منشور (Chicco & Jurman, 2020، DOI: 10.1038/s41598-020-73558-3) بأكتر من 110 ألف سجل حقيقي، مستخدم فعليًا في تدريب نموذج التوقّع.",
    shap_gallery_caption:"نتيجة حقيقية غير مبالغ فيها من التقييم الفعلي على test set منفصل (16,531 سجل) — الأرقام الكاملة في reports/survival_model_report.json.",
    curves_gallery_caption:"الصورة دي مُولّدة فعليًا بكود src/timeseries_to_image.py الحقيقي (Gramian Angular Field + Recurrence Plot) على قراءة توضيحية (مش من مريض حقيقي، لأن الداتاسيت الحالي جدولي مش سلاسل زمنية). موديل GRU/CNN/Fusion الأساسي موجود بالكود الكامل وجاهز يشتغل على بيانات PhysioNet الزمنية الحقيقية فور توفّرها.",
    ai_learning_h:"إزاي النموذج \"بيتعلم\"؟",
    ai_learning_p:"النموذج الشغال دلوقتي في محلل الحالة (survival_mlp) شبكة عصبية حقيقية (Linear → BatchNorm → ReLU ×3 → Linear → Sigmoid) اتدرّبت بخوارزمية Backpropagation على 77,142 سجل تدريب حقيقي، وأثبتت أداءها على 16,531 سجل لم تراه أثناء التدريب. الأوزان المتعلّمة دي (مش قواعد if/else) هي اللي بتحسب احتمالية الخطورة وتفسّرها لحظيًا لكل حالة بتحللها. النموذج الأكبر (GRU + CNN + Fusion) مبني بنفس الفلسفة — تعلّم من بيانات حقيقية، مش قواعد مبرمجة يدويًا.",
    back_home:"العودة للرئيسية",

    // الإعدادات
    settings_h1:"الإعدادات", settings_sub:"خصّص تجربتك في SepsisWatch",
    settings_profile:"الملف الشخصي", settings_display_name:"الاسم الظاهر", settings_role:"الدور الوظيفي",
    settings_prefs:"تفضيلات الواجهة", settings_theme:"الوضع الداكن", settings_lang:"اللغة",
    settings_notifs:"إشعارات", settings_notif_high:"تنبيه فوري عند خطر مرتفع", settings_notif_mid:"تنبيه عند خطر متوسط", settings_notif_digest:"ملخص يومي بالبريد",
    settings_save:"حفظ التغييرات", settings_saved:"تم الحفظ",

    insights_title: "توصيات الذكاء الاصطناعي", insights_sub:"مبنية على اتجاه القراءات الحالية لهذا المريض",
    insights_disclaimer:"هذه اقتراحات تعليمية تجريبية تولّدها الواجهة بناءً على اتجاه القراءات المعروضة، ولا تُغني إطلاقًا عن تقييم طبي مباشر.",
    live_label:"بث مباشر (تجريبي)",

    side_admin:"المراقبة الإدارية",
    admin_h1:"المراقبة الإدارية والتشغيلية", admin_sub:"إحصائيات حيّة من سجل التنبؤات الفعلي على الـ API",
    admin_note:"الأرقام دي بتتقرأ مباشرة من نقطة /admin/stats على السيرفر الخلفي. لو السيرفر مش شغال دلوقتي، بتظهر بدلًا منها إحصائية حقيقية من الحالات اللي حللتها وحفظتها فعليًا (لو موجودة)، وإلا بيانات تجريبية عامة لغرض العرض فقط.",
    admin_total:"إجمالي التنبؤات المسجّلة", admin_avg:"متوسط درجة الخطورة", admin_critical:"عدد الحالات الحرجة (≥70%)", admin_uptime:"حالة الخادم",
    admin_hourly:"التنبؤات خلال آخر 24 ساعة", admin_stack:"تكامل المراقبة الإنتاجية (اختياري)",
    admin_grafana_status:"جاهز للربط عبر docker-compose", admin_grafana_hint:"راجعي DEPLOYMENT.md لتفعيل حاويتَي Prometheus وGrafana الجاهزتين في docker-compose.yml.",

    explain_title: "أسباب درجة الخطورة (Explainable AI)", explain_sub:"أكثر القراءات تأثيرًا في القرار، مرتبة حسب الوزن النسبي",
    cv_title: "البصمة البصرية (Computer Vision)", cv_sub:"صورتان محسوبتان فعليًا لحظة عرض الصفحة من قراءات النبض الفعلية لهذا المريض — نفس التمثيل اللي بيتغذى لفرع الـ CNN داخل النموذج",

    patients_h1:"قائمة المرضى الكاملة", patients_sub:"فلترة وترتيب كل الحالات اللي حللتها فعليًا بالنموذج المُدرَّب",
    filter_all:"الكل", filter_high:"مرتفع", filter_mid:"متوسط", filter_low:"منخفض", filter_all_units:"كل الوحدات",
    sort_by_risk:"ترتيب حسب الخطورة", empty_title:"مفيش نتائج مطابقة", empty_sub:"جرّبي تغيّري كلمة البحث أو الفلاتر",

    side_analyzer:"محلل الحالة",
    analyzer_h1:"محلل حالة المريض", analyzer_sub:"نموذج تعلّم عميق مُدرَّب فعليًا على بيانات إنتان حقيقية، يحسب درجة الخطورة لحظيًا حسب مدخلاتك",
    analyzer_disclaimer:"أداة توعية تعليمية شخصية، وليست بديلًا عن تقييم طبي مباشر. النتائج تتغيّر مع كل إدخال جديد لأنها ناتجة فعليًا من شبكة عصبية مُدرَّبة، وليست أرقامًا ثابتة.",
    analyzer_form_h:"بيانات المريض",
    f_name:"اسم المريض (اختياري)", f_name_ph:"مثال: مريض جديد",
    f_age:"العمر (سنة)", f_sex:"الجنس", f_male:"ذكر", f_female:"أنثى", f_episode:"عدد نوبات الإنتان السابقة",
    f_vitals_h:"علامات حيوية إضافية (اختياري، تُستخدم للتوصيات فقط)",
    f_hr:"معدل النبض", f_map:"متوسط الضغط", f_temp:"الحرارة", f_resp:"معدل التنفس",
    analyzer_run:"تحليل الحالة الآن", analyzer_result_h:"نتيجة التحليل",
    analyzer_save:"حفظ في قائمة مرضاي", analyzer_pdf:"تحميل تقرير PDF",
    treatment_h:"خطة رعاية مقترحة",

    empty_my_title:"لسه ما حللتيش أي حالة", empty_my_sub:"ابدئي بتحليل أول مريض عشان يظهر هنا",
    empty_my_cta:"تحليل مريض جديد", load_example_btn:"تحميل مرضى تجريبيين للعرض", clear_my_btn:"مسح كل مرضاي",
    delete_patient:"حذف", vitals_recorded_h:"القراءات المسجّلة", kpi_avg:"متوسط درجة الخطورة", kpi_model:"دقة النموذج المُدرَّب (AUROC)",

    nav_model_card:"بطاقة النموذج",
    mc_eyebrow:"بطاقة النموذج (Model Card)", mc_h1:"حالة النموذج بصراحة تامة",
    mc_intro:"توثيق بأسلوب Model Cards for Model Reporting (Mitchell et al., 2019) — بيوضّح إيه اللي اتعمل فعلًا، وإيه اللي لسه مطلوب، من غير أي مبالغة.",
    mc_status_h:"حالة التدريب الحالية",
    mc_status_p:"نموذج التنبؤ بالبقاء (Survival MLP) مُدرَّب فعليًا الآن على 110,204 حالة حقيقية (AUROC = 0.70 على مجموعة اختبار معزولة، و0.57 على تحقق خارجي من كوريا الجنوبية). أما نموذج الإنذار المبكر بالإنتان (GRU+CNN) فمعماريته كاملة لكنه لسه محتاج بيانات PhysioNet الحقيقية عشان يتدرب.",
    mc_arch_h:"المعمارية",
    mc_use_h:"الاستخدام المقصود وحدوده",
    mc_intended_h:"الاستخدام المقصود", mc_intended_p:"أداة تعليمية/بحثية لدعم القرار السريري، تُعرض كنموذج مرجعي معماري كامل — مش أداة تشخيص مستقلة.",
    mc_out_h:"خارج نطاق الاستخدام", mc_out_p:"أي قرار سريري فعلي، أو استبدال تقييم الطاقم الطبي، أو استخدام بدون اعتماد تنظيمي ومراجعة أخلاقية.",
    mc_ethics_h:"اعتبارات أخلاقية",
    mc_cta_p:"لمعرفة خطة التحقق السريري الكاملة والمنهجية المقترحة:", mc_cta_btn:"راجعي صفحة عن المشروع",
  },
  en: {
    nav_how:"How it works", nav_features:"Features", nav_dataset:"Dataset", nav_about:"About",
    nav_login:"Log in", nav_cta:"Try the dashboard",

    hero_eyebrow:"● Clinical decision-support system — educational/research",
    hero_title:"Spot <span class=\"accent\">sepsis</span>hours before it shows, not after it's too late",
    hero_lead:"SepsisWatch analyzes your vital signs with a real neural network, shows you the risk level and why in plain language, with a personal care plan that changes based on your own condition — all in one place, just for you.",
    hero_cta1:"Launch the demo dashboard", hero_cta2:"See how it works",
    hero_stat1_label:"real patients in the training set",
    hero_stat2_num:"6 hours", hero_stat2_label:"average early-warning horizon",
    hero_stat3_num:"34 variables", hero_stat3_label:"vital & lab signals per patient",
    wf_label:"HR · MAP · RESP — demo stream",

    how_eyebrow:"How it works", how_title:"From a vital sign to a clinical decision",
    how_desc:"A 4-stage pipeline turns your raw readings into a clear risk assessment with a personal care plan — without exposing the model's internal details here (full details available to developers in the code repository).",
    pipe1_h:"Collect readings hour by hour", pipe1_p:"Heart rate, blood pressure, respiration, temperature and lab results are gathered automatically from monitors and the electronic health record.",
    pipe2_h:"Analyze the temporal pattern", pipe2_p:"The system compares the last 12 hours' trend against thousands of similar cases from its training history, checking whether the current trajectory resembles early sepsis deterioration.",
    pipe3_h:"Compute a risk score", pipe3_p:"A probability score from 0 to 100% is produced, split into three tiers — low, moderate, high — with the most influential hours highlighted.",
    pipe4_h:"Alert the care team", pipe4_p:"An instant dashboard alert shows the patient, bed, and risk level, with options to acknowledge or escalate to the covering physician.",

    feat_eyebrow:"Dashboard features", feat_title:"Built around the real shift workflow",
    feat_desc:"Not just numbers — the dashboard adapts to each user's role, preferences, and shift.",
    feat1_h:"A personal dashboard that learns from you", feat1_p:"Every case you analyze is saved to your personal dashboard — the ideas and recommendations are all built from cases you've actually analyzed, not generic data.",
    feat2_h:"Smart alert center", feat2_p:"Alerts ranked by severity, with options to acknowledge, escalate, or temporarily mute a specific patient's alerts.",
    feat3_h:"Customizable widgets", feat3_p:"Every user can show or hide the widgets they need (trends, handover notes, bed map...) and it's remembered automatically.",
    feat4_h:"Easy-on-the-eyes night mode", feat4_p:"A comfortable dark mode for nighttime use, activated and remembered automatically on every visit.",
    feat5_h:"Arabic / English", feat5_p:"Instant interface language switch between Arabic and English for multinational teams.",
    feat6_h:"Per-patient timeline", feat6_p:"A full timeline of risk score and vital sign evolution, with the key clinical notes recorded.",

    dataset_eyebrow:"Data source", dataset_title:"Built on real data — with full honesty",
    dataset_desc:"The model currently running in the Case Analyzer is actually trained on the real Sepsis Survival Minimal Clinical Records dataset (Chicco & Jurman, 2020). The Computer Vision component (GRU+CNN+Fusion) is fully built in code on an architecture designed for PhysioNet Challenge 2019 time-series data, and is ready to train on it once available.",
    dataset_cta:"Methodology details", dataset_cta2:"Fully honest model card",
    dstat1:"real records actually used in training", dstat2:"real AUROC on a separate test set", dstat3:"PhysioNet patients for the CV component (roadmap)", dstat4:"transparency — zero fabricated numbers",

    footer_line1:"SepsisWatch © 2026 — an educational/research project, not an approved medical diagnostic device.",
    footer_line2:"Built on the PhysioNet Challenge 2019 dataset",

    login_title:"Welcome", login_sub:"Type your name and go straight to your personal case analyzer.",
    login_name_label:"Name", login_name_ph:"Type your full name",
    login_submit:"Get started",
    login_visual_h:"Every second matters<br>in catching sepsis early",
    login_visual_p:"Type your name and start right away — the site remembers your preferences and the cases you've analyzed every time you sign in.",
    login_disclaimer:"Educational/research project — all data shown here is fully simulated.",

    side_overview: "Overview", side_bedmap: "Bed map", side_alerts: "Alerts",
    side_patients: "Patient list", side_recent: "Recently viewed", side_settings: "Settings",
    side_about:"ℹ About", side_logout: "Log out",
    search_ph:"Search a patient, bed, or unit...",
    greeting_prefix:"Welcome,", role_line_prefix:"Your personal dashboard for analyzing cases and generating care plans", role_line_suffix:"",
    kpi1:"Patients analyzed", kpi2:"High-risk cases",
    panel_patients:"Patients under monitoring", view_all:"View all",
    panel_alerts: "Latest alerts", panel_shift: "Current shift",
    shift_user:"Shift lead", shift_start:"Shift start", shift_end:"Shift end", shift_beds:"Assigned beds",
    panel_widgets: "Customize widgets", w_alerts:"Alert center", w_trends:"Reading trends", w_shift:"Shift info", w_notes:"Handover notes",
    panel_notes: "Shift handover notes",
    notes_body:"No new notes from the previous shift. Last update: 3 hours ago — patient P-1103 stabilized after adjusting IV fluid dosage.",
    panel_bedmap: "Live bed map",
    no_alerts:"No active alerts right now ",

    export_pdf:"Export PDF report", escalate:"Escalate to covering physician",
    vitals_trend:"Vital sign trend — last 24 hours",
    legend_hr:"Heart rate (HR)", legend_map:"Mean arterial pressure (MAP)", legend_resp:"Respiration rate (Resp)",
    gauge_title:"Sepsis risk score", gauge_calc:"Calculating...",
    top_hours:"Most influential hours", last_update:"Last update",
    timeline_title:"Case timeline", notes_title:"Clinical notes",
    note_placeholder:"Add a new note...", save_note:"Save note",

    about_eyebrow:"About the project", about_h1:"SepsisWatch — an educational & research project",
    about_intro:"This project was built as a complete, applied example of AI in healthcare, combining medical time-series analysis with computer vision techniques, and built entirely on real, open ICU data.",
    about_data_h:"Data source",
    about_data_p:"We rely on the PhysioNet / Computing in Cardiology Challenge 2019 dataset (\"Early Prediction of Sepsis from Clinical Data\"), one of the best-known peer-reviewed open datasets for early sepsis prediction, covering over 40,000 real patients from two U.S. hospitals.",
    about_method_h:"Methodology (overview)",
    about_method_p:"The system combines two complementary branches: a temporal analysis of the patient's overall trajectory over time, and a visual analysis that turns vital readings into an \"image\" representation revealing unstable patterns. The two outputs are fused into a single, more accurate decision. Full technical details are open in the project's GitHub repository.",
    about_limits_h:"Limitations & disclaimer",
    about_limits_p:"This project is entirely educational/research in nature — it is not an approved medical device and does not replace clinical judgment by a qualified care team. Any real-world deployment requires regulatory approval and full ethical and legal review.",
    about_code_h:"Source code",
    about_code_p:"All processing and model code lives in the repository's src/ folder, entirely separate from this website's code.",

    who_title:"Built entirely around you",
    who_doc_h:"A real AI model that learns",
    who_doc_1:"A neural network actually trained on real data, not fixed rules",
    who_doc_2:"A suggested care plan that changes with every entered vital sign, not static text",
    who_doc_3:"Explainable AI shows which factors actually shaped your assessment",
    who_doc_4:"A Computer Vision component turns your readings into images and analyzes them with a real CNN",
    who_pat_h:"A fully personal experience, just for you",
    who_pat_1:"A \"Case Analyzer\" tool with simple inputs, no complex medical jargon",
    who_pat_2:"Every case you analyze is saved to your personal dashboard, not shared generic data",
    who_pat_3:"A care plan built from the readings you actually entered",
    who_pat_4:"Full transparency — the model card openly states the tool's limits",
    cv_gallery_caption:"Sepsis Survival Minimal Clinical Records — a real published dataset (Chicco & Jurman, 2020, DOI: 10.1038/s41598-020-73558-3) with over 110,000 real records, actually used to train the prediction model.",
    shap_gallery_caption:"A real, non-inflated result from actual evaluation on a separate test set (16,531 records) — full numbers in reports/survival_model_report.json.",
    curves_gallery_caption:"This image was actually generated using the project's real src/timeseries_to_image.py code (Gramian Angular Field + Recurrence Plot) on an illustrative example series (not a real patient, since the current dataset is tabular, not time-series). The core GRU/CNN/Fusion model exists as complete code and is ready to run on real PhysioNet time-series data once available.",
    ai_learning_h:"How does the model actually \"learn\"?",
    ai_learning_p:"The model currently running in the Case Analyzer (survival_mlp) is a real neural network (Linear → BatchNorm → ReLU ×3 → Linear → Sigmoid) trained with backpropagation on 77,142 real training records, and validated on 16,531 records it never saw during training. These learned weights (not if/else rules) compute the risk probability and explain it live for every case you analyze. The larger model (GRU + CNN + Fusion) is built on the same philosophy — learning from real data, not hand-coded rules.",
    back_home:"Back to home",

    settings_h1:"Settings", settings_sub:"Personalize your SepsisWatch experience",
    settings_profile:"Profile", settings_display_name:"Display name", settings_role:"Role",
    settings_prefs:"Interface preferences", settings_theme:"Dark mode", settings_lang:"Language",
    settings_notifs:"Notifications", settings_notif_high:"Instant alert on high risk", settings_notif_mid:"Alert on moderate risk", settings_notif_digest:"Daily email digest",
    settings_save:"Save changes", settings_saved:"Saved",

    insights_title: "AI recommendations", insights_sub:"Based on this patient's current reading trends",
    insights_disclaimer:"These are experimental educational suggestions generated by the interface from the displayed reading trends, and do not replace direct medical assessment.",
    live_label:"Live stream (demo)",

    side_admin:"Admin monitoring",
    admin_h1:"Admin & operational monitoring", admin_sub:"Live statistics from the actual prediction log on the API",
    admin_note:"These numbers are read directly from the /admin/stats endpoint on the backend server. If the server isn't running right now, real statistics from cases you've actually analyzed and saved are shown instead (if any exist), otherwise generic demo data for display purposes only.",
    admin_total:"Total logged predictions", admin_avg:"Average risk score", admin_critical:"Critical cases (≥70%)", admin_uptime:"Server status",
    admin_hourly:"Predictions over the last 24 hours", admin_stack:"Production monitoring stack (optional)",
    admin_grafana_status:"Ready to wire up via docker-compose", admin_grafana_hint:"See DEPLOYMENT.md to enable the ready-made Prometheus and Grafana containers in docker-compose.yml.",

    explain_title: "Why this risk score (Explainable AI)", explain_sub:"Most influential readings in the decision, ranked by relative weight",
    cv_title: "Visual fingerprint (Computer Vision)", cv_sub:"Two images computed live right now from this patient's actual pulse readings — the same representation fed into the model's CNN branch",

    patients_h1:"Full patient list", patients_sub:"Filter and sort every case you've actually analyzed with the trained model",
    filter_all:"All", filter_high:"High", filter_mid:"Moderate", filter_low:"Low", filter_all_units:"All units",
    sort_by_risk:"Sort by risk", empty_title:"No matching results", empty_sub:"Try changing your search term or filters",

    side_analyzer:"Analyzer",
    analyzer_h1:"Patient Risk Analyzer", analyzer_sub:"A deep learning model actually trained on real sepsis data, computing risk live from your input",
    analyzer_disclaimer:"A personal educational awareness tool, not a substitute for direct medical assessment. Results change with every new input because they come from a genuinely trained neural network, not fixed numbers.",
    analyzer_form_h:"Patient details",
    f_name:"Patient name (optional)", f_name_ph:"e.g. New patient",
    f_age:"Age (years)", f_sex:"Sex", f_male:"Male", f_female:"Female", f_episode:"Prior sepsis episodes",
    f_vitals_h:"Additional vitals (optional, used for recommendations only)",
    f_hr:"Heart rate", f_map:"Mean pressure", f_temp:"Temperature", f_resp:"Respiration rate",
    analyzer_run:"Analyze now", analyzer_result_h:"Analysis result",
    analyzer_save:"Save to my patients", analyzer_pdf:"Download PDF report",
    treatment_h:"Suggested care plan",

    empty_my_title:"No cases analyzed yet", empty_my_sub:"Analyze your first patient to see it here",
    empty_my_cta:"Analyze new patient", load_example_btn:"Load example patients", clear_my_btn:"Clear all my patients",
    delete_patient:"Delete", vitals_recorded_h:"Recorded readings", kpi_avg:"Average risk score", kpi_model:"Trained model accuracy (AUROC)",

    nav_model_card:"Model card",
    mc_eyebrow:"Model Card", mc_h1:"An honest account of the model's status",
    mc_intro:"Documented in the style of 'Model Cards for Model Reporting' (Mitchell et al., 2019) — stating plainly what has actually been done, and what remains, without overstatement.",
    mc_status_h:"Current training status",
    mc_status_p:"The Survival MLP model is now genuinely trained on 110,204 real cases (AUROC = 0.70 on a held-out test set, 0.57 on external South Korean validation). The early-warning GRU+CNN model has a complete architecture but still needs real PhysioNet vitals data to be trained.",
    mc_arch_h:"Architecture",
    mc_use_h:"Intended use and limitations",
    mc_intended_h:"Intended use", mc_intended_p:"An educational/research clinical decision-support reference architecture — not a standalone diagnostic tool.",
    mc_out_h:"Out of scope", mc_out_p:"Any real clinical decision, replacing care-team judgment, or use without regulatory approval and ethical review.",
    mc_ethics_h:"Ethical considerations",
    mc_cta_p:"For the full clinical validation plan and proposed methodology:", mc_cta_btn:"See the About page",
  }
};

function applyI18n(lang){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('lang-en', lang === 'en');
  const dict = I18N[lang] || I18N.ar;

  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if(dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{
    const key = el.getAttribute('data-i18n-html');
    if(dict[key] !== undefined) el.innerHTML = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const key = el.getAttribute('data-i18n-placeholder');
    if(dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
  });
  document.querySelectorAll('.lang-toggle span').forEach(s=>{
    s.classList.toggle('active', s.dataset.lang === lang);
  });
}

function t(key, lang){
  lang = lang || (typeof Store !== 'undefined' ? Store.lang : 'ar');
  return (I18N[lang] && I18N[lang][key]) || key;
}

document.addEventListener('DOMContentLoaded', ()=>{
  const lang = (typeof Store !== 'undefined' && Store.lang) ? Store.lang : 'ar';
  applyI18n(lang);
});
