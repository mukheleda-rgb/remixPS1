import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Search, Eraser, FileDown, ExternalLink, Share2 } from "lucide-react";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { makeId } from "@/lib/calculations";
import { savePdf, sharePdf } from "@/lib/native-save";
import { toast } from "sonner";

export const Route = createFileRoute("/valves")({
  head: () => ({
    meta: [
      { title: "بيانات الصمامات — PS1" },
      { name: "description", content: "إدارة وبحث صمامات محطة الضخ PS1." },
    ],
  }),
  component: ValvesPage,
});

interface Valve {
  id: string;
  name: string;
  location: string;
  notes: string;
}

function ValvesPage() {
  const { t } = useTranslation();
  const [valves, setValves] = useLocalStorageState<Valve[]>("ps1-valves", []);
  const [query, setQuery] = useState("");

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

  const addValve = () => {
    setValves((vs) => [...vs, { id: makeId(), name: "", location: "", notes: "" }]);
  };
  const update = (id: string, patch: Partial<Valve>) => {
    setValves((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };
  const remove = (id: string) => {
    setValves((vs) => vs.filter((v) => v.id !== id));
  };
  const clearAll = () => {
    if (typeof window !== "undefined" && !window.confirm(t("valves.clearConfirm"))) return;
    setValves([]);
    toast.success(t("valves.clearSuccess"));
  };

  const preparePdf = async () => {
    const data = filtered;
    const [{ jsPDF }, h2cMod] = await Promise.all([import("jspdf"), import("html2canvas-pro")]);
    const html2canvas = (h2cMod as { default: typeof import("html2canvas-pro").default }).default;
    const stamp = new Date().toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-GB");

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
    root.dir = i18n.language === "ar" ? "rtl" : "ltr";
    root.lang = i18n.language;
    root.style.cssText = `position:fixed;left:-10000px;top:0;width:700px;background:#fff;color:#0f172a;font-family:'CairoPDF', sans-serif;padding:20px;`;
    root.innerHTML = `
      <div style="background:#0f4c81;color:#fff;padding:12px 16px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-size:18px;font-weight:bold;">${t("valves.pdf_title")}</div>
          <div style="font-size:10px;opacity:.9;">PS1 Operational Report</div>
        </div>
        <div style="text-align:${i18n.language === "ar" ? "left" : "right"};font-size:10px;">
          <div>${t("valves.pdf_total", { count: data.length })}</div>
          <div>${stamp}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f1f5f9;color:#0f4c81;">
            <th style="border:1px solid #e2e8f0;padding:6px;width:30px;">#</th>
            <th style="border:1px solid #e2e8f0;padding:6px;text-align:${i18n.language === "ar" ? "right" : "left"};">${t("valves.col_name")}</th>
            <th style="border:1px solid #e2e8f0;padding:6px;text-align:${i18n.language === "ar" ? "right" : "left"};">${t("valves.col_location")}</th>
            <th style="border:1px solid #e2e8f0;padding:6px;text-align:${i18n.language === "ar" ? "right" : "left"};">${t("valves.col_notes")}</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((v, i) => `
            <tr>
              <td style="border:1px solid #e2e8f0;padding:6px;text-align:center;">${i + 1}</td>
              <td style="border:1px solid #e2e8f0;padding:6px;font-weight:bold;">${v.name || "—"}</td>
              <td style="border:1px solid #e2e8f0;padding:6px;">${v.location || "—"}</td>
              <td style="border:1px solid #e2e8f0;padding:6px;">${v.notes || "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    
    document.body.appendChild(root);
    const canvas = await html2canvas(root, { 
      scale: window.innerWidth < 768 ? 1.2 : 1.5, 
      backgroundColor: "#ffffff",
      useCORS: true
    });
    document.body.removeChild(root);
    
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    
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
      pdf.addImage(sliceData, "JPEG", margin, margin, imgW, (sh * imgW) / canvas.width);
      srcY += sh;
    }
    
    return pdf;
  };

  const downloadPdf = async () => {
    if (filtered.length === 0) {
      toast.error(t("valves.noResults", { query: "" }));
      return;
    }
    const tMsg = toast.loading(t("reports.downloading"));
    try {
      const pdf = await preparePdf();
      const fileStamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      await savePdf(pdf, `PS1-Valves-${fileStamp}.pdf`);
      toast.success(t("reports.downloadSuccess"), { id: tMsg });
    } catch (err) {
      console.error(err);
      toast.error(t("reports.downloadError"), {
        id: tMsg,
        description: String((err as Error)?.message ?? err),
      });
    }
  };

  const handleShare = async () => {
    if (filtered.length === 0) {
      toast.error(t("valves.noResults", { query: "" }));
      return;
    }
    const tMsg = toast.loading(t("common.sharing") || "جاري المشاركة...");
    try {
      const pdf = await preparePdf();
      const fileStamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      await sharePdf(pdf, `PS1-Valves-${fileStamp}.pdf`);
      toast.dismiss(tMsg);
    } catch (err) {
      console.error(err);
      toast.error(t("common.shareError") || "خطأ في المشاركة", {
        id: tMsg,
        description: String((err as Error)?.message ?? err),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <ExternalLink className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("app.valvesTitle")}</h1>
              <p className="text-xs text-muted-foreground">{t("app.subtitle")} — PS1</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" /> {t("valves.back")}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:px-6">
        <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search
                className={`pointer-events-none absolute ${t("language.switcher") === "العربية" ? "right-3" : "left-3"} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`}
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("valves.searchPlaceholder")}
                className={t("language.switcher") === "العربية" ? "pr-9" : "pl-9"}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addValve} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("valves.addValve")}
              </Button>
              {valves.length > 0 && (
                <>
                  <Button onClick={downloadPdf} size="sm" variant="outline" className="gap-1.5">
                    <FileDown className="h-4 w-4" /> {t("valves.downloadPdf")}
                  </Button>
                  <Button onClick={handleShare} size="sm" variant="outline" className="gap-1.5">
                    <Share2 className="h-4 w-4" /> {t("common.share") || "مشاركة"}
                  </Button>
                </>
              )}
              {valves.length > 0 && (
                <Button
                  onClick={clearAll}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Eraser className="h-4 w-4" /> {t("valves.clearAll")}
                </Button>
              )}
            </div>
          </div>

          {valves.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              {t("valves.noValves")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <th
                      className={`px-2 py-2 ${t("language.switcher") === "العربية" ? "text-right" : "text-left"} w-12`}
                    >
                      #
                    </th>
                    <th
                      className={`px-2 py-2 ${t("language.switcher") === "العربية" ? "text-right" : "text-left"}`}
                    >
                      {t("valves.col_name")}
                    </th>
                    <th
                      className={`px-2 py-2 ${t("language.switcher") === "العربية" ? "text-right" : "text-left"}`}
                    >
                      {t("valves.col_location")}
                    </th>
                    <th
                      className={`px-2 py-2 ${t("language.switcher") === "العربية" ? "text-right" : "text-left"}`}
                    >
                      {t("valves.col_notes")}
                    </th>
                    <th className="px-2 py-2 text-center w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, i) => (
                    <tr key={v.id} className="border-b hover:bg-muted/30">
                      <td className="px-2 py-1.5 text-center text-xs text-muted-foreground tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={v.name}
                          onChange={(e) => update(v.id, { name: e.target.value })}
                          className="h-9"
                          placeholder="V-101"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={v.location}
                          onChange={(e) => update(v.id, { location: e.target.value })}
                          className="h-9"
                          placeholder="WQ Receive"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <Input
                          value={v.notes}
                          onChange={(e) => update(v.id, { notes: e.target.value })}
                          className="h-9"
                          placeholder="..."
                        />
                      </td>
                      <td className="px-1 py-1 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => remove(v.id)}
                          title={t("reports.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

          <p className="mt-3 text-xs text-muted-foreground">
            {t("valves.count", { count: valves.length })}
            {query && filtered.length !== valves.length && (
              <>{t("valves.filteredCount", { count: filtered.length })}</>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
