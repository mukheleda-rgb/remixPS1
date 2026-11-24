import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { 
  AlertOctagon, 
  ShieldAlert, 
  Siren, 
  Check, 
  FileWarning 
} from 'lucide-react';

interface TankAlert {
  tank: string;
  level: number;
  limit: number;
  kind: 'low' | 'high';
}

interface Props {
  alerts: TankAlert[];
  pipeLabels?: Record<string, string>;
}

export const EmergencyControlPanel: React.FC<Props> = ({ alerts, pipeLabels = {} }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const activeAlertsCount = alerts.length;

  // Hardcoded SOP Troubleshooting Procedures for PS1
  const getEmergencySOP = (alert: TankAlert) => {
    const name = pipeLabels[alert.tank] || alert.tank;
    
    if (alert.kind === 'high') {
      return {
        title: isRtl ? `خطر ارتفاع منسوب خزان المحطة ${name}` : `Critical High Level Alarm - Tank ${name}`,
        actions: isRtl ? [
          `تنبيه تشغيل الخط الاستراتيجي: قم بزيادة معدل الصبيب والضخ الخارجي من مجمعات PS1 فوراً لتقليل الضغط.`,
          `غرفة الصمامات XV: تأكد من تحويل وتوجيه التدفق الزائد في المشاعب إلى الخزانات ذات القدرة الاستيعابية الاحتياطية (R1, R2).`,
          `تقليل الاستلام تلقائياً: اطلب من شعبة استلام النفط بالخطوط الإقليمية تقنين معدل الدفق من خطوط النفط المغذية بالتنسيق مع المشغلين المباشرين.`
        ] : [
          `Increase external discharge and pumping rates from PS1 manifolds immediately to relieve level buildup.`,
          `Relocate excess intake stream line headers to backup storage units (Tanks R1, R2, R4).`,
          `Coordinate with the regional incoming pipelines dispatcher to reduce incoming flow rates immediately.`
        ]
      };
    } else {
      return {
        title: isRtl ? `تنبيه هبوط منسوب خزان المحطة ${name} (فراغ خطر)` : `Critical Low Level Alarm - Tank ${name}`,
        actions: isRtl ? [
          `حظر الضخ التراكمي: قلل سرعة المضخات الرئيسية أو أوقف مضخة الصبيب المشغولة لتفادي حدوث "التجويف الهوائي" (Cavitation).`,
          `الفحص البصري للمحيط: تواصل مع فريق المراقبة الميداني لفحص أنبوبة القاع والصمام اللاراجعي وصمام التفريغ في حيز الخزان ${name} لمنع النفاد التام للنفط.`,
          `فصل الطوارئ الآمن: في حالة استمرار انخفاض المنسوب عن الحد الخطر، قم بفصل الخطوط المتصلة تفادياً لسحب ترسبات قاع الخزان.`
        ] : [
          `Throttle or shut down active high-pressure booster pumps connected to this tank to prevent air cavitation in the pumps.`,
          `Request field mechanical operators to visually inspect the emergency bottom dump valve and anti-backflow valves.`,
          `If levels continue to decline below emergency thresholds, isolate lines to prevent pulling heavy bottom sludge into main pumps.`
        ]
      };
    }
  };

  return (
    <Card className={`overflow-hidden transition-all duration-300 shadow-elegant border-2 ${
      activeAlertsCount > 0 
        ? 'border-rose-500/80 dark:border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 animate-pulse-subtle' 
        : 'border-border/40 bg-card'
    }`}>
      <CardHeader className={`pb-4 flex flex-row items-center justify-between space-y-0 ${
        activeAlertsCount > 0 ? 'bg-rose-500/10' : 'bg-muted/30'
      }`}>
        <div className="flex items-center gap-2">
          {activeAlertsCount > 0 ? (
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </div>
          ) : (
            <ShieldAlert className="h-5 w-5 text-emerald-500" />
          )}
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Siren className={`h-4 w-4 ${activeAlertsCount > 0 ? 'text-rose-500 animate-bounce' : 'text-muted-foreground'}`} />
              {isRtl ? 'غرفة الطوارئ ونظام الأمان والمراقبة البصرية ومستويات الخزانات' : 'Visual Emergency Safety Center & Tank Boundary Security'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isRtl ? 'حماية تشغيلية وفحص تلقائي لحظي للحدود الأمنية لمستويات الخزانات' : 'Operational boundary security with auto safety checks and instant recovery guidelines'}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {activeAlertsCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-border/80 rounded-xl bg-muted/10">
            <Check className="h-10 w-10 text-emerald-500 rounded-full bg-emerald-100 dark:bg-emerald-950 p-2 mb-2" />
            <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {isRtl ? 'جميع المؤشرات ضمن النطاقات الآمنة' : 'All Tank Metrics in Safe Zone'}
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {isRtl ? 'لا توجد إنذارات نشطة حالياً. معدلات الاستلام والضخ مستقرة.' : 'No active alerts. Flow inputs and pump outputs are perfectly safe.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Alarm List */}
            <div className="grid gap-2">
              {alerts.map((a, i) => {
                const label = pipeLabels[a.tank] || a.tank;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/40">
                    <AlertOctagon className="h-5 w-5 text-rose-500 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground flex items-center gap-2">
                        <span>{isRtl ? `إنذار أمان خزان ${label}` : `Critical Alarm Tank ${label}`}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          a.kind === 'high' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {a.kind === 'high' ? (isRtl ? 'خطر امتلاء كلي' : 'HIGH') : (isRtl ? 'خطر جفاف قاع الخيار' : 'LOW')}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {isRtl 
                          ? `المستوى الحالي ${a.level} سم — خارج النطاق الأمن (${a.kind === 'high' ? 'أعلى من' : 'أقل من'} ${a.limit} سم)`
                          : `Level is ${a.level} cm — out of safe range (limit: ${a.limit} cm)`
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SOP Guides */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold flex items-center gap-1.5 border-b pb-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                {isRtl ? 'بروتوكولات ودليل التدخل الطارئ الفوري (PS1 SOP)' : 'Standard Operating Procedures - Emergency Actions'}
              </h4>
              
              <div className="grid gap-4 md:grid-cols-2">
                {alerts.map((a, i) => {
                  const sop = getEmergencySOP(a);
                  return (
                    <div key={i} className="rounded-xl border border-border bg-background p-4 space-y-2">
                      <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <FileWarning className="h-3.5 w-3.5 text-rose-500" />
                        {sop.title}
                      </h5>
                      <ul className="space-y-1.5 pl-1">
                        {sop.actions.map((act, idx) => (
                          <li key={idx} className="text-[11px] text-muted-foreground flex gap-2">
                            <span className="text-rose-500 font-bold shrink-0">{isRtl ? `•` : `-`}</span>
                            <span className="leading-relaxed">{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
