/* ============================================================================
   OiO Nail Spa — طبقة البيانات المشتركة (Booking Data Layer)
   ----------------------------------------------------------------------------
   هذا الملف يستخدمه كل من صفحة الموقع (index.html) وصفحة الإدارة (admin.html).

   • إذا عبّأتِ إعدادات Firebase بالأسفل  → تُحفظ الحجوزات في السحابة وتتزامن
     فورياً بين جوال العميلة وصفحة الإدارة في الصالون (الوضع الاحترافي).
   • إذا تركتِ الإعدادات فارغة            → يعمل النظام محلياً على نفس الجهاز
     (مناسب للتجربة قبل ربط Firebase).

   راجعي ملف SETUP.md لخطوات إنشاء مشروع Firebase خطوة بخطوة.
============================================================================ */

/* ── ١) إعدادات Firebase ───────────────────────────────────────────────────
   انسخي القيم من: Firebase Console ← Project settings ← Your apps ← Web app
   هذه القيم عامة وآمنة للوضع في كود الواجهة (الحماية تتم عبر قواعد Firestore). */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDfPHqtLhmdi7ZN1TloElNrwtVJxjPmQic",
  authDomain:        "oio-spa.firebaseapp.com",
  projectId:         "oio-spa",
  storageBucket:     "oio-spa.firebasestorage.app",
  messagingSenderId: "977181388313",
  appId:             "1:977181388313:web:7b5bfe294c354287880488"
};

/* ── ٢) إعدادات الصالون والمواعيد ─────────────────────────────────────────── */
const SALON = {
  name:        "OiO Nail Spa",
  nameAr:      "أويو نيل سبا",
  whatsapp:    "966567109942",   // رقم واتساب الصالون (بدون + أو أصفار)
  managerEmail:"manager@oio.sa", // (وضع Firebase) بريد المديرة — يُمنح صلاحية كاملة تلقائيًا
  currency:    "ر.س",
  vatNote:     "شاملة ضريبة القيمة المضافة ١٥٪",

  openHour:    14,   // بداية الدوام — ٢:٠٠ ظهراً
  closeHour:   23,   // نهاية الدوام — ١١:٠٠ مساءً (آخر موعد يبدأ قبلها)
  slotMinutes: 30,   // الفاصل بين المواعيد بالدقائق
  slotCapacity: 3,   // (احتياطي) يُستخدم فقط إن لم تُعرّف فنيات بالأسفل

  /* الفنيات / الكراسي — كل فنية عمود في تقويم الإدارة.
     عدد الفنيات = عدد الحجوزات الممكنة في نفس الوقت.
     غيّري الأسماء/الألوان أو أضيفي/احذفي حسب صالونك. */
  staff: [
    { id:"ruth",    name:"Ruth Salud",      color:"#5aa9d6" },
    { id:"maricar", name:"Maricar Bunayog", color:"#52c7b8" },
    { id:"love",    name:"Love Rose",       color:"#e29ec4" }
  ],

  closedWeekdays:  [],   // أيام الإغلاق (0=الأحد .. 6=السبت). مثال للجمعة: [5]
  bookingLeadMin:  60,   // لا يمكن الحجز خلال آخر (٦٠) دقيقة قبل الموعد
  maxAdvanceDays:  30    // أقصى مدى للحجز المسبق بالأيام
};

/* رمز سري لصفحة الإدارة في حال عدم ربط Firebase (الوضع المحلي فقط) */
const LOCAL_ADMIN_PASSCODE = "oio2026";

/* ── ٣) كتالوج الخدمات (مطابق لقائمة الموقع) ───────────────────────────────
   dur = المدة التقديرية بالدقائق (تُستخدم لحساب وقت الموعد).                */
