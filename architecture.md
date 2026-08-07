# المعمارية التقنية — SepsisWatch

```
                    ┌────────────────────────────┐
                    │   PhysioNet Challenge 2019 │
                    │   ~40,000 مريض حقيقي (.psv) │
                    └──────────────┬─────────────┘
                                   │
                          preprocessing.py
                    (Imputation، تطبيع، نوافذ زمنية 12 ساعة)
                                   │
                    ┌──────────────┴─────────────┐
                    │                             │
             السلسلة الزمنية الخام      timeseries_to_image.py
             (T=12, F=34)               (GAF + Recurrence Plot)
                    │                             │
             model_lstm.py                 model_cnn.py
          BiGRU + Attention                CNN (ResNet-style)
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                          model_fusion.py
                    (دمج embeddings الفرعين → قرار نهائي)
                                   │
                            train.py / evaluate.py
                                   │
                          models/sepsis_fusion_best.pt
                                   │
                            serve_api.py (FastAPI)
                          POST /predict  |  GET /demo/*
                                   │
                    ═══════════════╪═══════════════  (HTTP فقط، لا كود AI)
                                   │
                              webapp/js/app.js
                          (fetch فقط، صفر منطق ذكاء اصطناعي)
                                   │
                    index / login / dashboard / patient .html
```

## قرارات التصميم الرئيسية

1. **الفصل الصارم بين AI والـ Frontend**: أي شخص يفتح "عرض المصدر" على الموقع
   مش هيلاقي غير HTML/CSS/JS عادي بيعمل `fetch()` لسيرفر خارجي. الموديل،
   الأوزان، وكل منطق المعالجة موجودين فقط في `src/` و`models/` على السيرفر.

2. **لماذا Fusion (GRU + CNN) مش نموذج واحد؟**
   - BiGRU+Attention ممتاز لالتقاط *الاتجاه الزمني التراكمي* (Trend).
   - CNN على GAF/Recurrence Plot ممتاز لالتقاط *الأنماط البصرية المحلية*
     مثل التذبذب المفاجئ أو عدم الاستقرار (Instability) اللي بيسبق الإنتان.
   - الدمج بين الاثنين أثبت في أبحاث متعددة (Time Series Classification)
     تحسّن دقة عن أي فرع لوحده.

3. **التعامل مع عدم توازن الفئات**: نسبة ساعات الإنتان الفعلية ~1.8% فقط،
   فاستخدمنا `WeightedRandomSampler` + `Focal Loss` بدل الـ Cross-Entropy
   العادي عشان الموديل ميميلش لتوقع "سليم" دايمًا.

4. **مقياس التقييم**: بالإضافة لـ AUROC/AUPRC القياسيين، الداتاسيت الأصلي
   بيستخدم "Utility Score" مخصص بيكافئ التنبؤ المبكر (قبل التشخيص الفعلي
   بساعات) ويعاقب التنبؤ المتأخر أو الكاذب — نفس الفلسفة متبعة هنا في
   اختيار `PREDICTION_HORIZON = 6` ساعات في `preprocessing.py`.
