# دليل تشغيل نظام الحجوزات — OiO Nail Spa

النظام يعمل من أول لحظة بدون أي إعداد (وضع محلي للتجربة).
لتفعيل **المزامنة السحابية** — بحيث يصل حجز العميلة من جوالها فورًا إلى لوحة الإدارة في الصالون — اتبعي الخطوات التالية (مرّة واحدة فقط، ~٥ دقائق).

---

## ١) إنشاء مشروع Firebase (مجاني)
1. ادخلي على <https://console.firebase.google.com> وسجّلي بحساب Google.
2. اضغطي **Add project** ← سمّيه مثلاً `oio-spa` ← أكملي (يمكن إيقاف Google Analytics).

## ٢) إضافة تطبيق ويب ونسخ الإعدادات
1. داخل المشروع، اضغطي أيقونة الويب **`</>`** (Add app → Web).
2. سمّيه `OiO Web` ← **Register app**.
3. ستظهر شيفرة فيها كائن `firebaseConfig` — انسخي القيم.
4. افتحي ملف **`firebase-config.js`** والصقي القيم في الأعلى:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIza............",
  authDomain:        "oio-spa.firebaseapp.com",
  projectId:         "oio-spa",
  storageBucket:     "oio-spa.appspot.com",
  messagingSenderId: "1234567890",
  appId:             "1:1234567890:web:abc123"
};
```
> هذه القيم عامة وآمنة في كود الواجهة — الحماية تتم عبر قواعد Firestore بالأسفل.

## ٣) تفعيل قاعدة البيانات Firestore
1. من القائمة الجانبية: **Build ← Firestore Database ← Create database**.
2. اختاري **Production mode** ← اختاري المنطقة (مثلاً `eur3` أو الأقرب) ← Enable.
3. افتحي تبويب **Rules** والصقي التالي ثم **Publish**:

> ✏️ استبدلي `manager@oio.com` بالبريد الحقيقي للمديرة (بأحرف صغيرة) في السطر المعلّم.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn(){ return request.auth != null; }
    function hasDoc(){ return exists(/databases/$(database)/documents/users/$(request.auth.uid)); }
    function role(){ return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
    function isManager(){ return signedIn() && (
      (request.auth.token.email != null && request.auth.token.email.lower() == 'manager@oio.com') ||   // ← بريد المديرة
      (hasDoc() && role() == 'manager')
    ); }

    // الحجوزات: تحوي بيانات العميلة — للمنتسبات فقط
    match /bookings/{id} {
      allow create: if isManager() || (request.resource.data.status == 'pending'
                    && request.resource.data.name is string && request.resource.data.phone is string
                    && request.resource.data.date is string && request.resource.data.time is string);
      allow read, update: if signedIn();
      allow delete: if isManager();
    }
    // الجدولة العامة (بلا بيانات شخصية) — يقرأها الموقع لحساب التوفّر
    match /slots/{id} {
      allow read: if true;
      allow create: if request.resource.data.date is string && request.resource.data.time is string;
      allow update, delete: if signedIn();
    }
    // الأوقات المحظورة — يقرأها الموقع، تديرها المنتسبات
    match /blocks/{id} {
      allow read: if true;
      allow create, update, delete: if signedIn();
    }
    // الموظتات (أسماء وألوان فقط) — يقرأها الموقع، تديرها المديرة
    match /staff/{id} {
      allow read: if true;
      allow write: if isManager();
    }
    // حسابات الموظتات وأدوارهنّ — المديرة، وكل موظفة تقرأ سجلها
    match /users/{uid} {
      allow read: if isManager() || (signedIn() && request.auth.uid == uid);
      allow write: if isManager();
    }
    // إعدادات الصالون — يقرأها الموقع، تعدّلها المديرة
    match /config/{id} {
      allow read: if true;
      allow write: if isManager();
    }
  }
}
```

