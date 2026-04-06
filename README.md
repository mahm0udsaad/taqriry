# تقريرك — منصة تحليل التقارير بالذكاء الاصطناعي

## نظرة عامة

نموذج أولي (MVP) لمنصة SaaS تتيح للمستخدمين التفاعل مع تقاريرهم بصيغة PDF عبر محادثة ذكية باللغة العربية. يمكن للمستخدم طرح أسئلة، تلخيص، مقارنة، واستخراج البيانات من التقارير.

## المميزات

- محادثة ذكية مع ملفات PDF باللغة العربية
- تلخيص التقارير واستخراج النقاط الرئيسية
- مقارنة عدة تقارير واستخراج أوجه التشابه والاختلاف
- استخراج الأرقام والإحصائيات والبيانات المهمة
- واجهة عربية كاملة مع دعم RTL ومعايير الوصول WCAG AA
- بث الردود في الوقت الفعلي (Streaming)
- اختيار متعدد للتقارير مع تخزين مؤقت ذكي

## التقنيات المستخدمة

| التقنية | الغرض |
|---|---|
| Next.js 16 (App Router) | إطار العمل الرئيسي |
| TypeScript | السلامة النوعية |
| Tailwind CSS v4 | التنسيق |
| Vercel AI SDK v6 | إدارة المحادثة والبث |
| @ai-sdk/google | مزود Gemini |
| @google/genai | رفع ملفات PDF إلى Gemini Files API |
| Lucide React | الأيقونات |
| IBM Plex Sans Arabic | الخط العربي |

## التشغيل المحلي

```bash
# تثبيت المكتبات
pnpm install

# إعداد المتغيرات البيئية
cp .env.example .env.local
# أضف مفتاح Gemini API في .env.local

# تشغيل خادم التطوير
pnpm dev
```

ثم افتح [http://localhost:3000](http://localhost:3000)

## هيكل المشروع

```
src/
  app/
    api/chat/route.ts     # نقطة نهاية المحادثة (streaming)
    globals.css            # رموز التصميم (design tokens)
    layout.tsx             # التخطيط الرئيسي (RTL + خط عربي)
    page.tsx               # الصفحة الرئيسية (تجميع المكونات)
  components/
    chat-input.tsx         # شريط إدخال الرسائل
    chat-messages.tsx      # عرض المحادثة
    report-library.tsx     # مكتبة التقارير (sidebar)
  lib/
    cn.ts                  # أداة دمج الأصناف (clsx + tailwind-merge)
    gemini.ts              # مزود Gemini + رفع PDF + تخزين مؤقت
    reports.ts             # بيانات التقارير (manifest)
public/
  reports/                 # ملفات PDF
```

## البنية التقنية

```
العميل (useChat) → POST /api/chat → streamText (Vercel AI SDK)
                                          ↓
                                   Gemini Files API (PDF مخزن مؤقتا)
                                          ↓
                                   Gemini 2.5 Flash (بث الرد)
```

- يتم رفع ملفات PDF مرة واحدة فقط عبر Gemini Files API
- يتم تخزين عنوان الملف (URI) في ذاكرة الخادم
- الرسائل اللاحقة تستخدم العنوان المخزن بدون إعادة الرفع

## مسار التطوير

كيف يتوسع هذا النموذج إلى منصة كاملة تدعم 30,000+ تقرير:

| المرحلة | الحالية | المستقبلية |
|---|---|---|
| التخزين | مجلد /public | Supabase Storage / S3 |
| قاعدة البيانات | ملف JSON ثابت | PostgreSQL (Supabase) |
| البحث | سياق PDF كامل | Vector embeddings للبحث الدلالي |
| المصادقة | بدون | Supabase Auth / Auth0 |
| الاشتراكات | بدون | Stripe / Moyasar مع webhooks |
| الأداء | تخزين مؤقت في الذاكرة | Edge caching + CDN + ISR |
| المراقبة | console.error | Sentry + structured logging |

## المتغيرات البيئية

| المتغير | الوصف | مطلوب |
|---|---|---|
| `GEMINI_API_KEY` | مفتاح Google Gemini API | نعم |
| `GEMINI_MODEL` | اسم النموذج (افتراضي: gemini-2.5-flash) | لا |
| `NEXT_PUBLIC_APP_NAME` | اسم التطبيق المعروض | لا |
| `NEXT_PUBLIC_APP_URL` | عنوان التطبيق | لا |
# taqriry
