/* =========================================================================
   app.js — منطق الواجهة فقط.
   هذا الملف لا يحتوي أي نموذج، أوزان، أو منطق تنبؤ فعلي. كل ما يفعله:
   1) إدارة جلسة مستخدم تجريبية (localStorage) لتخصيص الداشبورد لكل يوزر.
   2) طلب بيانات جاهزة من الـ API الخلفي (FastAPI) عبر fetch.
   3) رسم القيم في الواجهة (بطاقات، sparklines، جداول، أيقونات).
   4) توليد "توصيات ذكاء اصطناعي" تجريبية — دي مجرد قواعد بسيطة في المتصفح
      تتغيّر حسب اتجاه القراءات المعروضة (مش نموذج تعلّم عميق حقيقي)، والغرض
      منها توضيح شكل الناتج النهائي لأي نظام دعم قرار سريري حقيقي.
   لو السيرفر الخلفي مش شغال، بيرجع لبيانات تجريبية محلية (Demo fallback)
   عشان الموقع يفضل قابل للعرض حتى بدون تشغيل الموديل.
   ========================================================================= */

const Store = {
  get user(){ return localStorage.getItem('sw_user') || null; },
  set user(v){ localStorage.setItem('sw_user', v); },
  get role(){ return localStorage.getItem('sw_role') || 'patient'; },
  set role(v){ localStorage.setItem('sw_role', v); },
  get theme(){ return localStorage.getItem('sw_theme') || 'light'; },
  set theme(v){ localStorage.setItem('sw_theme', v); },
  get lang(){ return localStorage.getItem('sw_lang') || 'ar'; },
  set lang(v){ localStorage.setItem('sw_lang', v); },
  get widgets(){
    try{ return JSON.parse(localStorage.getItem('sw_widgets')) || defaultWidgets(); }
    catch(e){ return defaultWidgets(); }
  },
  set widgets(v){ localStorage.setItem('sw_widgets', JSON.stringify(v)); },
  logout(){ localStorage.removeItem('sw_user'); }
};

function defaultWidgets(){
  return { alerts:true, trends:true, shift:true, notes:false, insights:true };
}

function requireAuth(){
  if(!Store.user){ window.location.href = 'login.html'; }
}

function initials(name){
  return name.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
}

function applyTheme(){
  document.body.classList.toggle('dark', Store.theme === 'dark');
}

/* ---------------------------- مولّد أرقام عشوائي ثابت لكل مريض ----------------------------
   عشان بيانات نفس المريض تفضل متسقة بين الداشبورد وصفحة تفاصيله، من غير ما نحتاج سيرفر
   حالة (state) — بنولّد رقم عشوائي "شبه ثابت" مبني على نص الـ ID بتاعه. */
