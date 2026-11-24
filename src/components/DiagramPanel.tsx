import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { 
  Download, Maximize2, X, Map, Info, Layers, Target, Loader2, Infinity,
  Search, ListFilter, Activity, Box, Settings2, ArrowRight,
  PanelLeftClose, PanelLeftOpen, Crosshair, Plus, Minus, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadUrl } from "@/lib/native-save";
import { hapticFeedback } from "@/lib/haptics";
import { INITIAL_VALVES } from "@/lib/initial-valves";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PdfViewer = lazy(() => import("./DiagramPdfViewer"));
const NativeViewer = lazy(() => import("./DiagramNativeViewer"));

interface Props {
  initialSearch?: { query: string; id: string } | null;
}

const AREAS = [
  { id: "area_36", page: 1, key: "diagram.area_36", icon: "36" },
  { id: "tanks", page: 2, key: "diagram.tanks_area", icon: "T" },
  { id: "turbines", page: 3, key: "diagram.turbines", icon: "P" },
  { id: "area_37", page: 4, key: "diagram.area_37", icon: "37" },
];

export function DiagramPanel({ initialSearch: propInitialSearch }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const version = "2.4.5";
  const pdfUrl = new URL(`/diagram.pdf?v=${version}`, window.location.origin).href;
  const [isWide, setIsWide] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [targetPage, setTargetPage] = useState(1);
  const [viewMode, setViewMode] = useState<"interactive" | "native">("interactive");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeSearch, setActiveSearch] = useState<{ query: string; id: string } | null>(propInitialSearch || null);
  const [isPdfSearchOpen, setIsPdfSearchOpen] = useState(false);
  const pdfRef = useRef<any>(null);

  useEffect(() => setMounted(true), []);

  const filteredValves = useMemo(() => {
    return INITIAL_VALVES.filter(v => 
      v.name.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      v.notes.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      v.location.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [sidebarSearch]);

  const handleEntityClick = (name: string) => {
    hapticFeedback("light");
    setActiveSearch({ query: name, id: name });
    setViewMode("interactive");
    setIsPdfSearchOpen(true);
  };

  return (
    <motion.div 
      layout
      className={cn(
        "relative flex flex-col w-full h-[calc(100vh-64px-72px)] sm:h-[calc(100vh-80px-72px)] overflow-hidden transition-all duration-500",
        isWide 
          ? "fixed inset-0 z-[100] bg-background animate-in fade-in duration-500" 
          : "bg-slate-50 dark:bg-slate-900/50"
      )}
    >
      <div className="flex h-full w-full relative">
        {/* Smart Index Sidebar - Desktop */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="hidden xl:flex flex-col w-80 border-l bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl z-20 shadow-2xl relative"
            >
              <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Infinity className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black tracking-widest uppercase">{t("diagram.indexTitle", "الفهرس الفني")}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsSidebarOpen(false)}>
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={t("diagram.filterPlaceholder", "ابحث عن صمام أو معدة...")}
                    className="h-10 pr-9 bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-xl text-xs text-right"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-1">
                  {filteredValves.length > 0 ? (
                    filteredValves.map((valve) => (
                      <button
                        key={valve.id}
                        onClick={() => handleEntityClick(valve.name)}
                        className={cn(
                          "w-full flex flex-col gap-1 p-3 rounded-xl text-right transition-all group",
                          activeSearch?.query === valve.name 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "hover:bg-primary/5 text-foreground"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[10px] font-black tracking-tighter uppercase",
                            activeSearch?.query === valve.name ? "text-white/70" : "text-primary"
                          )}>
                            {valve.location}
                          </span>
                          <ArrowRight className={cn(
                            "h-3 w-3 transition-transform group-hover:translate-x-[-4px]",
                            activeSearch?.query === valve.name ? "text-white" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold truncate">{valve.name}</span>
                          <Badge variant={activeSearch?.query === valve.name ? "secondary" : "outline"} className="text-[10px] h-5 rounded-md px-1.5 font-mono">
                            VALVE
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-[10px] leading-tight truncate-2-lines",
                          activeSearch?.query === valve.name ? "text-white/80" : "text-muted-foreground"
                        )}>
                          {valve.notes}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center gap-2 opacity-50">
                      <Search className="h-8 w-8" />
                      <p className="text-xs font-bold">{t("common.noResults")}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
                <p className="text-[10px] font-bold text-center text-muted-foreground uppercase tracking-[0.2em]">
                  Technical Index v1.2
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Sidebar Toggle (Desktop/Closed) */}
        {!isSidebarOpen && (
          <Button 
            variant="default" 
            size="icon" 
            className="hidden xl:flex fixed right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl shadow-2xl z-50 bg-white dark:bg-slate-900 text-primary border border-primary/20"
            onClick={() => setIsSidebarOpen(true)}
          >
            <PanelLeftOpen className="h-6 w-6" />
          </Button>
        )}


        {/* Viewer Area */}
        <div className="flex-1 h-full relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            {mounted ? (
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-xs font-black text-muted-foreground tracking-widest uppercase animate-pulse">Initializing Layout...</p>
                  </div>
                }
              >
                <div className={cn("w-full h-full", viewMode !== "interactive" && "hidden")}>
                  <PdfViewer
                    ref={pdfRef}
                    url={pdfUrl}
                    jumpToPage={targetPage}
                    initialSearch={activeSearch}
                    isSearchOpenExternally={isPdfSearchOpen}
                    onSearchClose={() => setIsPdfSearchOpen(false)}
                  />
                </div>

                {viewMode === "native" && (
                  <div className="w-full h-full">
                    <NativeViewer 
                      url={pdfUrl} 
                      searchQuery={activeSearch?.query} 
                    />
                  </div>
                )}
              </Suspense>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Overlaid UI components for Viewer */}
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col p-4 sm:p-6 justify-between">
            {/* Top Spacer */}
            <div className="flex-1" />

            {/* Bottom Controls Area */}
            <div className="flex items-end justify-between gap-4 pointer-events-none">
              {/* Quick Target Info (Left side) */}
              <div className="flex-1 flex justify-start">
                <AnimatePresence>
                  {activeSearch && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="bg-primary/95 backdrop-blur-xl text-white p-3 px-5 rounded-2xl shadow-2xl border border-white/20 pointer-events-auto flex items-center gap-4 cursor-pointer"
                      onClick={() => setActiveSearch(null)}
                    >
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                        <Target className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black opacity-70 uppercase tracking-widest">Active Target</span>
                        <span className="text-xs font-bold">{activeSearch.query}</span>
                      </div>
                      <X className="h-4 w-4 ml-2 opacity-50 hover:opacity-100" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Floating Controls (Right side) */}
              <div className="flex flex-col items-center gap-3 pointer-events-auto">
                <div className="flex flex-col items-center gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-border/50 p-2 rounded-2xl shadow-2xl">
                  <Button 
                    variant="default" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl bg-primary text-white shadow-lg hover:scale-105 transition-transform" 
                    onClick={() => {
                      setViewMode("interactive");
                      setIsPdfSearchOpen(true);
                      hapticFeedback("light");
                    }}
                  >
                    <Search className="h-5 w-5" />
                  </Button>

                  <div className="w-6 h-px bg-border/50 my-1" />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors"
                    onClick={() => { hapticFeedback("light"); pdfRef.current?.zoomIn(); }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors"
                    onClick={() => { hapticFeedback("light"); pdfRef.current?.zoomOut(); }}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors"
                    onClick={() => { hapticFeedback("light"); pdfRef.current?.resetTransform(); }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>

                  <div className="w-6 h-px bg-border/50 my-1" />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors"
                    onClick={() => { hapticFeedback("medium"); setIsWide(!isWide); }}
                  >
                    {isWide ? <X className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors"
                    onClick={() => { hapticFeedback("light"); downloadUrl(pdfUrl, "ps1-process-flow-diagram.pdf"); }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