## ٤) تفعيل تسجيل الدخول والأدوار
1. من القائمة: **Build ← Authentication ← Get started** ← فعّلي مزوّد **Email/Password**.
2. تبويب **Users ← Add user**: أدخلي بريد وكلمة مرور **المديرة** (مثال: `manager@oio.com`).
3. في ملف **`firebase-config.js`** اضبطي بريد المديرة داخل `SALON`:
   ```js
   managerEmail: "manager@oio.com",   // نفس البريد، وبأحرف صغيرة في القواعد أعلاه
   ```
   بهذا تُمنح المديرة الصلاحية الكاملة تلقائيًا.

> **حسابات الموظتات تُنشأ من اللوحة نفسها** — لا حاجة لـ Firebase Console:
> ادخلي كمديرة ← تبويب **الموظتات** ← «إنشاء صفحة دخول» لكل موظفة (بريد وكلمة مرور).
> كل موظفة تدخل بصفحتها فترى **مواعيدها هي فقط**. أي تسجيل دخول بلا صلاحية يُرفض تلقائيًا.

## ٥) رفع الموقع
ارفعي الملفات إلى المستودع كالمعتاد:
```bash
git add -A
git commit -m "تفعيل نظام الحجوزات السحابي"
git push
```
بعد دقيقة سيُحدّث GitHub Pages تلقائيًا.

---

## كيف يعمل النظام؟
- **الموقع (`index.html`):** زر «احجزي موعدك» يفتح معالج من ٤ خطوات. الأوقات المتاحة تُحسب تلقائيًا حسب **مدة الخدمة + الحجوزات القائمة + الأوقات المحظورة + عدد الفنيات**، فلا يظهر إلا الوقت الذي تتوفّر فيه فنية فعلًا. عند التأكيد يُحفظ الحجز ويُسند لأول فنية متاحة، ويصل رقم تأكيد للعميلة. واتساب يظهر كخيار اختياري.
- **لوحة الإدارة (`admin.html`):** فيها عرضان:
  - **📅 التقويم:** جدول زمني بأعمدة الفنيات × الوقت (مثل تطبيقات الحجز)، يعرض المواعيد في أماكنها بالألوان حسب الحالة، مع خط الوقت الحالي والتنقّل بين الأيام. اضغطي على **موعد** لعرض تفاصيله وتغيير حالته/فنيته/حذفه، وعلى **مساحة فارغة** (أو زر «＋ حظر وقت») لتعليم وقت **غير متاح** — وعندها يختفي فورًا من الأوقات المتاحة في الموقع.
  - **📋 القائمة:** كل الحجوزات لحظيًا مع إحصائيات، فلترة بالحالة والتاريخ، بحث، أزرار الحالة، اتصال/واتساب مباشر، وتصدير CSV.
  - الرابط موجود أسفل الموقع بكلمة «إدارة».

## إعدادات يمكن تعديلها (في `firebase-config.js`)
داخل كائن `SALON`:
- `whatsapp` — رقم واتساب الصالون.
- `openHour` / `closeHour` — بداية ونهاية الدوام.
- `slotMinutes` — الفاصل بين المواعيد (افتراضي ٣٠ دقيقة).
- `staff` — قائمة الفنيات (الاسم واللون). **عدد الفنيات = عدد الحجوزات الممكنة في نفس الوقت**، وكل فنية تظهر كعمود في تقويم الإدارة. أضيفي/احذفي/عدّلي الأسماء بحرية.
- `slotCapacity` — احتياطي يُستخدم فقط إن تركتِ `staff` فارغة.
- `closedWeekdays` — أيام الإغلاق، مثال للجمعة: `[5]` (0=الأحد .. 6=السبت).
- `bookingLeadMin` — أقل مهلة قبل الموعد (افتراضي ٦٠ دقيقة).
- `maxAdvanceDays` — أبعد مدى للحجز المسبق.

كذلك يمكن تعديل الأسعار/الخدمات من `SERVICE_GROUPS`.

## الوضع المحلي (بدون Firebase)
إن تركتِ `FIREBASE_CONFIG` فارغًا، يعمل النظام محليًا على الجهاز نفسه فقط (للتجربة)،
ورمز دخول لوحة الإدارة الافتراضي: **`oio2026`** (غيّريه من `LOCAL_ADMIN_PASSCODE`).
