import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Download,
  ExternalLink,
  BookOpen,
  Code2,
  Cpu,
  Layers,
  CheckCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export function SystemSpecModal() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [copied, setCopied] = useState(false);

  const pdfUrl = "/PS1_Oil_Depot_System_Architecture_and_Specification.pdf";

  const handleCopyLink = () => {
    const fullUrl = window.location.origin + pdfUrl;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success(isRtl ? "تم نسخ رابط ملف PDF إلى الحافظة" : "PDF link copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-full border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold shadow-sm text-xs sm:text-sm"
        >
          <BookOpen className="h-4 w-4" />
          <span>{isRtl ? "الوثيقة الفنية الكاملة (PDF)" : "Full Technical Spec (PDF)"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  {isRtl
                    ? "الوثيقة الفنية والمعمارية الشاملة لتطبيق مستودع ومحطة PS-1"
                    : "PS-1 Oil Depot Complete Technical & Architectural Specification"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {isRtl
                    ? "الدليل الهندسي الكامل لإعادة بناء التطبيق على أي منصة أخرى (Flutter, C#, Python, React)"
                    : "Complete engineering blueprint to recreate the app on any platform (Flutter, .NET, Python, etc.)"}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-1.5 text-xs"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>
                  {copied ? (isRtl ? "تم النسخ" : "Copied") : isRtl ? "نسخ الرابط" : "Copy Link"}
                </span>
              </Button>
              <Button
                asChild
                size="sm"
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <a
                  href={pdfUrl}
                  download="PS1_Oil_Depot_System_Architecture_and_Specification.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="h-4 w-4" />
                  <span>{isRtl ? "تحميل ملف PDF (8 صفحات)" : "Download PDF (8 pages)"}</span>
                </a>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 text-sm">
          {/* Hero Banner */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-300">
                {isRtl
                  ? "ملف PDF الجاهز للتحميل متوفر الآن"
                  : "Official Technical Specification PDF is Ready"}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {isRtl
                  ? "يحتوي الملف على 8 صفحات تفصيلية تتضمن كل المعادلات، الخوارزميات، هياكل البيانات، وجميع ملفات المشروع."
                  : "Includes 8 comprehensive pages covering all engineering formulas, data models, schemas, and file manifests."}
              </p>
            </div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shrink-0 shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{isRtl ? "فتح ومعاينة ملف PDF" : "Open & Preview PDF"}</span>
            </a>
          </div>

          <Tabs defaultValue="equations" className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="equations" className="text-xs">
                {isRtl ? "المعادلات الرياضية" : "Math Equations"}
              </TabsTrigger>
              <TabsTrigger value="features" className="text-xs">
                {isRtl ? "المميزات والوظائف" : "Core Features"}
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs">
                {isRtl ? "هيكل الملفات" : "File Manifest"}
              </TabsTrigger>
              <TabsTrigger value="porting" className="text-xs">
                {isRtl ? "إرشادات النقل (Porting)" : "Porting Guide"}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: EQUATIONS */}
            <TabsContent value="equations" className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/20">
                <h5 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>1. معادلة حجم المخزون من المنسوب (Tank Strapping Formula)</span>
                </h5>
                <code className="block bg-background p-3 rounded border text-xs font-mono text-emerald-700 dark:text-emerald-400">
                  V_stock = ( Σ Levels × 43.0 ) − ( 600 × ActiveTanksCount )
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  • 43.0 M³ لكل سنتيمتر من المنسوب.
                  <br />• 600 M³ تعويض إزاحة السقف العائم ونقطة الصفر Datum لكل خزان فيه قراءة.
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-muted/20">
                <h5 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>2. معادلة موازنة محطة الضخ (Mass Conservation & Pipe Balancing)</span>
                </h5>
                <code className="block bg-background p-3 rounded border text-xs font-mono text-emerald-700 dark:text-emerald-400">
                  Q_WQ = Σ Q_pump + ( Σ ΔLevels × 43.0 ) − Σ Q_other_receive
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  تحسب التدفق الفعلي التلقائي لخط غرب القرنة أو أي خط موازنة بدقة من التغير التراكمي
                  لمناسيب الخزانات وإجمالي الضخ.
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-muted/20">
                <h5 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>3. معادلات الكثافة والـ API والضغط الهيدروستاتيكي</span>
                </h5>
                <div className="space-y-2">
                  <code className="block bg-background p-2 rounded border text-xs font-mono">
                    SG @ 60°F = 141.5 / ( API + 131.5 )
                  </code>
                  <code className="block bg-background p-2 rounded border text-xs font-mono">
                    Density (kg/m³) = SG × 999.016
                  </code>
                  <code className="block bg-background p-2 rounded border text-xs font-mono">
                    P_bottom = ( ρ × g × h ) + P_atm
                  </code>
                  <code className="block bg-background p-2 rounded border text-xs font-mono">
                    Barrels = M³ × 6.2898108
                  </code>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: FEATURES */}
            <TabsContent value="features" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="border p-3 rounded-lg bg-card space-y-1">
                  <div className="font-bold text-primary">1. إدارة 10 خزانات رئيسية + مخصصة</div>
                  <p className="text-muted-foreground">
                    مراقبة B1..B2، K1..K4، R1..R4 مع حساب السعة الحرة والفراغ والمخزون الميت (70,000
                    M³).
                  </p>
                </div>
                <div className="border p-3 rounded-lg bg-card space-y-1">
                  <div className="font-bold text-primary">2. جدول القراءات الساعية (13 وردية)</div>
                  <p className="text-muted-foreground">
                    كل ساعتين من 00:00 إلى 24:00 مع حساب فروقات المناسيب والتنبيه التلقائي للنواقص.
                  </p>
                </div>
                <div className="border p-3 rounded-lg bg-card space-y-1">
                  <div className="font-bold text-primary">3. شبكة 8 خطوط استلام و 3 خطوط ضخ</div>
                  <p className="text-muted-foreground">
                    شمال الرميلة، القرنة، اللحيس، مشرف، الفاو، الخط الستراتيجي، مع الموازنة
                    التلقائية.
                  </p>
                </div>
                <div className="border p-3 rounded-lg bg-card space-y-1">
                  <div className="font-bold text-primary">4. مخطط الجريان P&ID ولوحة 50+ صمام</div>
                  <p className="text-muted-foreground">
                    عرض تفاعلي لمخطط العمليات، حالات الصمامات الكهربائية واليدوية، والتوربينات
                    القديمة والجديدة.
                  </p>
                </div>
                <div className="border p-3 rounded-lg bg-card space-y-1">
                  <div className="font-bold text-primary">5. ماسح OCR الذكي لقراءة العدادات</div>
                  <p className="text-muted-foreground">
                    قراءة أشرطة القياس وعدادات الضغط بالكاميرا عبر محرك Tesseract.js محلياً.
                  </p>
                </div>
                <div className="border p-3 rounded-lg bg-card space-y-1">
                  <div className="font-bold text-primary">6. مفتاح وضع التدريب والمحاكاة</div>
                  <p className="text-muted-foreground">
                    عزل كامل لبيانات التدريب عن التشغيل الحقيقي مع تنبيه بصري مستمر.
                  </p>
                </div>
                <div className="border p-3 rounded-lg bg-card space-y-1">
                  <div className="font-bold text-primary">7. منشئ التقارير المخصصة والـ BOC</div>
                  <p className="text-muted-foreground">
                    تصفية حسب نوع النفط، الوردية، وتصدير PDF/CSV/Excel احترافي مطابق لشركة نفط
                    البصرة.
                  </p>
                </div>
                <div className="border p-3 rounded-lg bg-card space-y-1">
                  <div className="font-bold text-primary">8. نظام الإغلاق الآمن للطوارئ ESD</div>
                  <p className="text-muted-foreground">
                    ثلاثة مستويات طوارئ مع إنذار صوتي وإغلاق صمامات السحب والدفع التلقائي.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: FILES */}
            <TabsContent value="files" className="space-y-3">
              <div className="rounded-lg border overflow-hidden text-xs">
                <table className="w-full text-left rtl:text-right border-collapse">
                  <thead className="bg-muted font-bold text-muted-foreground">
                    <tr>
                      <th className="p-2.5">المسار</th>
                      <th className="p-2.5">الوظيفة الأساسية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-2 font-mono text-primary font-bold">
                        src/lib/calculations.ts
                      </td>
                      <td className="p-2">محرك الحسابات والمعادلات، عوامل التحويل والموازنة</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-primary font-bold">
                        src/lib/reports.ts & db.ts
                      </td>
                      <td className="p-2">
                        تخزين التقارير وسجل التدقيق في IndexedDB و LocalStorage
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-primary font-bold">
                        src/lib/custom-report-exporter.ts
                      </td>
                      <td className="p-2">تصدير التقارير المخصصة لـ PDF, CSV, Excel</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-primary font-bold">
                        src/lib/initial-valves.ts
                      </td>
                      <td className="p-2">قاعدة بيانات أكثر من 50 صمام ومواقعها وتوصيفها الفني</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-primary font-bold">src/routes/index.tsx</td>
                      <td className="p-2">لوحة التحكم الرئيسية والخزانات وجداول التدفق</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-primary font-bold">
                        src/routes/reports.tsx
                      </td>
                      <td className="p-2">مركز التقارير المخصصة والأرشيف التاريخي</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-primary font-bold">
                        src/routes/boc-report.tsx
                      </td>
                      <td className="p-2">التقرير الرسمي المعتمد لشركة نفط البصرة</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-primary font-bold">capacitor.config.ts</td>
                      <td className="p-2">إعدادات بناء تطبيق الموبايل لنظام Android</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 4: PORTING */}
            <TabsContent value="porting" className="space-y-3 text-xs leading-relaxed">
              <div className="border p-3 rounded-lg bg-card">
                <div className="font-bold text-primary mb-1">إعادة البناء على Flutter:</div>
                <p className="text-muted-foreground">
                  استخدم Dart Math مع نقل ملف calculations.ts مباشرة، واستعمل مكتبة Hive لقاعدة
                  البيانات المحلية، ومكتبة syncfusion_flutter_pdf لتوليد ملفات الـ PDF بنفس التخطيط،
                  و google_mlkit_text_recognition للـ OCR.
                </p>
              </div>
              <div className="border p-3 rounded-lg bg-card">
                <div className="font-bold text-primary mb-1">
                  إعادة البناء على C# / .NET (WPF / MAUI):
                </div>
                <p className="text-muted-foreground">
                  أنشئ C# Class Library للمعادلات، واستعمل SQLite مع EF Core للتخزين، و QuestPDF
                  لتوليد التقارير بجودة عالية، و LiveCharts2 للرسوم البيانية التفاعلية.
                </p>
              </div>
              <div className="border p-3 rounded-lg bg-card">
                <div className="font-bold text-primary mb-1">
                  إعادة البناء على Python (PyQt / SCADA):
                </div>
                <p className="text-muted-foreground">
                  استخدم NumPy للمصفوفات الحسابية والموازنة، و ReportLab لملفات الـ PDF، و
                  PyTesseract لمعالجة صور العدادات عبر OpenCV.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
