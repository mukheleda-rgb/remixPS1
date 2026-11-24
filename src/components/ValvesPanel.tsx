import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Eraser,
  FileDown,
  Map as MapIcon,
  RotateCcw,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { makeId } from "@/lib/calculations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { savePdf, sharePdf } from "@/lib/native-save";
import { INITIAL_VALVES, Valve } from "@/lib/initial-valves";
import { hapticFeedback } from "@/lib/haptics";
import { Share2 } from "lucide-react";

interface ValvesPanelProps {
  onLocateOnDiagram?: (q: string) => void;
}

export function ValvesPanel({ onLocateOnDiagram }: ValvesPanelProps = {}) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [valves, setValves] = useLocalStorageState<Valve[]>(
    "ps1-valves",
    [],
  );
  
  // Set initial valves if empty
  useEffect(() => {
    if (valves.length === 0) {
      setValves(INITIAL_VALVES);
    }
  }, [valves.length, setValves]);

  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingValve, setEditingValve] = useState<Valve | null>(null);
  const [newValveData, setNewValveData] = useState({ name: "", location: "", notes: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return valves;
    return valves.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.notes.toLowerCase().includes(q),
    );
  }, [valves, query]);

  const handleAddValve = () => {
    if (!newValveData.name.trim()) {
      toast.error(t("toast.addNameFirst") || "يرجى إدخال اسم الصمام أولاً");
      return;
    }
    setValves((vs) => [...vs, { id: makeId(), status: "closed", ...newValveData }]);
    setNewValveData({ name: "", location: "", notes: "" });
    setShowAddDialog(false);
    toast.success(t("toast.tankAdded", { name: newValveData.name }) || "تمت إضافة الصمام بنجاح");
  };

  const toggleStatus = (id: string) => {
    setValves((vs) => 
      vs.map((v) => 
        v.id === id ? { ...v, status: v.status === "open" ? "closed" : "open" } : v
      )
    );
    hapticFeedback("light");
  };

  const remove = (id: string) => setValves((vs) => vs.filter((v) => v.id !== id));

  const handleUpdateValve = (updated: Valve) => {
    setValves((vs) => vs.map((v) => (v.id === updated.id ? updated : v)));
    setEditingValve(null);
    toast.success(t("toast.updateSuccess") || "تم تحديث بيانات الصمام");
  };
  
  const restoreDefaults = () => {
    setValves(INITIAL_VALVES);
    toast.success(t("toast.importValvesSuccess", { count: INITIAL_VALVES.length }));
  };

  const clearAll = () => {
    setValves([]);
    toast.success(t("valves.clearSuccess"));
  };

  const preparePdfInstance = async (data: Valve[]) => {
    const [{ jsPDF }, h2cMod] = await Promise.all([import("jspdf"), import("html2canvas-pro")]);
    const html2canvas = (h2cMod as { default: typeof import("html2canvas-pro").default }).default;
    const stamp = new Date().toLocaleString(isRtl ? "ar-EG" : "en-GB");

    // Preload Cairo Arabic font for PDF
    const fontUrl = "https://fonts.gstatic.com/s/cairo/v28/SLXGc1j9FwghrCncYQ.ttf";
    const fontFace = new FontFace("CairoPDF", `url(${fontUrl})`);
    try {
      const loaded = await fontFace.load();
      document.fonts.add(loaded);
    } catch (e) {
      console.warn("Font load failed", e);
    }

    const root = document.createElement("div");
    root.dir = isRtl ? "rtl" : "ltr";
    root.lang = i18n.language;
    // Lower width and simpler styles for better canvas generation
    root.style.cssText = `position:fixed;left:-10000px;top:0;width:700px;background:#fff;color:#0f172a;font-family:'CairoPDF', sans-serif;padding:20px;`;
    root.innerHTML = `
      <div style="background:#0f4c81;color:#fff;padding:12px 16px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-size:18px;font-weight:bold;">${t("valves.pdf_example")}</div>
          <div style="font-size:10px;opacity:.9;">PS1 Operational Report</div>
        </div>
        <div style="text-align:${isRtl ? "left" : "right"};font-size:10px;">
          <div>${t("valves.pdf_count", { count: data.length })}</div>
          <div>${stamp}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f1f5f9;color:#0f4c81;">
            <th style="border:1px solid #e2e8f0;padding:6px;width:30px;">#</th>
            <th style="border:1px solid #e2e8f0;padding:6px;text-align:${isRtl ? "right" : "left"};">${t("valves.col_name")}</th>
            <th style="border:1px solid #e2e8f0;padding:6px;text-align:${isRtl ? "right" : "left"};">${t("valves.status")}</th>
            <th style="border:1px solid #e2e8f0;padding:6px;text-align:${isRtl ? "right" : "left"};">${t("valves.col_location")}</th>
            <th style="border:1px solid #e2e8f0;padding:6px;text-align:${isRtl ? "right" : "left"};">${t("valves.col_notes")}</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((v, i) => `
            <tr>
              <td style="border:1px solid #e2e8f0;padding:6px;text-align:center;">${i + 1}</td>
              <td style="border:1px solid #e2e8f0;padding:6px;font-weight:bold;">${escapeHtml(v.name) || "—"}</td>
              <td style="border:1px solid #e2e8f0;padding:6px;">${v.status === "open" ? (t("valves.open") || "Open") : (t("valves.closed") || "Closed")}</td>
              <td style="border:1px solid #e2e8f0;padding:6px;">${escapeHtml(v.location) || "—"}</td>
              <td style="border:1px solid #e2e8f0;padding:6px;">${escapeHtml(v.notes) || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    
    document.body.appendChild(root);
    
    // Scale 1.5 is a good balance between quality and memory on mobile
    const isMobile = window.innerWidth < 768;
    const canvas = await html2canvas(root, { 
      scale: isMobile ? 1.2 : 1.5, 
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true
    });
    
    document.body.removeChild(root);
    
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.85); // JPEG is smaller than PNG

    let srcY = 0;
    const sliceHpx = (canvas.width * (pageH - margin * 2)) / imgW;
    
    while (srcY < canvas.height) {
      if (srcY > 0) pdf.addPage();
      
      const sh = Math.min(sliceHpx, canvas.height - srcY);
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = sh;
      const ctx = tempCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, srcY, canvas.width, sh, 0, 0, canvas.width, sh);
      
      const sliceData = tempCanvas.toDataURL("image/jpeg", 0.85);
      const sliceHmm = (sh * imgW) / canvas.width;
      
      pdf.addImage(sliceData, "JPEG", margin, margin, imgW, sliceHmm);
      srcY += sh;
    }
    
    return pdf;
  };

  const downloadPdf = async () => {
    if (filtered.length === 0) {
      toast.error(t("valves.noValves"));
      return;
    }
    const toastId = toast.loading(t("reports.downloading"));
    try {
      const pdf = await preparePdfInstance(filtered);
      const fileStamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      await savePdf(pdf, `PS1-Valves-${fileStamp}.pdf`);
      toast.success(t("reports.downloadSuccess"), { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(t("reports.downloadError"), {
        id: toastId,
        description: String((err as Error)?.message ?? err),
      });
    }
  };

  const shareValvesPdf = async () => {
    if (filtered.length === 0) {
      toast.error(t("valves.noValves"));
      return;
    }
    const toastId = toast.loading(isRtl ? "جاري تحضير المشاركة..." : "Preparing share...");
    try {
      const pdf = await preparePdfInstance(filtered);
      const fileStamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      await sharePdf(pdf, `PS1-Valves-${fileStamp}.pdf`);
      toast.dismiss(toastId);
    } catch (err) {
      console.error(err);
      toast.error(t("common.shareError") || "Share error", { id: toastId });
    }
  };

  function escapeHtml(s: string) {
    return (s || "").replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
              isRtl ? "right-3" : "left-3",
            )}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("valves.searchPlaceholder")}
            className={cn(isRtl ? "pr-9" : "pl-9")}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("valves.addValve")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t("valves.addValve")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("valves.col_name")}</Label>
                  <Input
                    id="name"
                    value={newValveData.name}
                    onChange={(e) => setNewValveData({ ...newValveData, name: e.target.value })}
                    placeholder={t("valves.example_name")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">{t("valves.col_location")}</Label>
                  <Input
                    id="location"
                    value={newValveData.location}
                    onChange={(e) => setNewValveData({ ...newValveData, location: e.target.value })}
                    placeholder={t("valves.example_location")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">{t("valves.col_notes")}</Label>
                  <Input
                    id="notes"
                    value={newValveData.notes}
                    onChange={(e) => setNewValveData({ ...newValveData, notes: e.target.value })}
                    placeholder={t("valves.example_notes")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddValve}>{t("common.save") || "حفظ"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const imported = await importValvesXlsx(f);
                if (imported.length === 0) {
                  toast.error(t("toast.importEmpty"));
                  return;
                }
                setValves((vs) => [...vs, ...imported]);
                toast.success(t("toast.importValvesSuccess", { count: imported.length }));
              } catch (err) {
                toast.error(t("toast.importError"), {
                  description: String((err as Error)?.message ?? err),
                });
              } finally {
                if (fileRef.current) fileRef.current.value = "";
              }
            }}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> {t("valves.restoreDefaults")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-right">
                  {t("dialog.confirmTitle") || "تأكيد الإجراء"}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-right">
                  {t("valves.restoreConfirm") || "هل أنت متأكد من رغبتك في استعادة القيم الافتراضية؟"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel>{t("common.cancel") || "إلغاء"}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={restoreDefaults}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {t("common.confirm") || "تأكيد"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {valves.length > 0 && (
            <>
              <Button onClick={downloadPdf} size="sm" variant="outline" className="gap-1.5">
                <FileDown className="h-4 w-4" /> {t("valves.downloadPdf")}
              </Button>
              <Button onClick={shareValvesPdf} size="sm" variant="outline" className="gap-1.5">
                <Share2 className="h-4 w-4" /> {t("common.share") || "مشاركة"}
              </Button>
            </>
          )}
          {valves.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Eraser className="h-4 w-4" /> {t("buttons.resetAll")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-right">
                    {t("dialog.confirmTitle") || "تأكيد الإجراء"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-right">
                    {t("valves.clearConfirm") || "هل أنت متأكد من رغبتك في مسح كل الصمامات؟"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogCancel>{t("common.cancel") || "إلغاء"}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAll}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {t("common.confirm") || "تأكيد"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {valves.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {t("valves.noValves")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]" dir={isRtl ? "rtl" : "ltr"}>
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                <th className={cn("px-2 py-2 w-12", isRtl ? "text-right" : "text-left")}>#</th>
                <th className={cn("px-2 py-2", isRtl ? "text-right" : "text-left")}>
                  {t("valves.col_name")}
                </th>
                <th className={cn("px-2 py-2", isRtl ? "text-right" : "text-left")}>
                  {t("valves.status") || "الحالة"}
                </th>
                <th className={cn("px-2 py-2", isRtl ? "text-right" : "text-left")}>
                  {t("valves.col_location")}
                </th>
                <th className={cn("px-2 py-2", isRtl ? "text-right" : "text-left")}>
                  {t("valves.col_notes")}
                </th>
                <th className="px-2 py-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} className="border-b hover:bg-muted/30">
                  <td className="px-2 py-1.5 text-center text-xs text-muted-foreground tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-2 py-3 font-bold text-foreground">
                    {v.name || "—"}
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(v.id)}
                      className={cn(
                        "h-7 px-3 text-[10px] font-black uppercase tracking-widest transition-all",
                        v.status === "open" 
                          ? "bg-success/15 text-success border-success/30 hover:bg-success/20" 
                          : "bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted/80"
                      )}
                    >
                      {v.status === "open" ? (t("valves.open") || "مفتوح") : (t("valves.closed") || "مغلق")}
                    </Button>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground text-xs">
                    {v.location || "—"}
                  </td>
                  <td className="px-2 py-3 text-muted-foreground italic text-xs">
                    {v.notes || "—"}
                  </td>
                  <td className="px-1 py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-muted"
                        onClick={() => setEditingValve(v)}
                        title={t("common.edit") || "تعديل"}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {onLocateOnDiagram && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => {
                            if (!v.name.trim()) {
                              toast.error(t("toast.addNameFirst"));
                              return;
                            }
                            onLocateOnDiagram(v.name.trim());
                          }}
                          title={t("valves.locateOnDiagram")}
                        >
                          <MapIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    {t("valves.noResults", { query })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground text-start">
        {t("valves.count", { count: valves.length })}
        {query && filtered.length !== valves.length && (
          <>{t("valves.filteredCount", { count: filtered.length })}</>
        )}
      </p>

      {/* Edit Valve Dialog */}
      <Dialog open={!!editingValve} onOpenChange={(open) => !open && setEditingValve(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("valves.editValve") || "تعديل بيانات الصمام"}</DialogTitle>
          </DialogHeader>
          {editingValve && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t("valves.col_name")}</Label>
                <Input
                  id="edit-name"
                  value={editingValve.name}
                  onChange={(e) => setEditingValve({ ...editingValve, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-location">{t("valves.col_location")}</Label>
                <Input
                  id="edit-location"
                  value={editingValve.location}
                  onChange={(e) => setEditingValve({ ...editingValve, location: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">{t("valves.col_notes")}</Label>
                <Input
                  id="edit-notes"
                  value={editingValve.notes}
                  onChange={(e) => setEditingValve({ ...editingValve, notes: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status text-xs font-bold">{t("valves.status")}</Label>
                <div className="flex gap-2">
                   <Button 
                    variant={editingValve.status === "open" ? "default" : "outline"} 
                    className="flex-1"
                    onClick={() => setEditingValve({ ...editingValve, status: "open" })}
                   >
                     {t("valves.open") || "مفتوح"}
                   </Button>
                   <Button 
                    variant={editingValve.status === "closed" ? "secondary" : "outline"}
                    className="flex-1"
                    onClick={() => setEditingValve({ ...editingValve, status: "closed" })}
                   >
                     {t("valves.closed") || "مغلق"}
                   </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => editingValve && handleUpdateValve(editingValve)}>
              {t("common.save") || "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
