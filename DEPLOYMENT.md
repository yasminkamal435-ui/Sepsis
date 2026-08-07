# 🚀 دليل النشر (Deployment Guide)

> ملاحظة صريحة: أنا (المساعد) معنديش وصول لحسابات AWS/Azure/Render/Railway أو أي VPS،
> ومعنديش وصول لدومينات النشر دي من بيئة التنفيذ الحالية أصلًا، فمقدرش أنشر المشروع
> Online بنفسي ولا أديكِ رابط "Live Demo" شغال فعليًا. اللي عملته بدل كده: كل ملفات
> وإعدادات النشر جاهزة 100% ومُختبرة الصياغة، وكل اللي محتاجاه هو تشغيل الأوامر دي
> على حسابك الشخصي (بتاخد دقايق).

## الخيار الأسرع: Render (مجاني للمشاريع الصغيرة)

1. ادفعي المشروع لريبو GitHub (فيه بالفعل `render.yaml`).
2. من [render.com](https://render.com) → **New → Blueprint** → اختاري الريبو.
3. Render هيقرأ `render.yaml` تلقائيًا وينشئ خدمتين: `sepsiswatch-api` و`sepsiswatch-web`.
4. بعد النشر، حدّثي `webapp/config.js` بعنوان الـ API الجديد (مثال: `https://sepsiswatch-api.onrender.com`) وأعيدي رفع الموقع.

## Railway

```bash
npm i -g @railway/cli
railway login
railway init
railway up          # يستخدم railway.toml و Dockerfile.api تلقائيًا
```
كرري نفس الخطوات لخدمة تانية بـ `Dockerfile.web` لنشر الموقع.

## Docker محليًا أو على أي VPS (DigitalOcean, Linode, EC2...)

```bash
docker compose up -d --build
# API:  http://<server-ip>:8000
# Web:  http://<server-ip>:8080
```
لتفعيل المراقبة الإنتاجية (Prometheus + Grafana):
```bash
docker compose --profile monitoring up -d
# Prometheus: http://<server-ip>:9090
# Grafana:    http://<server-ip>:3000  (admin / sepsiswatch)
```

## AWS (نظرة عامة)
- **API**: انشري صورة `Dockerfile.api` على **ECS Fargate** أو **App Runner** (الأبسط للمبتدئين).
- **Web**: ارفعي محتوى `webapp/` على **S3 + CloudFront** (استضافة ستاتيك رخيصة وسريعة)، أو استخدمي نفس صورة `Dockerfile.web`.
- **قاعدة بيانات المراقبة**: لو حبيتي تستبدلي SQLite بحل مُدار، استخدمي **RDS (PostgreSQL)**.

## Azure (نظرة عامة)
- **API**: **Azure Container Apps** أو **App Service for Containers** مع `Dockerfile.api`.
- **Web**: **Azure Static Web Apps** لملفات `webapp/` مباشرة بدون Docker حتى.

## بعد أي نشر: خطوة لازمة
مهما اخترتي، لازم تحدّثي هذا السطر في `webapp/config.js` بعنوان الـ API الحقيقي بعد النشر:
```js
window.API_BASE_URL = "https://<your-api-domain>";
```
وإلا الموقع هيفضل شغال بالبيانات التجريبية المحلية (Demo fallback) بس.