const SERVICE_GROUPS = [
  { id:"mani", title:"مانيكير وباديكير", en:"Mani & Pedi", items:[
    { id:"spa-mani",   ar:"سبا أويو — مانيكير",  en:"OiO Spa Manicure",  price:138, dur:60 },
    { id:"spa-pedi",   ar:"سبا أويو — باديكير",  en:"OiO Spa Pedicure",  price:138, dur:60 },
    { id:"rus-mani",   ar:"مانيكير روسي",        en:"Russian Manicure",  price:105, dur:75 },
    { id:"rus-pedi",   ar:"باديكير روسي",        en:"Russian Pedicure",  price:126, dur:75 },
    { id:"cls-mani",   ar:"مانيكير كلاسيك",      en:"Classic Manicure",  price:66,  dur:45 },
    { id:"cls-pedi",   ar:"باديكير كلاسيك",      en:"Classic Pedicure",  price:88,  dur:45 }
  ]},
  { id:"gel", title:"الجل والطلاء", en:"Gel & Polish", items:[
    { id:"gel-polish", ar:"طلاء جل",       en:"Gel Polish",      price:66,  dur:45 },
    { id:"gel-chrome", ar:"كروم جل",       en:"Gel Chrome",      price:115, dur:60 },
    { id:"gel-cateye", ar:"كات آي جل",     en:"Cat Eye Gel",     price:82,  dur:50 },
    { id:"omb-reg",    ar:"أومبري عادي",   en:"Regular Ombré",   price:88,  dur:50 },
    { id:"omb-gel",    ar:"أومبري جل",     en:"Gel Ombré",       price:132, dur:60 },
    { id:"fr-reg",     ar:"فرنش عادي",     en:"French Regular",  price:153, dur:60 },
    { id:"fr-gel",     ar:"فرنش جل",       en:"French Gel",      price:197, dur:70 }
  ]},
  { id:"art", title:"فن الأظافر", en:"Nail Art", items:[
    { id:"art-stick",  ar:"ستيكرات",          en:"Art Stickers",     price:44,  dur:15 },
    { id:"art-simple", ar:"رسم بسيط",         en:"Simple Art",       price:66,  dur:25 },
    { id:"art-cmplx",  ar:"رسم معقّد",        en:"Complicated Art",  price:132, dur:50 },
    { id:"art-3d",     ar:"رسم ثلاثي الأبعاد", en:"3D Nail Art",      price:215, dur:75 }
  ]},
  { id:"ext", title:"الإطالة والتعبئة", en:"Extensions & Refill", items:[
    { id:"biab-nat",   ar:"بياب جل على الأظافر الطبيعية", en:"BIAB on Natural Nails", price:203, dur:90 },
    { id:"biab-refill",ar:"إعادة تعبئة بياب",            en:"BIAB Refill",           price:132, dur:60 },
    { id:"fake-ext",   ar:"تركيب أظافر",                 en:"Fake Nail Extension",   price:165, dur:90 },
    { id:"biab-ext",   ar:"بياب إكستنشن / جل إكس",       en:"BIAB / Gel X Extension",price:484, dur:120 },
    { id:"rm-gel",     ar:"إزالة طلاء جل",               en:"Gel Polish Removal",    price:49,  dur:20 },
    { id:"rm-biab",    ar:"إزالة جل بياب",               en:"BIAB Gel Removal",      price:99,  dur:30 },
    { id:"rm-ext",     ar:"إزالة جل إكستنشن",            en:"Gel Extension Removal", price:176, dur:40 }
  ]},
  { id:"add", title:"إضافات", en:"Add-Ons", items:[
    { id:"add-reg",    ar:"طلاء عادي",        en:"Regular Polish",   price:27, dur:20 },
    { id:"add-bb",     ar:"طلاء بي بي كريم",  en:"BB Cream Polish",  price:33, dur:20 },
    { id:"add-scrubh", ar:"دعك إضافي لليدين", en:"Extra Scrub Hands",price:22, dur:15 },
    { id:"add-scrubf", ar:"دعك إضافي للقدمين",en:"Extra Scrub Feet", price:44, dur:20 }
  ]}
];

/* خريطة سريعة id ← تفاصيل الخدمة */
const SERVICE_MAP = (() => {
  const m = {};
  SERVICE_GROUPS.forEach(g => g.items.forEach(it => { m[it.id] = { ...it, group:g.title }; }));
  return m;
})();

