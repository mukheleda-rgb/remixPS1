import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Printer, Download, FileText, Share2, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { savePdf, sharePdf } from "@/lib/native-save";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { 
  Reading, 
  FlowRow, 
  defaultReadings, 
  defaultFlowRows, 
  compute, 
  computeFlow, 
  flowGrandTotal, 
  M3_TO_BARREL, 
  TOTAL_CAPACITY_M3, 
  VISIBLE_TANKS, 
  RECEIVE_PIPES, 
  PUMP_PIPES,
  fmt
} from "@/lib/calculations";

export default function BOCReport() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const today = format(new Date(), "yyyy/MM/dd");
  const dayName = format(new Date(), "EEEE");

  const [readings] = useLocalStorageState<Reading[]>("ps1-readings", defaultReadings());
  const [customTanks] = useLocalStorageState<string[]>("ps1-custom-tanks", []);
  const [tankBoosts] = useLocalStorageState<Record<string, number>>("ps1-tank-boosts", {});
  const [receiveRows] = useLocalStorageState<FlowRow[]>("ps1-receive", defaultFlowRows(RECEIVE_PIPES));
  const [pumpRows] = useLocalStorageState<FlowRow[]>("ps1-pump", defaultFlowRows(PUMP_PIPES));
  const [balancedPipe] = useLocalStorageState<string>("ps1-balanced-pipe", "WQ");
  const [pipeLabels] = useLocalStorageState<Record<string, string>>("ps1-pipe-labels", {});

  const bonusCapacity = useMemo(() => Object.values(tankBoosts).reduce((a, b) => a + b, 0), [tankBoosts]);
  const rows = useMemo(() => compute(readings, customTanks, bonusCapacity), [readings, customTanks, bonusCapacity]);
  
  const pumpComputed = useMemo(() => computeFlow(pumpRows, PUMP_PIPES), [pumpRows]);

  const balancedValues = useMemo(() => {
    if (!balancedPipe) return null;
    const otherReceive = RECEIVE_PIPES.filter((p) => p !== balancedPipe);
    
    return receiveRows.map((_, idx) => {
      const curComp = rows[idx + 1];
      const pumpSum = PUMP_PIPES.reduce((a, p) => a + (pumpRows[idx]?.values[p] ?? 0), 0);
      const otherRecvSum = otherReceive.reduce((a, p) => a + (receiveRows[idx]?.values[p] ?? 0), 0);
      
      const prevReading = readings[idx];
      const curReading = readings[idx + 1];
      let levelDiffSum = 0;
      if (prevReading && curReading) {
        const allKeys = [...VISIBLE_TANKS, ...customTanks];
        for (const k of allKeys) {
          const b = prevReading.levels[k];
          const a = curReading.levels[k];
          if (a != null && b != null) {
            levelDiffSum += a - b;
          }
        }
      }
      
      const wqResult = pumpSum + (levelDiffSum * 43) - otherRecvSum;
      const hasData = 
        pumpSum !== 0 || 
        otherRecvSum !== 0 || 
        (curComp?.totalStockM3 != null && rows[idx]?.totalStockM3 != null);
         
      if (!hasData) return null;
      return Math.round(wqResult * 100) / 100;
    });
  }, [balancedPipe, receiveRows, pumpRows, rows, readings, customTanks]);

  const receiveComputed = useMemo(() => 
    computeFlow(
      receiveRows,
      RECEIVE_PIPES,
      balancedPipe && balancedValues ? { [balancedPipe]: balancedValues } : undefined
    ),
    [receiveRows, balancedValues, balancedPipe]
  );

  const totalReceiveM3 = useMemo(() => flowGrandTotal(receiveComputed, RECEIVE_PIPES), [receiveComputed]);
  const totalPumpM3 = useMemo(() => flowGrandTotal(pumpComputed, PUMP_PIPES), [pumpComputed]);

  // Find latest reading with data
  const latestReadingIndex = useMemo(() => {
    for (let i = readings.length - 1; i >= 0; i--) {
      const hasData = Object.values(readings[i].levels).some((v) => v !== null);
      if (hasData) return i;
    }
    return 0;
  }, [readings]);

  const latestReading = readings[latestReadingIndex];
  const latestRow = rows[latestReadingIndex];

  // List of all active tanks in the system
  const allTanks = useMemo(() => [...VISIBLE_TANKS, ...customTanks], [customTanks]);

  const lbl = (s: string) => pipeLabels[s] || s;

  const handlePrint = () => window.print();

  const preparePdf = async () => {
    const [{ jsPDF }, h2cMod] = await Promise.all([import("jspdf"), import("html2canvas-pro")]);
    const html2canvas = (h2cMod as { default: typeof import("html2canvas-pro").default }).default;
    
    const reportElement = document.getElementById("boc-report-content");
    if (!reportElement) throw new Error("Report element not found");

    const canvas = await html2canvas(reportElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    // const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 24; // Margin
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 12, 12, imgWidth, imgHeight);
    return pdf;
  };

  const handleExport = async () => {
    const toastId = toast.loading(isRtl ? "جاري تحضير الملف..." : "Preparing download...");
    try {
      const pdf = await preparePdf();
      const fileStamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      await savePdf(pdf, `PS1-Daily-Summary-${fileStamp}.pdf`);
      toast.success(isRtl ? "تم التحميل بنجاح" : "Download successful", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "خطأ في التحميل" : "Download error", { id: toastId });
    }
  };

  const handleShare = async () => {
    const toastId = toast.loading(isRtl ? "جاري تحضير المشاركة..." : "Preparing share...");
    try {
      const pdf = await preparePdf();
      const fileStamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      await sharePdf(pdf, `PS1-Daily-Summary-${fileStamp}.pdf`);
      toast.dismiss(toastId);
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? "خطأ في المشاركة" : "Share error", { id: toastId });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1100px] mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between no-print overflow-x-auto pb-2 gap-4">
        <div className="flex items-center gap-4 shrink-0">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/">
              {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Link>
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ExternalLink className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              {isRtl ? "توليد التقرير اليومي الرسمي" : "Generate Official Daily Report"}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">{t("reports.boc_title")}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> {isRtl ? "طباعة" : "Print"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" /> {isRtl ? "مشاركة" : "Share"}
          </Button>
          <Button size="sm" onClick={handleExport} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
            <Download className="h-4 w-4" /> {isRtl ? "تحميل PDF" : "Download PDF"}
          </Button>
        </div>
      </div>

      <Card id="boc-report-content" className="p-10 border-2 shadow-2xl bg-white text-slate-950 overflow-x-auto min-w-[950px] print:shadow-none print:border-none print:p-0 font-sans" dir="ltr">
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8 border-b-2 border-slate-900 pb-6">
          <div className="flex w-full justify-between items-start mb-4">
            <div className="text-left flex-1">
              <div className="flex flex-col gap-1 mt-2 text-xs font-bold text-slate-600">
                <span>Date: {today}</span>
                <span>Day: {dayName}</span>
                <span>Latest Reading Hour: {latestReading?.hour || "—"}</span>
              </div>
            </div>
            <div className="text-center flex-1 font-sans">
              <h1 className="text-3xl font-black border-b-2 border-slate-900 pb-1 mb-1 tracking-wider text-slate-900">PS-1</h1>
              <p className="text-[10px] font-black leading-none tracking-[0.2.5em] font-mono text-slate-500 uppercase">Pumping Station One Summary</p>
            </div>
            <div className="flex-1 flex justify-end">
               <div className="h-14 w-14 bg-slate-50 rounded-lg flex items-center justify-center border-2 border-slate-200">
                  <FileText className="h-8 w-8 text-slate-400" />
               </div>
            </div>
          </div>
          <h2 className="text-lg font-black bg-slate-900 text-white px-10 py-1.5 rounded-sm uppercase tracking-wide font-sans">
             Daily Operations Summary - 24 Hours
          </h2>
        </div>

        {/* Global Summary Stats (M3 / BBL) */}
        <div className="grid grid-cols-2 gap-4 mb-6">
           <div className="border-2 border-slate-900 rounded-sm">
              <div className="bg-slate-100 border-b-2 border-slate-900 p-1.5 text-center font-black text-xs uppercase tracking-wider text-slate-700">Stock & Flow (Cubic Meters - M³)</div>
              <div className="grid grid-cols-5 divide-x divide-slate-300">
                 {[
                   { label: "Tot. Rec", val: totalReceiveM3 },
                   { label: "Tot. Pump", val: totalPumpM3 },
                   { label: "Tot. Stock", val: latestRow?.totalStockM3 ?? 0 },
                   { label: "Avail", val: latestRow?.availPumpM3 ?? 0 },
                   { label: "Free Vol", val: latestRow?.freeVolumeM3 ?? 0 }
                 ].map(item => (
                   <div key={item.label} className="flex flex-col items-center p-2">
                       <span className="text-[8px] font-black text-slate-500 uppercase">{item.label}</span>
                       <span className="text-xs font-mono font-bold mt-1 text-slate-900">{fmt(item.val)}</span>
                   </div>
                 ))}
              </div>
           </div>
           <div className="border-2 border-slate-900 rounded-sm">
              <div className="bg-slate-100 border-b-2 border-slate-900 p-1.5 text-center font-black text-xs uppercase tracking-wider text-slate-700">Stock & Flow (Barrels - BBL)</div>
              <div className="grid grid-cols-5 divide-x divide-slate-300">
                 {[
                   { label: "Tot. Rec (BBL)", val: totalReceiveM3 * M3_TO_BARREL },
                   { label: "Tot. Pump (BBL)", val: totalPumpM3 * M3_TO_BARREL },
                   { label: "Tot. Stock (BBL)", val: (latestRow?.totalStockM3 ?? 0) * M3_TO_BARREL },
                   { label: "Avail (BBL)", val: (latestRow?.availPumpM3 ?? 0) * M3_TO_BARREL },
                   { label: "Free Vol (BBL)", val: (latestRow?.freeVolumeM3 ?? 0) * M3_TO_BARREL }
                 ].map(item => (
                   <div key={item.label} className="flex flex-col items-center p-2">
                       <span className="text-[8px] font-black text-slate-500 uppercase">{item.label.split(" ")[0]}</span>
                       <span className="text-xs font-mono font-bold mt-1 text-slate-900">{fmt(item.val)}</span>
                   </div>
                 ))}
              </div>
           </div>
         </div>

        {/* Main Content Sections */}
        <div className="grid grid-cols-12 gap-0 border-2 border-slate-900 min-h-[400px]">
           
           {/* Section 1: Tank Position (4/12) */}
           <div className="col-span-4 border-e-2 border-slate-900 flex flex-col">
              <div className="bg-slate-900 text-white p-2 text-center font-black text-[11px] uppercase tracking-wide">
                Tank Inventory Status ({latestReading?.hour || "Latest"})
              </div>
              <table className="w-full text-[10px] border-collapse flex-1 bg-white">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-50 font-black">
                    <th className="border-e p-1.5 w-12">Tank</th>
                    <th className="border-e p-1.5">Level (mm)</th>
                    <th className="p-1.5 text-right w-20">Stock (m³)</th>
                    <th className="p-1.5 text-right w-20 border-s">BBL</th>
                  </tr>
                </thead>
                <tbody>
                  {allTanks.map((tk) => {
                    const lVal = latestReading?.levels[tk] ?? null;
                    const stockVal = lVal !== null ? (lVal * 43) - 600 : null;
                    const barrelVal = stockVal !== null ? stockVal * M3_TO_BARREL : null;
                    return (
                      <tr key={tk} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="border-e p-1.5 font-black text-center bg-slate-50/50">{tk}</td>
                        <td className="border-e p-1.5 text-center font-mono">{fmt(lVal)}</td>
                        <td className="p-1.5 text-right font-mono text-slate-800">{fmt(stockVal)}</td>
                        <td className="p-1.5 text-right font-mono text-slate-800 border-s">{fmt(barrelVal)}</td>
                      </tr>
                    );
                  })}
                  {/* Fill empty space if list is short to look balanced */}
                  {allTanks.length < 12 && Array.from({ length: 12 - allTanks.length }).map((_, i) => (
                    <tr key={`empty-${i}`} className="border-b border-slate-100 h-6">
                       <td className="border-e p-1.5"></td>
                       <td className="border-e p-1.5"></td>
                       <td className="p-1.5 text-right"></td>
                       <td className="p-1.5 text-right border-s"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>

           {/* Section 2: Receive Details (4/12) */}
           <div className="col-span-4 border-e-2 border-slate-900 flex flex-col">
              <div className="bg-green-700 text-white p-2 text-center font-black text-[11px] uppercase tracking-wide">
                Receiving Records (24 Hours)
              </div>
              <table className="w-full text-[10px] border-collapse flex-1 bg-white">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-50 font-black">
                    <th className="border-e p-1.5">Source Location</th>
                    <th className="border-e p-1.5 w-20 text-right">M³</th>
                    <th className="p-1.5 w-24 text-right">BBL</th>
                  </tr>
                </thead>
                <tbody>
                  {RECEIVE_PIPES.map((pipeName) => {
                    const finalRow = receiveComputed[receiveComputed.length - 1];
                    const pipeTotalM3 = finalRow ? (finalRow.accum[pipeName] ?? 0) : 0;
                    return (
                      <tr key={pipeName} className="border-b border-slate-200 h-7">
                        <td className="border-e p-1.5 font-bold text-slate-700">{lbl(pipeName)}</td>
                        <td className="border-e p-1.5 text-right font-mono font-medium text-slate-800">{fmt(pipeTotalM3)}</td>
                        <td className="p-1.5 text-right font-mono font-medium text-slate-800">{fmt(pipeTotalM3 * M3_TO_BARREL)}</td>
                      </tr>
                    );
                  })}
                  
                  {/* Visual spacing for alignments */}
                  {Array.from({ length: Math.max(0, 12 - RECEIVE_PIPES.length) }).map((_, i) => (
                    <tr key={`spacer-rec-${i}`} className="border-b border-slate-100 h-7 spacer-row">
                      <td className="border-e p-1.5"></td>
                      <td className="border-e p-1.5"></td>
                      <td className="p-1.5"></td>
                    </tr>
                  ))}

                  <tr className="bg-green-50 font-black text-green-900 border-t-2 border-slate-900 mt-auto h-8">
                     <td className="border-e p-1.5 text-left uppercase">Total Received</td>
                     <td className="border-e p-1.5 text-right font-mono">{fmt(totalReceiveM3)}</td>
                     <td className="p-1.5 text-right font-mono">{fmt(totalReceiveM3 * M3_TO_BARREL)}</td>
                  </tr>
                </tbody>
              </table>
           </div>

           {/* Section 3: Pump Details (4/12) */}
           <div className="col-span-4 flex flex-col">
              <div className="bg-blue-700 text-white p-2 text-center font-black text-[11px] uppercase tracking-wide">
                Pumping & Export Records (24 Hours)
              </div>
              <table className="w-full text-[10px] border-collapse flex-1 bg-white">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-50 font-black">
                    <th className="border-e p-1.5">Destination</th>
                    <th className="border-e p-1.5 w-20 text-right">M³</th>
                    <th className="p-1.5 w-24 text-right">BBL</th>
                  </tr>
                </thead>
                <tbody>
                  {PUMP_PIPES.map((pipeName) => {
                    const finalRow = pumpComputed[pumpComputed.length - 1];
                    const pipeTotalM3 = finalRow ? (finalRow.accum[pipeName] ?? 0) : 0;
                    return (
                      <tr key={pipeName} className="border-b border-slate-200 h-7">
                        <td className="border-e p-1.5 font-bold text-slate-700">{lbl(pipeName)}</td>
                        <td className="border-e p-1.5 text-right font-mono font-medium text-slate-800">{fmt(pipeTotalM3)}</td>
                        <td className="p-1.5 text-right font-mono font-medium text-slate-800">{fmt(pipeTotalM3 * M3_TO_BARREL)}</td>
                      </tr>
                    );
                  })}
                  
                  {/* Spacer rows matching left height */}
                  {Array.from({ length: Math.max(0, 12 - PUMP_PIPES.length) }).map((_, i) => (
                    <tr key={`spacer-pmp-${i}`} className="border-b border-slate-100 h-7 spacer-row">
                      <td className="border-e p-1.5"></td>
                      <td className="border-e p-1.5"></td>
                      <td className="p-1.5"></td>
                    </tr>
                  ))}

                  <tr className="bg-blue-50 font-black text-blue-900 border-t-2 border-slate-900 mt-auto h-8">
                     <td className="border-e p-1.5 text-left uppercase">Total Exported</td>
                     <td className="border-e p-1.5 text-right font-mono">{fmt(totalPumpM3)}</td>
                     <td className="p-1.5 text-right font-mono">{fmt(totalPumpM3 * M3_TO_BARREL)}</td>
                  </tr>
                </tbody>
              </table>
           </div>
        </div>

        {/* Bottom Signatures Area */}
        <div className="mt-12 grid grid-cols-2 gap-20 px-10">
           <div className="flex flex-col gap-1 text-center">
              <div className="h-10 border-b-2 border-slate-900 border-dashed mb-1"></div>
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Shift Supervisor</span>
              <span className="text-[9px] font-bold text-slate-400 italic font-mono">Signature / Verification</span>
           </div>
           <div className="flex flex-col gap-1 text-center">
              <div className="h-10 border-b-2 border-slate-900 border-dashed mb-1"></div>
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Station Engineer</span>
              <span className="text-[9px] font-bold text-slate-400 italic font-mono">Official Seal & Date</span>
           </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 flex justify-between items-end border-t border-slate-100 pt-4 flex-row-reverse">
           <div className="text-[9px] font-mono font-bold text-slate-300">FORM: PS1-SUMMARY-REV24</div>
           <div className="text-[9px] font-mono font-bold text-slate-400">Pumping Station One, Operational Dashboard</div>
        </div>
      </Card>
      
      <div className="text-center no-print mt-4">
         <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Share2 className="h-3.5 w-3.5" />
            {isRtl ? "تقرير خلاصة العمليات والإنتاج اليومي لمحطة PS-1" : "PS-1 Operations and Production Summary Report"}
         </p>
      </div>
    </div>
  );
}