function seedFromString(str){
  let h = 1779033703 ^ str.length;
  for(let i=0;i<str.length;i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/* ---------------------------- طبقة الاتصال بالـ API ---------------------------- */
const DEMO_FALLBACK_PATIENTS = [
  {id:'P-1042', name:'مريض ذكر، 67 سنة', unit:'ICU-2', bed:'B-14', sepsis_probability:0.81, risk_level:'خطر مرتفع (High)'},
  {id:'P-1077', name:'مريضة أنثى، 54 سنة', unit:'ICU-1', bed:'A-03', sepsis_probability:0.63, risk_level:'خطر متوسط (Moderate)'},
  {id:'P-1103', name:'مريض ذكر، 39 سنة', unit:'ICU-3', bed:'C-08', sepsis_probability:0.12, risk_level:'خطر منخفض (Low)'},
  {id:'P-1129', name:'مريضة أنثى، 72 سنة', unit:'ICU-1', bed:'A-11', sepsis_probability:0.47, risk_level:'خطر متوسط (Moderate)'},
  {id:'P-1156', name:'مريض ذكر، 61 سنة', unit:'ICU-2', bed:'B-05', sepsis_probability:0.05, risk_level:'خطر منخفض (Low)'},
];

async function fetchPatients(user){
  try{
    const res = await fetch(`${window.API_BASE_URL}/demo/patients?user=${encodeURIComponent(user||'guest')}`, {signal: AbortSignal.timeout(2500)});
    if(!res.ok) throw new Error('bad response');
    const data = await res.json();
    return data.patients;
  }catch(e){
    return DEMO_FALLBACK_PATIENTS;
  }
}

async function fetchVitals(patientId){
  try{
    const res = await fetch(`${window.API_BASE_URL}/demo/vitals/${encodeURIComponent(patientId)}`, {signal: AbortSignal.timeout(2500)});
    if(!res.ok) throw new Error('bad response');
    const data = await res.json();
    return data.series;
  }catch(e){
    // بيانات تجريبية محلية بديلة لو السيرفر مقفول — ثابتة لكل مريض حسب الـ ID
    const rand = seedFromString(patientId);
    const drift = 0.4 + rand()*1.2; // شدة الاتجاه تختلف من مريض للتاني
    const series = [];
    for(let h=0; h<24; h++){
      series.push({
        time:`${String(h).padStart(2,'0')}:00`,
        HR: 78 + h*0.5*drift + (rand()*4-2),
        MAP: 80 - h*0.35*drift + (rand()*3-1.5),
        Temp: 36.8 + h*0.028*drift + (rand()*0.2-0.1),
        Resp: 15 + h*0.22*drift + (rand()*1.5-0.75),
      });
    }
    return series;
  }
}

/* ---------------------------- أدوات رسم ---------------------------- */
function riskClass(p){
  if(p >= 0.7) return 'high';
  if(p >= 0.35) return 'mid';
  return 'low';
}
function riskBadge(p){
  const cls = riskClass(p);
  const label = (typeof I18N !== 'undefined' && Store.lang === 'en')
    ? (cls==='high'?'High risk':cls==='mid'?'Moderate risk':'Low risk')
    : (cls === 'high' ? 'خطر مرتفع' : cls === 'mid' ? 'خطر متوسط' : 'خطر منخفض');
  return `<span class="badge badge-${cls}">${label}</span>`;
}

function sparklineSVG(values, w=90, h=32, color){
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max - min) || 1;
  const step = w / (values.length - 1);
  const points = values.map((v,i)=>`${(i*step).toFixed(1)},${(h - ((v-min)/range)*h).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function lineChartSVG(series, keys, colors, w=560, h=220){
  const pad = 30;
  const allVals = keys.flatMap(k=>series.map(d=>d[k]));
  const min = Math.min(...allVals), max = Math.max(...allVals);
  const range = (max-min)||1;
  const stepX = (w - pad*2) / (series.length - 1);

  let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">`;
  for(let i=0;i<=3;i++){
    const y = pad + (h - pad*2) * (i/3);
    svg += `<line x1="${pad}" x2="${w-pad}" y1="${y}" y2="${y}" stroke="var(--line, #DCE1E8)" stroke-width="1"/>`;
  }
  keys.forEach((k, ki)=>{
    const pts = series.map((d,i)=>{
      const x = pad + i*stepX;
      const y = pad + (h - pad*2) * (1 - (d[k]-min)/range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${colors[ki]}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  svg += `</svg>`;
  return svg;
}

/* ---------------------------- عدّاد متحرك للأرقام (KPIs) ---------------------------- */
function countUp(el, target, opts={}){
  const decimals = opts.decimals || 0;
  const suffix = opts.suffix || '';
  const duration = opts.duration || 900;
  const start = performance.now();
  function frame(now){
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    el.textContent = value.toFixed(decimals) + suffix;
    if(progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------------------------- أيقونات SVG بسيطة (بديل الإيموجي) ---------------------------- */
const Icon = {
  overview:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  bed:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18"/><path d="M3 12V7"/><path d="M7 10V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/></svg>`,
  bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>`,
  list:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.3"/><circle cx="4.5" cy="12" r="1.3"/><circle cx="4.5" cy="18" r="1.3"/></svg>`,
  star:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2-4.8-4.3 6.4-.6L12 3z"/></svg>`,
  gear:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1h-.2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/></svg>`,
  info:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>`,
  logout:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  spark:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>`,
  heart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  puzzle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h4v2.2a1.8 1.8 0 0 0 3 1.3 1.8 1.8 0 0 1 3 1.3V13h-2.2a1.8 1.8 0 0 0 0 3.6H21v3.4a1 1 0 0 1-1 1h-3.4a1.8 1.8 0 0 0-3.6 0H9v-4.2a1.8 1.8 0 0 0-1.3-3 1.8 1.8 0 0 1-1.3-3H4V9a1 1 0 0 1 1-1h4z"/></svg>`,
  moon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  globe:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>`,
  clipboard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6"/></svg>`,
  ai:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/><circle cx="12" cy="12" r="4"/></svg>`,
  print:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/></svg>`,
  escalate:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  pill:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 14)"/><line x1="12" y1="8" x2="16" y2="12"/></svg>`,
  shield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>`,
  activity:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6"/></svg>`,
  droplet:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 5 7 8.5 7 12a7 7 0 0 1-14 0c0-3.5 3-7 7-12z"/></svg>`,
  user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>`,
  trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>`,
};

/* ---------------------------- محرك التوصيات التجريبي (Rule-based, ليس تعلّم عميق) ---------------------------- */
function trendDelta(series, key){
  const first = series.slice(0,4).reduce((s,d)=>s+d[key],0)/4;
  const last = series.slice(-4).reduce((s,d)=>s+d[key],0)/4;
  return last - first;
}

function generateInsights(patient, series, lang){
  const isEn = lang === 'en';
  const dHR = trendDelta(series,'HR');
  const dMAP = trendDelta(series,'MAP');
  const dTemp = trendDelta(series,'Temp');
  const dResp = trendDelta(series,'Resp');
  const prob = patient.sepsis_probability;
  const insights = [];

  if(dMAP < -4 && dHR > 4){
    insights.push({level:'high', icon:Icon.heart,
      title: isEn?'Combined shock pattern':'نمط مركّب يشبه الصدمة',
      text: isEn?'Rising heart rate together with a falling MAP over the last hours matches an early septic-shock pattern. Recommend prioritizing a bedside reassessment and discussing escalation with the covering physician.'
                 :'ارتفاع معدل النبض مع هبوط متزامن في متوسط الضغط الشرياني خلال الساعات الأخيرة يتوافق مع نمط مبكر للصدمة الإنتانية. يُنصح بإعطاء أولوية لإعادة تقييم المريض عند السرير ومناقشة التصعيد مع الطبيب المناوب.'});
  }
  if(dTemp > 0.5){
    insights.push({level: prob>=0.35?'high':'mid', icon:Icon.spark,
      title: isEn?'Upward temperature trend':'اتجاه تصاعدي في الحرارة',
      text: isEn?'Temperature has been trending upward. Consider re-checking infection markers and confirming whether blood cultures have already been drawn per protocol.'
                 :'درجة الحرارة في اتجاه تصاعدي مستمر. يُفضّل إعادة فحص مؤشرات العدوى والتأكد من سحب مزارع الدم إذا لم تُؤخذ بعد وفق البروتوكول المتبع.'});
  }
  if(dResp > 2.5){
    insights.push({level: prob>=0.35?'high':'mid', icon:Icon.ai,
      title: isEn?'Increasing respiratory rate':'ارتفاع تدريجي في معدل التنفس',
      text: isEn?'A gradual rise in respiratory rate can be an early sign of respiratory distress. Recommend monitoring oxygen saturation closely over the next hours.'
                 :'الزيادة التدريجية في معدل التنفس قد تكون علامة مبكرة على ضائقة تنفسية. يُنصح بمتابعة تشبع الأكسجين عن قرب خلال الساعات القادمة.'});
  }
  if(dMAP < -3 && dTemp <= 0.5 && dHR <= 4){
    insights.push({level:'mid', icon:Icon.clipboard,
      title: isEn?'Mild drop in arterial pressure':'انخفاض طفيف في الضغط الشرياني',
      text: isEn?'MAP shows a mild downward drift. Consider reviewing fluid balance and current intravenous fluid orders per the unit\'s protocol.'
                 :'متوسط الضغط الشرياني في انحدار طفيف. يُنصح بمراجعة موازنة السوائل والأوامر الحالية للسوائل الوريدية وفق بروتوكول القسم.'});
  }
  if(prob >= 0.7){
    insights.push({level:'high', icon:Icon.bell,
      title: isEn?'High overall risk score':'درجة خطورة إجمالية مرتفعة',
      text: isEn?'The overall score is in the high-risk band. Recommend following the unit\'s hour-1 sepsis bundle (reassessment, cultures, and antibiotics per protocol) and notifying the physician now.'
                 :'الدرجة الإجمالية ضمن نطاق الخطر المرتفع. يُنصح بمتابعة حزمة الساعة الأولى للإنتان المعتمدة في القسم (إعادة تقييم، مزارع، ومضادات حيوية وفق البروتوكول) وإبلاغ الطبيب فورًا.'});
  } else if(prob >= 0.35){
    insights.push({level:'mid', icon:Icon.info,
      title: isEn?'Worth a closer look':'يستحق متابعة أقرب',
      text: isEn?'Risk is moderate. Consider shortening the vitals-check interval and re-evaluating within the next 1-2 hours.'
                 :'مستوى الخطورة متوسط. يُقترح تقصير الفاصل الزمني بين قياسات العلامات الحيوية وإعادة التقييم خلال الساعة أو الساعتين القادمتين.'});
  }
  if(insights.length === 0){
    insights.push({level:'low', icon:Icon.heart,
      title: isEn?'Currently stable':'الحالة مستقرة حاليًا',
      text: isEn?'No concerning trend detected in the monitored signals. Continue routine hourly monitoring.'
                 :'لا يوجد اتجاه مقلق في القراءات المراقبة حاليًا. يُنصح بالاستمرار في المراقبة الروتينية كل ساعة.'});
  }
  if(insights.length > 3) insights.length = 3;

  // توصية ثابتة لراحة المريض ودعم الأسرة — بغض النظر عن درجة الخطورة، لأن تحسين
  // تجربة المريض جزء من الرعاية مش بس رصد الخطر
  const comfortTips = isEn ? [
    'Consider elevating the head of the bed ~30° and reassessing pain/comfort level with the patient.',
    'Reassure the patient and, if appropriate, update the family on the current care plan.',
    'Check skin integrity and repositioning schedule to prevent pressure injuries during extended monitoring.',
  ] : [
    'يُنصح برفع رأس السرير حوالي 30 درجة وإعادة تقييم مستوى الراحة والألم مع المريض.',
    'طمأنة المريض، وتحديث الأسرة عند المناسب بخطة الرعاية الحالية.',
    'مراجعة سلامة الجلد وجدول تغيير الوضعية لتقليل خطر قرح الفراش أثناء فترة المراقبة الممتدة.',
  ];
  const rand = seedFromString(patient.id + '_comfort');
  insights.push({level:'low', icon:Icon.heart,
    title: isEn?'Patient comfort & family':'راحة المريض والتواصل مع الأسرة',
    text: comfortTips[Math.floor(rand()*comfortTips.length)]});

  return insights;
}

function insightsPanelHTML(insights, lang){
  const dot = {high:'#111827', mid:'#2563EB', low:'#64748B'};
  return insights.map(ins=>`
    <div class="insight-card insight-${ins.level}">
      <div class="insight-icon">${ins.icon}</div>
      <div>
        <b>${ins.title}</b>
        <p>${ins.text}</p>
      </div>
    </div>
  `).join('');
}

/* ---------------------------- تفسير القرار (Explainable AI) — نسخة العرض في المتصفح ----------------------------
   نفس فكرة src/explain.py::explain_with_deltas بالظبط، منقولة لـ JS عشان تشتغل
   حتى لو السيرفر الخلفي مقفول. لو الـ API شغال، الأفضل نستخدم /explain الحقيقي
   (شوفي fetchExplain أسفل) اللي بيقدر كمان يستخدم SHAP الحقيقي على موديل مدرَّب. */
const BAD_DIRECTION = {HR:+1, MAP:-1, Resp:+1, Temp:+1};
const VAR_NAMES = {
  ar:{HR:'معدل ضربات القلب', MAP:'متوسط الضغط الشرياني', Resp:'معدل التنفس', Temp:'درجة الحرارة'},
  en:{HR:'Heart rate', MAP:'Mean arterial pressure', Resp:'Respiration rate', Temp:'Temperature'}
};

function explainFactors(series, lang){
  const names = VAR_NAMES[lang] || VAR_NAMES.ar;
  const q = Math.max(1, Math.floor(series.length/4));
  const factors = Object.keys(BAD_DIRECTION).map(key=>{
    const first = series.slice(0,q).reduce((s,d)=>s+d[key],0)/q;
    const last = series.slice(-q).reduce((s,d)=>s+d[key],0)/q;
    const delta = (last-first) * BAD_DIRECTION[key];
    return {variable:key, name:names[key], delta, direction: (last-first)>0?'up':'down'};
  }).sort((a,b)=>b.delta-a.delta);
  const total = factors.reduce((s,f)=>s+Math.max(f.delta,0),0) || 1;
  factors.forEach(f=> f.weight = Math.max(f.delta,0)/total);
  return factors;
}

async function fetchExplain(patientId, series, lang){
  try{
    const res = await fetch(`${window.API_BASE_URL}/explain?lang=${lang}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({patient_id:patientId, hourly_readings: series.map(d=>[d.HR,d.MAP,d.Temp,d.Resp])}),
      signal: AbortSignal.timeout(2000),
    });
    if(!res.ok) throw new Error();
    const data = await res.json();
    return data.factors.map(f=>({variable:f.variable, name:f.display_name, weight:f.weight, direction:f.direction}));
  }catch(e){
    return explainFactors(series, lang);
  }
}

function explainBarsHTML(factors, lang){
  const dirArrow = (d)=> d==='up' ? '↑' : '↓';
  const dirColor = (i)=> i===0 ? '#111827' : i===1 ? '#2563EB' : '#64748B';
  return factors.map((f,i)=>`
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
        <span style="color:var(--navy-900);font-weight:600;">${f.name} <span style="color:${dirColor(i)};">${dirArrow(f.direction)}</span></span>
        <span class="mono" style="color:var(--ink-500);">${Math.round(f.weight*100)}%</span>
      </div>
      <div style="height:8px;border-radius:999px;background:var(--paper-100);overflow:hidden;">
        <div style="height:100%;width:${Math.max(4,f.weight*100)}%;background:${dirColor(i)};border-radius:999px;"></div>
      </div>
    </div>`).join('');
}

/* ---------------------------- البصمة البصرية (Computer Vision) ----------------------------
   نسخة عرض مبسّطة في المتصفح لنفس فكرة src/timeseries_to_image.py (Gramian Angular Field):
   بنحوّل سلسلة زمنية واحدة لصورة T×T ونرسمها على Canvas بتدرج أزرق/أسود/رمادي —
   نفس الصورة (بشكل مبسّط) اللي بيحللها فرع الـ CNN جوه النموذج الحقيقي. */
function gafMatrix(values){
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max-min) || 1;
  const norm = values.map(v => 2*((v-min)/range) - 1);
  const phi = norm.map(v => Math.acos(Math.max(-1,Math.min(1,v))));
  const T = values.length;
  const mat = [];
  for(let i=0;i<T;i++){
    const row = [];
    for(let j=0;j<T;j++) row.push(Math.cos(phi[i]+phi[j]));
    mat.push(row);
  }
  return mat;
}

function recurrenceMatrix(values, thresholdRatio){
  const min = Math.min(...values), max = Math.max(...values);
  const range = (max-min) || 1;
  const norm = values.map(v => (v-min)/range);
  const T = norm.length;
  const threshold = (thresholdRatio ?? 0.18);
  const mat = [];
  for(let i=0;i<T;i++){
    const row = [];
    for(let j=0;j<T;j++) row.push(Math.abs(norm[i]-norm[j]) < threshold ? 1 : 0);
    mat.push(row);
  }
  return mat;
}

function drawRecurrenceCanvas(canvas, values){
  const mat = recurrenceMatrix(values);
  const T = mat.length;
  const cell = Math.floor(canvas.width / T);
  canvas.height = cell * T;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<T;i++){
    for(let j=0;j<T;j++){
      ctx.fillStyle = mat[i][j] ? 'rgb(37,99,235)' : 'rgb(240,242,247)';
      ctx.fillRect(j*cell, i*cell, cell, cell);
    }
  }
}

function drawGAFCanvas(canvas, values){
  const mat = gafMatrix(values);
  const T = mat.length;
  const cell = Math.floor(canvas.width / T);
  canvas.height = cell * T;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<T;i++){
    for(let j=0;j<T;j++){
      const v = (mat[i][j] + 1) / 2; // 0..1
      // تدرج أزرق (منخفض) -> رمادي -> أسود (مرتفع) ليتماشى مع هوية الموقع
      const r = Math.round(17 + (100-17)*(1-v));
      const g = Math.round(24 + (116-24)*(1-v));
      const b = Math.round(39 + (235-39)*v);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(j*cell, i*cell, cell, cell);
    }
  }
}

function myPatientsKey() {
  return `sw_mypatients_${Store.user || 'guest'}`;
}

function getMyPatients() {
  try {
    const list = JSON.parse(localStorage.getItem(myPatientsKey())) || [];
    // تنظيف تلقائي: أي سجلات تجريبية قديمة (source: 'example') كانت
    // متخزنة من نسخة سابقة من الموقع بتتشال نهائيًا هنا — الموقع دلوقتي
    // بيعرض بس الحالات اللي اليوزر دخّلها فعليًا بنفسه.
    const real = list.filter(p => p && p.source !== 'example');
    if (real.length !== list.length) {
      localStorage.setItem(myPatientsKey(), JSON.stringify(real));
    }
    return real;
  } catch (e) {
    return [];
  }
}

function saveMyPatient(record) {
  const list = getMyPatients();
  list.unshift(record);
  localStorage.setItem(myPatientsKey(), JSON.stringify(list.slice(0, 200)));
  return record;
}

function deleteMyPatient(id) {
  const list = getMyPatients().filter(p => p.id !== id);
  localStorage.setItem(myPatientsKey(), JSON.stringify(list));
}

function clearMyPatients() {
  localStorage.removeItem(myPatientsKey());
}

function generatePatientId() {
  return 'PT-' + Math.floor(100000 + Math.random() * 899999);
}

const TREATMENT_LIBRARY = {
  ar: {
    high: [
      { title: 'تفعيل حزمة الساعة الأولى', text: 'البدء الفوري بحزمة الساعة الأولى المعتمدة في Surviving Sepsis Campaign: قياس اللاكتات، سحب مزارع الدم قبل المضادات الحيوية، إعطاء مضاد حيوي واسع الطيف حسب بروتوكول القسم.' },
      { title: 'إنعاش وريدي بالسوائل', text: 'مناقشة إعطاء 30 مل/كجم من المحاليل البلورية خلال الساعات الأولى في حال انخفاض الضغط أو ارتفاع اللاكتات، مع إعادة تقييم الاستجابة.' },
      { title: 'تصعيد فوري', text: 'إبلاغ الطبيب المناوب فورًا وطلب تقييم مباشر عند السرير، مع النظر في نقل المريض لمستوى رعاية أعلى إذا لزم.' },
      { title: 'مراقبة مكثفة', text: 'رفع تكرار قياس العلامات الحيوية إلى كل 15-30 دقيقة حتى استقرار الحالة.' },
      { title: 'تحديد مصدر العدوى', text: 'مراجعة سريعة لأكثر مصادر العدوى شيوعًا (الرئة، المسالك البولية، الجروح، القسطرة) لتوجيه العلاج بدقة أكبر.' },
      { title: 'تقييم الأكسجين والتهوية', text: 'قياس تشبع الأكسجين فورًا، والنظر في دعم تنفسي إضافي إذا كان أقل من المعدل الطبيعي.' },
      { title: 'مراجعة الأدوية الحالية', text: 'مراجعة أي أدوية أو مسكنات تُعطى حاليًا قد تُخفي علامات تدهور الحالة (مثل خافضات الحرارة القوية).' },
    ],
    mid: [
      { title: 'إعادة تقييم مبكرة', text: 'جدولة إعادة تقييم كاملة خلال الساعة إلى الساعتين القادمتين، مع متابعة دقيقة لاتجاه العلامات الحيوية.' },
      { title: 'فحوصات معملية داعمة', text: 'النظر في طلب لاكتات، صورة دم كاملة، ووظائف كلى/كبد لدعم القرار السريري.' },
      { title: 'تواصل مع فريق الرعاية', text: 'إبلاغ الطبيب المسؤول بالتحديث الحالي حتى لو لم تستدعِ الحالة تصعيدًا فوريًا.' },
      { title: 'متابعة الاتجاه لا الرقم فقط', text: 'رقم واحد مش كفاية — قارني القراءة الحالية بالقراءات السابقة لنفس الشخص عشان تشوفي هل الوضع بيتحسن ولا بيتدهور.' },
      { title: 'ترطيب واستراحة استباقية', text: 'شجّعي على سوائل فموية كافية وراحة، وده بيقلل احتمالية تدهور بعض الحالات المتوسطة.' },
    ],
    low: [
      { title: 'مراقبة روتينية', text: 'الاستمرار في المراقبة الروتينية كل ساعة وفق بروتوكول القسم القياسي.' },
      { title: 'تثقيف المريض والأسرة', text: 'شرح العلامات التحذيرية التي تستوجب استدعاء الطاقم فورًا (تغير مستوى الوعي، صعوبة تنفس، برودة الأطراف).' },
      { title: 'روتين وقائي', text: 'استمري في العادات الوقائية العامة: ترطيب كافٍ، نوم كافٍ، ومتابعة أي عرض جديد قبل ما يتفاقم.' },
    ],
    comfort: [
      'رفع رأس السرير حوالي 30 درجة وتقييم مستوى الراحة والألم.',
      'مراجعة سلامة الجلد وجدول تغيير الوضعية لتقليل خطر قرح الفراش.',
      'تحديث الأسرة بخطة الرعاية الحالية عند المناسب وطمأنة المريض.',
      'التأكد من ترطيب المريض وسهولة الوصول لأدوات الاستدعاء.',
    ],
    vitals: {
      fever: { title: 'إدارة الحرارة المرتفعة', text: 'حرارة المريض مرتفعة عن الطبيعي — يُنصح بخافض حرارة حسب بروتوكول القسم، تبريد فيزيائي، وإعادة قياس الحرارة كل ساعة لتتبع الاستجابة.' },
      hypothermia: { title: 'انخفاض غير طبيعي في الحرارة', text: 'انخفاض الحرارة عن الطبيعي في سياق اشتباه إنتان علامة تحذيرية بحد ذاتها — يستدعي تدفئة نشطة ومراجعة عاجلة.' },
      tachycardia: { title: 'تسارع ملحوظ في النبض', text: 'معدل النبض الحالي أعلى من الطبيعي بوضوح — راجعي حالة الإماهة والألم والحرارة كأسباب محتملة، وتابعي الاتجاه كل 30 دقيقة.' },
      hypotension_map: { title: 'انخفاض متوسط الضغط الشرياني', text: 'متوسط الضغط الشرياني أقل من 65 مم زئبق تقريبًا — علامة على قصور تروية محتمل، فكري في سوائل وريدية وإعادة تقييم عاجل لضغط الدم.' },
      tachypnea: { title: 'تسارع معدل التنفس', text: 'معدل التنفس مرتفع عن الطبيعي — تابعي تشبع الأكسجين ومجهود التنفس، وفكري في دعم تنفسي إضافي إذا استمر الارتفاع.' },
      stable_vitals: { title: 'العلامات الحيوية المدخلة ضمن نطاق مقبول', text: 'القراءات المدخلة حاليًا لا تُظهر انحرافًا حادًا عن الطبيعي — استمري بالمراقبة الروتينية وأعيدي التحليل عند أي تغيّر.' },
      combo_fever_tachy: { title: 'نمط مركّب: حرارة + نبض سريع معًا', text: 'ارتفاع الحرارة والنبض سوا في نفس الوقت نمط شائع بيسبق تدهور الحالات المرتبطة بالعدوى — لو استمر التوليفة دي، الأولوية لازم تكون لتقييم طبي مباشر.' },
      combo_hypo_tachy: { title: 'نمط مركّب: نبض سريع + ضغط منخفض', text: 'النبض السريع مع انخفاض متوسط الضغط الشرياني معًا مؤشر أقوى من كل واحد لوحده على احتمال قصور تروية — ده النمط اللي بيستاهل أعلى أولوية متابعة.' },
    },
  },
  en: {
    high: [
      { title: 'Activate the hour-1 bundle', text: 'Begin the Surviving Sepsis Campaign hour-1 bundle immediately: measure lactate, draw blood cultures before antibiotics, and give broad-spectrum antibiotics per unit protocol.' },
      { title: 'IV fluid resuscitation', text: 'Discuss 30 mL/kg crystalloid fluids within the first hours if hypotension or elevated lactate is present, then reassess response.' },
      { title: 'Immediate escalation', text: 'Notify the covering physician immediately and request a direct bedside assessment; consider transfer to a higher level of care if needed.' },
      { title: 'Intensive monitoring', text: 'Increase vital sign checks to every 15-30 minutes until the patient stabilizes.' },
      { title: 'Identify the infection source', text: 'Quickly review the most common infection sources (lungs, urinary tract, wounds, catheters) to guide treatment more precisely.' },
      { title: 'Assess oxygenation and ventilation', text: 'Check oxygen saturation immediately, and consider additional respiratory support if below normal.' },
      { title: 'Review current medications', text: 'Review any current medications or painkillers that might mask deterioration signs (like strong antipyretics).' },
    ],
    mid: [
      { title: 'Early reassessment', text: 'Schedule a full reassessment within the next 1-2 hours, closely tracking the vital-sign trend.' },
      { title: 'Supportive labs', text: 'Consider ordering lactate, complete blood count, and renal/liver panels to support the clinical decision.' },
      { title: 'Care team communication', text: 'Update the attending physician on the current status even if immediate escalation is not required.' },
      { title: 'Track the trend, not just the number', text: 'A single reading isn\'t enough — compare the current reading with previous ones for the same person to see if things are improving or worsening.' },
      { title: 'Proactive hydration and rest', text: 'Encourage adequate oral fluids and rest, which reduces the chance of some moderate cases deteriorating.' },
    ],
    low: [
      { title: 'Routine monitoring', text: 'Continue routine hourly monitoring per the unit\'s standard protocol.' },
      { title: 'Patient and family education', text: 'Explain the warning signs that require immediately calling staff (altered consciousness, breathing difficulty, cold extremities).' },
      { title: 'Preventive routine', text: 'Keep up general preventive habits: adequate hydration, adequate sleep, and tracking any new symptom before it worsens.' },
    ],
    comfort: [
      'Elevate the head of the bed about 30 degrees and reassess comfort and pain level.',
      'Check skin integrity and the repositioning schedule to reduce pressure-injury risk.',
      'Update the family on the current care plan when appropriate and reassure the patient.',
      'Confirm the patient is adequately hydrated and can easily reach the call button.',
    ],
    vitals: {
      fever: { title: 'Managing elevated temperature', text: 'The entered temperature is above normal — consider an antipyretic per unit protocol, physical cooling, and re-checking temperature hourly to track response.' },
      hypothermia: { title: 'Abnormally low temperature', text: 'Low temperature in the context of suspected infection is itself a warning sign — active warming and urgent reassessment are warranted.' },
      tachycardia: { title: 'Notable tachycardia', text: 'The entered heart rate is clearly above normal — review hydration, pain, and fever as possible causes, and track the trend every 30 minutes.' },
      hypotension_map: { title: 'Low mean arterial pressure', text: 'MAP is roughly below 65 mmHg — a possible sign of hypoperfusion; consider IV fluids and urgent blood pressure reassessment.' },
      tachypnea: { title: 'Elevated respiratory rate', text: 'Respiration rate is above normal — monitor oxygen saturation and work of breathing, and consider additional respiratory support if it persists.' },
      stable_vitals: { title: 'Entered vitals are within an acceptable range', text: 'The currently entered readings do not show a sharp deviation from normal — continue routine monitoring and re-run the analysis if anything changes.' },
      combo_fever_tachy: { title: 'Combined pattern: fever + fast pulse together', text: 'Elevated temperature and heart rate occurring together is a common pattern preceding deterioration in infection-related cases — if this combination persists, direct medical assessment should be the priority.' },
      combo_hypo_tachy: { title: 'Combined pattern: fast pulse + low pressure', text: 'A fast heart rate together with a low mean arterial pressure is a stronger signal than either alone for possible hypoperfusion — this is the pattern that deserves the highest monitoring priority.' },
    },
  },
};

function detectVitalFlags(v) {
  v = v || {};
  return {
    hasFever: typeof v.temp === 'number' && v.temp >= 38.3,
    hasHypothermia: typeof v.temp === 'number' && v.temp < 36.0,
    hasTachy: typeof v.hr === 'number' && v.hr >= 110,
    hasLowMap: typeof v.map === 'number' && v.map < 65,
    hasTachypnea: typeof v.resp === 'number' && v.resp >= 24,
  };
}

function generateTreatmentPlan(riskLevel, age, sexFemale, episodeNumber, lang, vitals) {
  const lib = TREATMENT_LIBRARY[lang] || TREATMENT_LIBRARY.ar;
  const tier = riskLevel;
  const v = vitals || {};

  // بذرة عشوائية ثابتة (Deterministic) مبنية على كل مدخلات الحالة — نفس
  // المدخلات هتطلع نفس الخطة دايمًا، لكن أي فرق ولو بسيط في القراءات
  // (حتى لو نفس فئة الخطورة) بيغيّر الاختيار والترتيب فعليًا.
  const seed = seedFromString(`${age}-${sexFemale}-${episodeNumber}-${tier}-${v.hr||0}-${v.map||0}-${v.temp||0}-${v.resp||0}`);

  // اختيار عدد متغيّر من عناصر فئة الخطورة (مش كل العناصر ثابتة كل مرة)
  // بترتيب مبني على البذرة، عشان يبقى فيه تنوّع فعلي حتى داخل نفس الفئة.
  const tierPool = [...lib[tier]].sort(() => seed() - 0.5);
  const tierCount = tier === 'high' ? Math.min(tierPool.length, 4 + Math.floor(seed() * 2))
                    : tier === 'mid' ? Math.min(tierPool.length, 3 + Math.floor(seed() * 2))
                    : Math.min(tierPool.length, 2 + Math.floor(seed() * 2));
  const items = tierPool.slice(0, tierCount);

  if (age >= 70) {
    items.push({
      title: lang === 'en' ? 'Age-related caution' : 'احتياط خاص بكبار السن',
      text: lang === 'en'
        ? 'Advanced age is an independent risk factor in this model; consider closer monitoring intervals and earlier specialist involvement.'
        : 'التقدم في العمر عامل خطورة مستقل في هذا النموذج؛ يُنصح بمراقبة أقرب وإشراك استشاري أبكر.',
    });
  }
  if (episodeNumber >= 2) {
    items.push({
      title: lang === 'en' ? 'Recurrent episode history' : 'تاريخ نوبات متكررة',
      text: lang === 'en'
        ? 'A repeated sepsis episode may indicate an unresolved source of infection; consider infectious disease consultation.'
        : 'تكرار نوبات الإنتان قد يشير لمصدر عدوى لم يُعالج بالكامل؛ يُنصح بمناقشة استشارة أمراض معدية.',
    });
  }

  // ------------------------------------------------------------------
  // الجزء الديناميكي الحقيقي: القراءات الحيوية الفعلية المُدخلة (HR/MAP/
  // Temp/Resp) بتحدد إضافات فعلية للخطة — مش بس رقم الخطورة النهائي.
  // يعني نفس درجة الخطورة ممكن تطلع خطة مختلفة حسب إيه اللي فعلًا مرتفع/منخفض.
  // كمان بيتحقق من توليفات مركّبة (مثلاً حرارة+نبض سوا) لأن التوليفة نفسها
  // بتدي معلومة سريرية أقوى من كل قراءة لوحدها.
  // ------------------------------------------------------------------
  const vitalsLib = lib.vitals;
  let vitalsMatched = false;
  const { hasFever, hasHypothermia, hasTachy, hasLowMap, hasTachypnea } = detectVitalFlags(v);

  if (hasTachy && hasLowMap) { items.push(vitalsLib.combo_hypo_tachy); vitalsMatched = true; }
  else if (hasFever && hasTachy) { items.push(vitalsLib.combo_fever_tachy); vitalsMatched = true; }

  if (hasFever) { items.push(vitalsLib.fever); vitalsMatched = true; }
  else if (hasHypothermia) { items.push(vitalsLib.hypothermia); vitalsMatched = true; }
  if (hasTachy) { items.push(vitalsLib.tachycardia); vitalsMatched = true; }
  if (hasLowMap) { items.push(vitalsLib.hypotension_map); vitalsMatched = true; }
  if (hasTachypnea) { items.push(vitalsLib.tachypnea); vitalsMatched = true; }
  if (!vitalsMatched && (typeof v.hr === 'number' || typeof v.map === 'number')) {
    items.push(vitalsLib.stable_vitals);
  }

  const comfortPick = lib.comfort[Math.floor(seed() * lib.comfort.length)];
  items.push({
    title: lang === 'en' ? 'Patient comfort' : 'راحة المريض',
    text: comfortPick,
  });

  return items;
}

function toDisplayPatient(record, lang) {
  const sexLabel = record.sex === 1 ? (lang === 'en' ? 'F' : 'أنثى') : (lang === 'en' ? 'M' : 'ذكر');
  const nameLine = record.name || (lang === 'en' ? 'Unnamed patient' : 'مريض بدون اسم');
  return {
    id: record.id,
    name: `${nameLine}, ${record.age} ${lang === 'en' ? 'y/o' : 'سنة'}`,
    unit: lang === 'en' ? 'Analyzer' : 'المحلل',
    bed: `${sexLabel} · ${lang === 'en' ? 'episode' : 'نوبة'} ${record.episode}`,
    sepsis_probability: record.probability,
    risk_level: riskClass(record.probability),
    timestamp: record.timestamp,
  };
}

/* ---------------------------------------------------------------------------
 * "الملخص الذكي": فقرة واحدة مبنية بالكامل على القراءات اللي اليوزر دخّلها
 * فعليًا لنفس المريض (عمر/جنس/نوبات/علامات حيوية) — بتتغيّر تلقائيًا حسب
 * أي تغيير في المدخلات، مفيش نص ثابت.
 * ------------------------------------------------------------------------- */
function generateAISmartSummary(p, lang) {
  const L = (ar, en) => (lang === 'en' ? en : ar);
  const cls = riskClass(p.probability);
  const flags = detectVitalFlags(p);
  const abnormal = [];
  if (flags.hasFever) abnormal.push(L('ارتفاع الحرارة', 'fever'));
  if (flags.hasHypothermia) abnormal.push(L('انخفاض الحرارة', 'low temperature'));
  if (flags.hasTachy) abnormal.push(L('تسارع النبض', 'tachycardia'));
  if (flags.hasLowMap) abnormal.push(L('انخفاض ضغط الشريان المتوسط', 'low MAP'));
  if (flags.hasTachypnea) abnormal.push(L('تسارع التنفس', 'tachypnea'));

  const riskWord = cls === 'high' ? L('مرتفعة', 'high') : cls === 'mid' ? L('متوسطة', 'moderate') : L('منخفضة', 'low');
  const pct = Math.round(p.probability * 100);

  let sentence1 = L(
    `النموذج قيّم احتمالية الإنتان لهذه الحالة بـ${pct}% (درجة خطورة ${riskWord})، بالاعتماد على العمر ${p.age} سنة، ${p.sex === 1 ? 'أنثى' : 'ذكر'}، ونوبة رقم ${p.episode}.`,
    `The model estimated a ${pct}% sepsis probability for this case (${riskWord} risk), based on an age of ${p.age}, ${p.sex === 1 ? 'female' : 'male'}, episode number ${p.episode}.`
  );

  let sentence2;
  if (abnormal.length) {
    sentence2 = L(
      `القراءات الحيوية المدخلة بتُظهر ${abnormal.join('، ')} — وده اللي بيرفع درجة الخطورة الحالية.`,
      `The entered vitals show ${abnormal.join(', ')} — which is driving the current risk level up.`
    );
  } else {
    sentence2 = L('القراءات الحيوية المدخلة حاليًا ضمن نطاق مقبول ومفيش انحراف حاد فيها.',
                   'The currently entered vitals are within an acceptable range with no sharp deviation.');
  }

  let sentence3 = cls === 'high'
    ? L('التوصية العامة: تصعيد فوري وتفعيل بروتوكول الساعة الأولى، مع إعادة تقييم متكررة.',
        'Overall recommendation: immediate escalation and activation of the hour-1 protocol, with frequent reassessment.')
    : cls === 'mid'
    ? L('التوصية العامة: إعادة تقييم خلال الساعة إلى الساعتين القادمتين ومتابعة الاتجاه عن قرب.',
        'Overall recommendation: reassess within the next 1-2 hours and closely monitor the trend.')
    : L('التوصية العامة: الاستمرار في المراقبة الروتينية وإعادة التحليل عند أي تغيّر جديد.',
        'Overall recommendation: continue routine monitoring and re-run the analysis if anything changes.');

  return `${sentence1} ${sentence2} ${sentence3}`;
}

/* ---------------------------------------------------------------------------
 * "توقّع الاتجاه القادم": بيرسم خطين تقريبيين — الأول لو الحالة استمرت من
 * غير تدخل إضافي، والتاني لو خطة الرعاية المقترحة اتنفّذت — بناءً على شدة
 * انحراف القراءات المدخلة فعليًا (مش رقم عشوائي). ده توضيح تعليمي تقريبي
 * وليس تنبؤ طبي دقيق، وبيتقال ده صراحةً تحت الرسم.
 * ------------------------------------------------------------------------- */
function projectedTrajectorySVG(p, lang) {
  const L = (ar, en) => (lang === 'en' ? en : ar);
  const flags = detectVitalFlags(p);
  const severity = ['hasFever','hasHypothermia','hasTachy','hasLowMap','hasTachypnea']
    .reduce((s, k) => s + (flags[k] ? 1 : 0), 0);
  const base = p.probability;
  const worsenStep = 0.03 + severity * 0.025;
  const improveStep = 0.04 + severity * 0.02;

  const noCare = [base];
  const withCare = [base];
  for (let i = 1; i <= 5; i++) {
    noCare.push(Math.max(0, Math.min(1, noCare[i-1] + worsenStep * (0.9 + 0.1*i))));
    withCare.push(Math.max(0, Math.min(1, withCare[i-1] - improveStep)));
  }

  const w = 520, h = 160, pad = 24;
  const x = i => pad + (i * (w - 2*pad) / 5);
  const y = v => h - pad - (v * (h - 2*pad));
  const path = arr => arr.map((v,i) => `${i===0?'M':'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return `<div>
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="var(--line)" stroke-width="1"/>
      <path d="${path(noCare)}" fill="none" stroke="#DC5F5F" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${path(withCare)}" fill="none" stroke="#2FA98C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${noCare.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#DC5F5F"/>`).join('')}
      ${withCare.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#2FA98C"/>`).join('')}
    </svg>
    <div style="display:flex;gap:18px;font-size:12px;margin-top:6px;">
      <span style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#DC5F5F;display:inline-block;"></span>${L('لو من غير تدخل إضافي', 'Without additional intervention')}</span>
      <span style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#2FA98C;display:inline-block;"></span>${L('لو خطة الرعاية المقترحة اتنفّذت', 'If the suggested care plan is followed')}</span>
    </div>
    <p style="font-size:12px;color:var(--ink-500);margin-top:8px;">${L('توضيح تقريبي مبني على شدة انحراف القراءات الحالية عن الطبيعي، وليس تنبؤًا طبيًا دقيقًا — القرار السريري الفعلي بيد الفريق الطبي.',
      'An approximate illustration based on how far the current readings deviate from normal, not a precise medical forecast — the actual clinical decision rests with the care team.')}</p>
  </div>`;
}

function aiSummaryPanelHTML(p, lang) {
  const L = (ar, en) => (lang === 'en' ? en : ar);
  return `<div class="card panel" style="margin-top:20px;">
    <div class="panel-head"><h3>${L('ملخص وتحليل AI للحالة', 'AI case summary & analysis')}</h3></div>
    <p style="font-size:14px;line-height:1.8;">${generateAISmartSummary(p, lang)}</p>
  </div>
  <div class="card panel" style="margin-top:20px;">
    <div class="panel-head"><h3>${L('توقّع الاتجاه القادم (AI)', 'AI-projected trajectory')}</h3></div>
    ${projectedTrajectorySVG(p, lang)}
  </div>`;
}

/* ---------------------------------------------------------------------------
 * أيقونات SVG أصلية للعلامات الحيوية (تصميم خاص بالمشروع، مش صور خارجية)
 * ------------------------------------------------------------------------- */
const VitalIcon = {
  hr: `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="17" cy="17" r="16" fill="#FDEDED"/><path d="M6 18h4l2-6 4 12 3-9 2 3h7" stroke="#DC5F5F" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  map: `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="17" cy="17" r="16" fill="#EAF3FF"/><path d="M17 7c4 5 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 3-7 7-12z" fill="none" stroke="#2563EB" stroke-width="2" stroke-linejoin="round"/></svg>`,
  temp: `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="17" cy="17" r="16" fill="#FFF3E6"/><rect x="14.5" y="7" width="5" height="15" rx="2.5" fill="none" stroke="#E08A2B" stroke-width="2"/><circle cx="17" cy="24" r="4" fill="#E08A2B"/></svg>`,
  resp: `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="17" cy="17" r="16" fill="#EAF8F3"/><path d="M17 8v9M10 12c-2.5 0-4 2-4 5s2 6 5 6c2 0 3-2 3-4M24 12c2.5 0 4 2 4 5s-2 6-5 6c-2 0-3-2-3-4" stroke="#2FA98C" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
};

/* ---------------------------------------------------------------------------
 * محرك "تعلّم من بياناتك": بيبني ملاحظات وتوصيات مخصصة اعتمادًا فقط على
 * سجل الحالات اللي اليوزر نفسه دخّلها (getMyPatients) — مفيش أي بيانات
 * من الداتا سيت الأصلية أو من مستخدمين تانيين بتدخل هنا. كل ما اليوزر
 * يحلل حالات أكتر، الملاحظات دي بتتغيّر وتتحسّن تلقائيًا (شكل بسيط من
 * "التعلّم" المبني على تاريخ استخدام الشخص نفسه فقط).
 * ------------------------------------------------------------------------- */
function personalizedLearningInsights(lang) {
  const list = getMyPatients();
  const L = (ar, en) => (lang === 'en' ? en : ar);
  if (list.length < 2) {
    return {
      ready: false,
      tips: [L(
        'حللي حالتين على الأقل عشان الذكاء الاصطناعي يبدأ يتعرف على نمط استخدامك ويديكي ملاحظات مخصصة بتتحسن مع كل حالة جديدة.',
        'Analyze at least two cases so the AI can start learning your usage pattern and give you personalized notes that improve with every new case.'
      )],
    };
  }

  const tips = [];
  const n = list.length;
  const chronological = [...list].reverse(); // list محفوظة الأحدث الأول، فبنقلبها للترتيب الزمني
  const half = Math.max(1, Math.floor(n / 2));
  const recent = chronological.slice(-half);
  const older = chronological.slice(0, n - half);
  const avg = arr => arr.reduce((s, p) => s + p.probability, 0) / arr.length;
  const avgRecent = avg(recent);
  const avgOlder = older.length ? avg(older) : avgRecent;
  const deltaPct = Math.round((avgRecent - avgOlder) * 100);

  // 1) اتجاه عام عبر كل الحالات اللي حللها اليوزر (تعلّم عبر الوقت)
  if (Math.abs(deltaPct) >= 5) {
    tips.push(deltaPct > 0
      ? L(`متوسط درجة الخطورة في آخر حالاتك أعلى بـ${deltaPct}% تقريبًا عن حالاتك الأقدم — لو ده نمط متكرر لنفس المريض، يستاهل مراجعة خطة الرعاية.`,
          `Your recent cases average about ${deltaPct}% higher risk than your earlier ones — if this is a repeating pattern for the same patient, the care plan may need review.`)
      : L(`متوسط درجة الخطورة في آخر حالاتك أقل بـ${Math.abs(deltaPct)}% تقريبًا عن حالاتك الأقدم — مؤشر إيجابي على استقرار الحالات اللي بتتابعيها.`,
          `Your recent cases average about ${Math.abs(deltaPct)}% lower risk than your earlier ones — a positive sign for the cases you're tracking.`));
  } else {
    tips.push(L('درجات الخطورة في حالاتك ثابتة نسبيًا على مدار آخر تحليلاتك، من غير تحسّن أو تدهور واضح.',
                 'Risk levels across your recent analyses are relatively stable, without a clear improvement or worsening.'));
  }

  // 2) أكتر عامل حيوي بيتكرر ظهوره في حالات اليوزر (تخصيص حسب نمط الشخص)
  const counts = { fever: 0, hypothermia: 0, tachycardia: 0, hypotension_map: 0, tachypnea: 0 };
  list.forEach(p => {
    if (typeof p.temp === 'number' && p.temp >= 38.3) counts.fever++;
    if (typeof p.temp === 'number' && p.temp < 36.0) counts.hypothermia++;
    if (typeof p.hr === 'number' && p.hr >= 110) counts.tachycardia++;
    if (typeof p.map === 'number' && p.map < 65) counts.hypotension_map++;
    if (typeof p.resp === 'number' && p.resp >= 24) counts.tachypnea++;
  });
  const topFactor = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const factorNames = {
    fever: L('ارتفاع الحرارة', 'fever'),
    hypothermia: L('انخفاض الحرارة', 'hypothermia'),
    tachycardia: L('تسارع النبض', 'tachycardia'),
    hypotension_map: L('انخفاض ضغط الشريان المتوسط', 'low mean arterial pressure'),
    tachypnea: L('تسارع التنفس', 'tachypnea'),
  };
  if (topFactor && topFactor[1] >= Math.ceil(n * 0.4) && topFactor[1] >= 2) {
    tips.push(L(`${factorNames[topFactor[0]]} ظهر في ${topFactor[1]} من أصل ${n} حالة حللتيها — ده نمط متكرر يستاهل تركيز أكبر في المتابعة والتقييم السريري.`,
                 `${factorNames[topFactor[0]]} showed up in ${topFactor[1]} of the ${n} cases you've analyzed — a recurring pattern worth extra focus during follow-up.`));
  }

  // 3) نسبة الحالات عالية الخطورة في سجل اليوزر
  const highShare = list.filter(p => riskClass(p.probability) === 'high').length / n;
  if (highShare >= 0.4) {
    tips.push(L('نسبة كبيرة من الحالات اللي حللتيها مصنّفة خطر مرتفع — يُفضّل مراجعة بروتوكول التصعيد المبكر مع الفريق الطبي.',
                 'A large share of the cases you\'ve analyzed are classified high-risk — consider reviewing early-escalation protocol with the care team.'));
  }

  // 4) توقع بسيط للاتجاه القادم بناءً على آخر 3 قراءات (اتجاه خطي مبسّط)
  if (n >= 3) {
    const lastThree = chronological.slice(-3).map(p => p.probability);
    const slope = (lastThree[2] - lastThree[0]) / 2;
    const predictedNext = Math.max(0, Math.min(1, lastThree[2] + slope));
    if (Math.abs(slope) > 0.05) {
      tips.push(L(`بناءً على آخر 3 حالات، الاتجاه العام ${slope > 0 ? 'صاعد' : 'هابط'}، ولو استمر النمط ده، الحالة الجاية متوقع تكون حوالي ${Math.round(predictedNext * 100)}% خطورة — ده توقع تقريبي مش تشخيص.`,
                   `Based on your last 3 cases, the trend is ${slope > 0 ? 'rising' : 'falling'}; if this continues, the next case is roughly projected at ${Math.round(predictedNext * 100)}% risk — an approximation, not a diagnosis.`));
    }
  }

  return { ready: true, tips, stats: { n, avgRecent, avgOlder, deltaPct, topFactor: topFactor ? topFactor[0] : null, highShare } };
}

function personalizedInsightsHTML(lang) {
  const res = personalizedLearningInsights(lang);
  const title = lang === 'en' ? 'Smart tips — learned from your own data' : 'نصايح ذكية — متعلّمة من بياناتك انتِ';
  const sub = res.ready
    ? (lang === 'en' ? 'Updates automatically as you analyze more cases.' : 'بتتحدّث تلقائيًا كل ما تحللي حالات أكتر.')
    : '';
  return `<div class="card panel" id="learningPanel">
    <div class="panel-head"><h3>${title}</h3></div>
    ${sub ? `<p style="color:var(--ink-500);font-size:13px;margin:-6px 0 10px;">${sub}</p>` : ''}
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${res.tips.map(tip => `<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:var(--paper-100);border-radius:10px;">
        <span style="flex-shrink:0;">🧠</span><span style="font-size:14px;line-height:1.6;">${tip}</span>
      </div>`).join('')}
    </div>
  </div>`;
}

/* اتجاه المريض عبر الزيارات لو اليوزر دخّل نفس الاسم أكتر من مرة (متابعة نفس
 * الشخص عبر الوقت) — يقارن القراءة الحالية بأقرب قراءة سابقة بنفس الاسم فقط
 * من سجل اليوزر نفسه. */
function patientHistoryComparisonHTML(current, lang) {
  const L = (ar, en) => (lang === 'en' ? en : ar);
  if (!current.name) return '';
  const list = getMyPatients();
  const sameName = list.filter(p => p.name === current.name && p.id !== current.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (!sameName.length) return '';
  const prev = sameName[0];
  const deltaPct = Math.round((current.probability - prev.probability) * 100);
  if (Math.abs(deltaPct) < 3) {
    var msg = L('الحالة مستقرة نسبيًا مقارنة بآخر تحليل مسجّل لنفس الاسم.',
                'The condition is relatively stable compared to the last recorded analysis for this name.');
  } else if (deltaPct > 0) {
    var msg = L(`درجة الخطورة ارتفعت بـ${deltaPct}% عن آخر تحليل مسجّل لنفس المريض — يُنصح بمتابعة أقرب.`,
                `Risk has increased by ${deltaPct}% since the last recorded analysis for this patient — closer follow-up is advised.`);
  } else {
    var msg = L(`درجة الخطورة انخفضت بـ${Math.abs(deltaPct)}% عن آخر تحليل مسجّل لنفس المريض — مؤشر تحسّن.`,
                `Risk has decreased by ${Math.abs(deltaPct)}% since the last recorded analysis for this patient — a sign of improvement.`);
  }
  return `<div class="card panel" style="margin-top:20px;">
    <div class="panel-head"><h3>${L('مقارنة بزياراتك السابقة لنفس المريض', "Compared to your previous visits for this patient")}</h3></div>
    <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:var(--paper-100);border-radius:10px;">
      <span style="flex-shrink:0;">📈</span><span style="font-size:14px;line-height:1.6;">${msg}</span>
    </div>
  </div>`;
}

document.addEventListener('DOMContentLoaded', applyTheme);