/* ── ٤) أدوات مساعدة ──────────────────────────────────────────────────────── */
const Utils = {
  /* رمز حجز قصير مثل OIO-7F3K */
  makeRef(){
    const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let r = "";
    for (let i=0;i<4;i++) r += s[Math.floor(Math.random()*s.length)];
    return "OIO-" + r;
  },
  /* تطبيع رقم جوال سعودي → 9665XXXXXXXX */
  normalizePhone(raw){
    let d = (raw||"").replace(/[^\d]/g,"");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.startsWith("966")) return d;
    if (d.startsWith("0"))  d = d.slice(1);
    if (d.startsWith("5") && d.length===9) return "966"+d;
    return d ? "966"+d : "";
  },
  validPhone(raw){
    const n = Utils.normalizePhone(raw);
    return /^9665\d{8}$/.test(n);
  },
  prettyPhone(raw){
    const n = Utils.normalizePhone(raw);
    if (/^9665\d{8}$/.test(n)){
      const local = "0"+n.slice(3); // 05XXXXXXXX
      return local.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
    }
    return raw||"";
  },
  todayStr(){
    const d = new Date(); d.setHours(0,0,0,0);
    return Utils.dateStr(d);
  },
  dateStr(d){
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  },
  parseDate(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); },
  arWeekday(d){ return ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"][d.getDay()]; },
  arMonth(d){ return ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()]; },
  pretty12(time){ // "14:30" → "2:30 م"
    const [h,m] = time.split(":").map(Number);
    const ap = h>=12 ? "م" : "ص";
    let hh = h%12; if (hh===0) hh=12;
    return `${hh}:${String(m).padStart(2,"0")} ${ap}`;
  },
  arWeekdayShort(d){ return ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"][d.getDay()]; },
  arMonthShort(d){ return ["ينا","فبر","مار","أبر","مايو","يون","يول","أغس","سبت","أكت","نوف","ديس"][d.getMonth()]; },
  fmtDur(min){
    const h=Math.floor(min/60), m=min%60;
    if (h && m) return `${h} س ${m} د`;
    if (h) return `${h} ساعة`;
    return `${m} دقيقة`;
  },
  /* تحويل "HH:MM" → دقائق منذ منتصف الليل، والعكس */
  toMin(t){ if(!t) return 0; const [h,m]=String(t).split(":").map(Number); return h*60+(m||0); },
  fromMin(m){ const h=Math.floor(m/60), mm=m%60; return `${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`; },
  overlap(a1,a2,b1,b2){ return a1 < b2 && b1 < a2; }
};

/* ذاكرة مؤقتة للموظتات والإعدادات (تُحمَّل من التخزين وتُحدَّث ديناميكيًا) */
let _staffCache = null;
let _settingsLoaded = false;

/* ── جدولة التوفّر (يراعي الفنيات + الحجوزات + الحظر + مدة الخدمة) ───────────── */
const Schedule = {
  staffList(){
    const arr = (_staffCache && _staffCache.length) ? _staffCache : (SALON.staff || []);
    return arr.length ? arr : [{ id:"main", name:SALON.nameAr||"الصالون", color:"#a96a4a" }];
  },
  _prep(slots, blocks){
    const S = (slots||[]).filter(x=>x.status!=="cancelled").map(x=>{
      const start = Utils.toMin(x.time || x.start);
      return { staff:x.staff, startMin:start, endMin:start + (x.durMin||x.totalDur||SALON.slotMinutes) };
    });
    const B = (blocks||[]).map(x=>({ staff:x.staff, startMin:Utils.toMin(x.start), endMin:Utils.toMin(x.end) }));
    return { S, B };
  },
  /* قائمة معرّفات الفنيات المتاحات لنافذة [startMin, startMin+durMin) */
  freeStaffAt(startMin, durMin, S, B){
    const endMin = startMin + durMin;
    if (startMin < SALON.openHour*60 || endMin > SALON.closeHour*60) return [];
    return this.staffList().filter(s=>{
      for (const sl of S){ if (sl.staff===s.id && Utils.overlap(startMin,endMin,sl.startMin,sl.endMin)) return false; }
      for (const bl of B){ if ((bl.staff===s.id || bl.staff==="all") && Utils.overlap(startMin,endMin,bl.startMin,bl.endMin)) return false; }
      return true;
    }).map(s=>s.id);
  },
  /* أوقات البداية المتاحة (شبكة) لخدمة مدتها durMin في يوم معيّن */
  availableStarts(dateStr, durMin, slots, blocks){
    const { S, B } = this._prep(slots, blocks);
    const out=[]; const isToday = dateStr===Utils.todayStr();
    const now = new Date(); const nowMin = now.getHours()*60 + now.getMinutes() + SALON.bookingLeadMin;
    for (let m=SALON.openHour*60; m + durMin <= SALON.closeHour*60; m += SALON.slotMinutes){
      if (isToday && m < nowMin) continue;
      if (this.freeStaffAt(m, durMin, S, B).length > 0) out.push(Utils.fromMin(m));
    }
    return out;
  },
  /* اختيار فنية متاحة (الأقل انشغالًا) لإسناد الحجز */
  assignStaff(startMin, durMin, slots, blocks){
    const { S, B } = this._prep(slots, blocks);
    const free = this.freeStaffAt(startMin, durMin, S, B);
    if (!free.length) return this.staffList()[0].id;
    const cnt={}; free.forEach(id=>cnt[id]=0);
    S.forEach(sl=>{ if (cnt[sl.staff]!==undefined) cnt[sl.staff]++; });
    free.sort((a,b)=>cnt[a]-cnt[b]);
    return free[0];
  },
  staffName(id){ const s=this.staffList().find(x=>x.id===id); return s?s.name:"غير معيّن"; },
  staffColor(id){ const s=this.staffList().find(x=>x.id===id); return s?s.color:"#8d8175"; }
};

/* ── ٥) طبقة التخزين (Firebase أو محلي) ─────────────────────────────────────── */
const FB_READY = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.length > 15 && FIREBASE_CONFIG.projectId);

let _db=null, _auth=null;
if (FB_READY && typeof firebase !== "undefined"){
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    _db   = firebase.firestore();
    _auth = firebase.auth();
  } catch(e){ console.error("Firebase init error:", e); }
}

const Store = {
  mode: (FB_READY && _db) ? "firebase" : "local",

  /* ---------- إنشاء حجز (من الموقع أو الإدارة) ----------
     يُسند تلقائيًا أول فنية متاحة، ويكتب نسخة جدولة عامة (slots)
     خالية من البيانات الشخصية ليقرأها الموقع لحساب التوفّر.        */
  async createBooking(data){
    const ref = Utils.makeRef();
    const isGift = !!data.isGift;
    const durMin = data.totalDur || SALON.slotMinutes;
    let staff = data.staff || null;
    if (!isGift && !staff){                 // الهدية بلا موعد محدّد ⇒ بلا إسناد فنية
      await this.ensureStaff();
      const [slots, blocks] = await Promise.all([ this.getDaySlots(data.date), this.getDayBlocks(data.date) ]);
      staff = Schedule.assignStaff(Utils.toMin(data.time), durMin, slots, blocks);
    }
    const rec = {
      ref,
      name:  (data.name||"").trim(),
      phone: Utils.normalizePhone(data.phone),
      services: data.services || [],
      totalPrice: data.totalPrice || 0,
      totalDur:   durMin,
      date: data.date,
      time: isGift ? "" : (data.time||""),
      notes: (data.notes||"").trim(),
      status: data.status || "pending",
      source: data.source || "web",
      staff: staff || "",
      isGift,
      gifterName:  (data.gifterName||"").trim(),
      gifterPhone: data.gifterPhone ? Utils.normalizePhone(data.gifterPhone) : "",
      giftMessage: (data.giftMessage||"").trim()
    };

    if (this.mode === "firebase"){
      const bRef = _db.collection("bookings").doc();
      const batch = _db.batch();
      let slotId = "";
      if (!isGift && rec.time){            // أنشئ نسخة جدولة فقط للحجوزات المجدولة
        const sRef = _db.collection("slots").doc(); slotId = sRef.id;
        batch.set(sRef, { date:rec.date, time:rec.time, durMin, staff, status:rec.status, bookingId:bRef.id });
      }
      batch.set(bRef, { ...rec, slotId, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      await batch.commit();
      return { id: bRef.id, ref, staff };
    } else {
      rec.id = "loc_" + Date.now() + "_" + Math.floor(Math.random()*1000);
      rec.createdAt = Date.now();
      const all = this._localAll(); all.push(rec); this._localSave(all);
      return { id: rec.id, ref, staff };
    }
  },

  /* ---------- جلب حجوزات يوم معيّن (كامل، للإدارة) ---------- */
  async getDayBookings(dateStr){
    if (this.mode === "firebase"){
      const snap = await _db.collection("bookings").where("date","==",dateStr).get();
      const out=[]; snap.forEach(d=>out.push({ id:d.id, ...d.data() }));
      return out.filter(b => b.status !== "cancelled");
    }
    return this._localAll().filter(b => b.date===dateStr && b.status!=="cancelled");
  },

  /* ---------- جلب جدولة اليوم (بدون بيانات شخصية، للموقع) ---------- */
  async getDaySlots(dateStr){
    if (this.mode === "firebase"){
      const snap = await _db.collection("slots").where("date","==",dateStr).get();
      const out=[]; snap.forEach(d=>out.push({ id:d.id, ...d.data() }));
      return out.filter(s => s.status !== "cancelled");
    }
    return this._localAll()
      .filter(b => b.date===dateStr && b.status!=="cancelled" && b.time && !b.isGift)
      .map(b => ({ id:b.id, date:b.date, time:b.time, durMin:b.totalDur, staff:b.staff, status:b.status, bookingId:b.id }));
  },

  /* ---------- اشتراك مباشر بكل الحجوزات (لصفحة الإدارة) ---------- */
  subscribeBookings(cb){
    if (this.mode === "firebase"){
      return _db.collection("bookings").orderBy("createdAt","desc")
        .onSnapshot(snap => {
          const out=[]; snap.forEach(d=>out.push({ id:d.id, ...d.data() }));
          cb(out);
        }, err => console.error("subscribe error:", err));
    } else {
      const emit = () => cb(this._localAll().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)));
      window.addEventListener("storage", emit);
      window.addEventListener("oio-local-change", emit);
      emit();
      return () => {
        window.removeEventListener("storage", emit);
        window.removeEventListener("oio-local-change", emit);
      };
    }
  },

  async updateBooking(id, patch){
    if (this.mode === "firebase"){
      await _db.collection("bookings").doc(id).update(patch);
      const mirror={};
      if (patch.status!==undefined) mirror.status=patch.status;
      if (patch.staff!==undefined)  mirror.staff =patch.staff;
      if (patch.time!==undefined)   mirror.time  =patch.time;
      if (Object.keys(mirror).length){
        const snap = await _db.collection("slots").where("bookingId","==",id).get();
        const batch=_db.batch(); snap.forEach(d=>batch.update(d.ref, mirror)); await batch.commit();
      }
    } else {
      const all = this._localAll();
      const i = all.findIndex(b=>b.id===id);
      if (i>=0){ all[i] = { ...all[i], ...patch }; this._localSave(all); }
    }
  },

  async deleteBooking(id){
    if (this.mode === "firebase"){
      const snap = await _db.collection("slots").where("bookingId","==",id).get();
      const batch=_db.batch(); snap.forEach(d=>batch.delete(d.ref));
      batch.delete(_db.collection("bookings").doc(id));
      await batch.commit();
    } else {
      this._localSave(this._localAll().filter(b=>b.id!==id));
    }
  },

  /* ---------- الحظر / الأوقات غير المتاحة (من الإدارة) ---------- */
  async createBlock(data){
    const rec = { date:data.date, start:data.start, end:data.end, staff:data.staff||"all", reason:(data.reason||"غير متاح") };
    if (this.mode === "firebase"){
      rec.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const d = await _db.collection("blocks").add(rec);
      return { id:d.id };
    }
    rec.id = "blk_"+Date.now()+"_"+Math.floor(Math.random()*1000);
    const all=this._localBlocks(); all.push(rec); this._localSaveBlocks(all);
    return { id:rec.id };
  },
  async getDayBlocks(dateStr){
    if (this.mode === "firebase"){
      const snap = await _db.collection("blocks").where("date","==",dateStr).get();
      const out=[]; snap.forEach(d=>out.push({ id:d.id, ...d.data() })); return out;
    }
    return this._localBlocks().filter(b=>b.date===dateStr);
  },
  subscribeBlocks(cb){
    if (this.mode === "firebase"){
      return _db.collection("blocks").onSnapshot(snap=>{
        const out=[]; snap.forEach(d=>out.push({ id:d.id, ...d.data() })); cb(out);
      }, err=>console.error("blocks subscribe error:", err));
    }
    const emit=()=>cb(this._localBlocks());
    window.addEventListener("storage", emit);
    window.addEventListener("oio-local-change", emit);
    emit();
    return ()=>{ window.removeEventListener("storage", emit); window.removeEventListener("oio-local-change", emit); };
  },
  async deleteBlock(id){
    if (this.mode === "firebase"){ await _db.collection("blocks").doc(id).delete(); }
    else { this._localSaveBlocks(this._localBlocks().filter(b=>b.id!==id)); }
  },

  /* ---------- الموظتات (إدارة ديناميكية) ---------- */
  async ensureStaff(){
    if (_staffCache) return _staffCache;
    if (this.mode === "firebase"){
      try {
        const snap = await _db.collection("staff").get();
        const out=[]; snap.forEach(d=>out.push({ id:d.id, ...d.data() }));
        out.sort((a,b)=>(a.order||0)-(b.order||0));
        _staffCache = out.length ? out : (SALON.staff||[]).slice();
      } catch(e){ _staffCache = (SALON.staff||[]).slice(); }
    } else {
      const raw = localStorage.getItem("oio_staff");
      _staffCache = raw ? JSON.parse(raw) : (SALON.staff||[]).slice();
      if (!raw) localStorage.setItem("oio_staff", JSON.stringify(_staffCache));
    }
    return _staffCache;
  },
  subscribeStaff(cb){
    if (this.mode === "firebase"){
      return _db.collection("staff").onSnapshot(snap=>{
        const out=[]; snap.forEach(d=>out.push({ id:d.id, ...d.data() }));
        out.sort((a,b)=>(a.order||0)-(b.order||0));
        _staffCache = out.length ? out : (SALON.staff||[]).slice();
        cb(_staffCache);
      });
    }
    const emit=()=>{ const raw=localStorage.getItem("oio_staff"); _staffCache = raw?JSON.parse(raw):(SALON.staff||[]).slice(); cb(_staffCache); };
    window.addEventListener("oio-local-change", emit); emit();
    return ()=>window.removeEventListener("oio-local-change", emit);
  },
  async createStaff({name, color}){
    if (this.mode === "firebase"){
      await _db.collection("staff").add({ name, color: color||"#a96a4a", order: Date.now() });
    } else {
      const arr = await this.ensureStaff();
      arr.push({ id:"stf_"+Date.now(), name, color: color||"#a96a4a" });
      _staffCache = arr; localStorage.setItem("oio_staff", JSON.stringify(arr));
      window.dispatchEvent(new Event("oio-local-change"));
    }
  },
  async updateStaff(id, patch){
    if (this.mode === "firebase"){ await _db.collection("staff").doc(id).update(patch); }
    else {
      const arr = await this.ensureStaff(); const i=arr.findIndex(s=>s.id===id);
      if (i>=0){ arr[i]={...arr[i], ...patch}; _staffCache=arr; localStorage.setItem("oio_staff", JSON.stringify(arr)); window.dispatchEvent(new Event("oio-local-change")); }
    }
  },
  async deleteStaff(id){
    if (this.mode === "firebase"){ await _db.collection("staff").doc(id).delete(); }
    else {
      const arr=(await this.ensureStaff()).filter(s=>s.id!==id);
      _staffCache=arr; localStorage.setItem("oio_staff", JSON.stringify(arr));
      window.dispatchEvent(new Event("oio-local-change"));
    }
  },

  /* ---------- الإعدادات (قابلة للتعديل من اللوحة) ---------- */
  async ensureSettings(){
    if (_settingsLoaded) return SALON;
    let s=null;
    if (this.mode === "firebase"){
      try { const d=await _db.collection("config").doc("main").get(); if (d.exists) s=d.data(); } catch(e){}
    } else {
      const raw=localStorage.getItem("oio_settings"); if (raw) s=JSON.parse(raw);
    }
    if (s) this._applySettings(s);
    _settingsLoaded=true; return SALON;
  },
  _applySettings(s){
    ["name","nameAr","whatsapp","openHour","closeHour","slotMinutes","bookingLeadMin","maxAdvanceDays"]
      .forEach(k=>{ if (s[k]!==undefined && s[k]!=="") SALON[k]= (typeof SALON[k]==="number") ? Number(s[k]) : s[k]; });
    if (Array.isArray(s.closedWeekdays)) SALON.closedWeekdays=s.closedWeekdays;
  },
  async saveSettings(patch){
    this._applySettings(patch);
    if (this.mode === "firebase"){ await _db.collection("config").doc("main").set(patch, {merge:true}); }
    else { const cur=JSON.parse(localStorage.getItem("oio_settings")||"{}"); localStorage.setItem("oio_settings", JSON.stringify({...cur, ...patch})); window.dispatchEvent(new Event("oio-local-change")); }
  },

  /* ---------- المصادقة والأدوار (مديرة / موظفة) ---------- */
  onAuth(cb){
    if (this.mode === "firebase"){
      return _auth.onAuthStateChanged(async u=>{
        if (!u){ cb(null); return; }
        let role="none", staffId=null, name=u.email;
        if (SALON.managerEmail && u.email && u.email.toLowerCase()===SALON.managerEmail.toLowerCase()){
          role="manager"; name="المديرة";
        } else {
          try {
            const d=await _db.collection("users").doc(u.uid).get();
            if (d.exists){ const x=d.data(); role=x.role||"staff"; staffId=x.staffId||null; name=x.name||u.email; }
            // مستخدم بلا سجل صلاحية = لا صلاحية (أمان: يمنع التسجيل المفتوح من الوصول)
          } catch(e){ role="none"; }
        }
        cb({ uid:u.uid, email:u.email, role, staffId, name });
      });
    }
    const emit=()=>{ const raw=sessionStorage.getItem("oio_session"); cb(raw?JSON.parse(raw):null); };
    window.addEventListener("oio-local-change", emit); emit();
    return ()=>window.removeEventListener("oio-local-change", emit);
  },
  async signIn(email, code){
    if (this.mode === "firebase"){
      await _auth.signInWithEmailAndPassword(email, code);
    } else {
      const acc = this._accounts().find(a=>a.code===code);
      if (!acc) throw new Error("رمز الدخول غير صحيح");
      sessionStorage.setItem("oio_session", JSON.stringify({ uid:acc.id, name:acc.name, role:acc.role, staffId:acc.staffId||null }));
      window.dispatchEvent(new Event("oio-local-change"));
    }
  },
  async signOut(){
    if (this.mode === "firebase"){ await _auth.signOut(); }
    else { sessionStorage.removeItem("oio_session"); window.dispatchEvent(new Event("oio-local-change")); }
  },
  async listAccounts(){
    if (this.mode === "firebase"){
      const snap=await _db.collection("users").get(); const out=[]; snap.forEach(d=>out.push({ id:d.id, ...d.data() })); return out;
    }
    return this._accounts().filter(a=>a.role==="staff");
  },
  async createAccount({name, role, staffId, email, code, pass}){
    if (this.mode === "firebase"){
      let sec;
      try { sec = firebase.app("sec"); } catch(e){ sec = firebase.initializeApp(FIREBASE_CONFIG, "sec"); }
      const cred = await sec.auth().createUserWithEmailAndPassword(email, pass);
      await _db.collection("users").doc(cred.user.uid).set({ role:role||"staff", staffId:staffId||null, name, email });
      await sec.auth().signOut();
    } else {
      const arr=this._accounts();
      if (arr.some(a=>a.code===code)) throw new Error("رمز الدخول مستخدم مسبقًا");
      arr.push({ id:"acc_"+Date.now(), name, role:role||"staff", staffId:staffId||null, code });
      localStorage.setItem("oio_accounts", JSON.stringify(arr)); window.dispatchEvent(new Event("oio-local-change"));
    }
  },
  async deleteAccount(id){
    if (this.mode === "firebase"){ await _db.collection("users").doc(id).delete(); }
    else { localStorage.setItem("oio_accounts", JSON.stringify(this._accounts().filter(a=>a.id!==id))); window.dispatchEvent(new Event("oio-local-change")); }
  },
  _accounts(){
    let arr=null; try { arr=JSON.parse(localStorage.getItem("oio_accounts")||"null"); } catch(e){}
    if (!arr){ arr=[{ id:"mgr", name:"المديرة", role:"manager", code:LOCAL_ADMIN_PASSCODE }]; localStorage.setItem("oio_accounts", JSON.stringify(arr)); }
    return arr;
  },

  /* ---------- مساعدات الوضع المحلي ---------- */
  _localAll(){
    try { return JSON.parse(localStorage.getItem("oio_bookings")||"[]"); }
    catch(e){ return []; }
  },
  _localSave(arr){
    localStorage.setItem("oio_bookings", JSON.stringify(arr));
    window.dispatchEvent(new Event("oio-local-change"));
  },
  _localBlocks(){
    try { return JSON.parse(localStorage.getItem("oio_blocks")||"[]"); }
    catch(e){ return []; }
  },
  _localSaveBlocks(arr){
    localStorage.setItem("oio_blocks", JSON.stringify(arr));
    window.dispatchEvent(new Event("oio-local-change"));
  }
};
