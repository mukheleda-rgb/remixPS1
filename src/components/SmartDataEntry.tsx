import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { 
  Camera, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ScanLine
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { analyzeControlScreen, ExtractedData } from "@/lib/gemini";
import { extractDataViaOCR } from "@/lib/ocr";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SmartDataEntryProps {
  hours: string[];
  onDataExtracted: (hour: string, levels: Record<string, number | null>) => void;
}

export function SmartDataEntry({ hours, onDataExtracted }: SmartDataEntryProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [selectedHour, setSelectedHour] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    setIsProcessing(true);
    
    try {
      let base64 = "";
      if (file.type === "application/pdf") {
        const result = await extractDataViaOCR(file);
        // Preserve the exact extracted measurement; the user reviews it before applying.

        setExtractedData((prev: any) => {
          if (!prev) {
            return { ...result, levels: cleanedLevels };
          }
          const mergedLevels = { ...prev.levels };
          Object.keys(cleanedLevels).forEach(k => {
            if (cleanedLevels[k] !== null) {
              mergedLevels[k] = cleanedLevels[k];
            }
          });
          return {
            hour: result.hour || prev.hour,
            levels: mergedLevels
          };
        });

        if (result.hour && hours.includes(result.hour)) {
          setSelectedHour(result.hour);
        } else if (!selectedHour && hours.length > 0) {
          setSelectedHour(hours[0]);
        }
        toast.success(t("vision.success") + " (Local OCR)");
      } else {
        // For images, try Gemini first
        const reader = new FileReader();
        base64 = await new Promise((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });

        try {
          const result = await analyzeControlScreen({ data: { base64Image: base64, mimeType: file.type } });
        // Preserve the exact extracted measurement; the user reviews it before applying.

          setExtractedData((prev: any) => {
            if (!prev) {
              return { ...result, levels: cleanedLevels };
            }
            const mergedLevels = { ...prev.levels };
            Object.keys(cleanedLevels).forEach(k => {
              if (cleanedLevels[k] !== null) {
                mergedLevels[k] = cleanedLevels[k];
              }
            });
            return {
              hour: result.hour || prev.hour,
              levels: mergedLevels
            };
          });
          
          if (result.hour && hours.includes(result.hour)) {
            setSelectedHour(result.hour);
          } else if (!selectedHour && hours.length > 0) {
            setSelectedHour(hours[0]);
          }
          toast.success(t("vision.success") + " (Gemini Vision)");
        } catch (geminiError) {
          console.warn("Gemini failed, falling back to local OCR:", geminiError);
          const result = await extractDataViaOCR(file);
        // Preserve the exact extracted measurement; the user reviews it before applying.

          setExtractedData((prev: any) => {
            if (!prev) {
              return { ...result, levels: cleanedLevels };
            }
            const mergedLevels = { ...prev.levels };
            Object.keys(cleanedLevels).forEach(k => {
              if (cleanedLevels[k] !== null) {
                mergedLevels[k] = cleanedLevels[k];
              }
            });
            return {
              hour: result.hour || prev.hour,
              levels: mergedLevels
            };
          });

          if (result.hour && hours.includes(result.hour)) {
            setSelectedHour(result.hour);
          } else if (!selectedHour && hours.length > 0) {
            setSelectedHour(hours[0]);
          }
          toast.success(t("vision.success") + " (Local OCR Fallback)");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(t("vision.error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleApply = () => {
    if (extractedData && selectedHour) {
      onDataExtracted(selectedHour, extractedData.levels);
      setIsOpen(false);
      setExtractedData(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
          <ScanLine className="h-4 w-4" />
          {t("vision.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-bold">
            <ScanLine className="h-5 w-5 text-primary" />
            {t("vision.title")}
          </DialogTitle>
          <DialogDescription>
            {t("vision.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <input 
            type="file" 
            accept="image/*,application/pdf" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
          />

          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute("capture");
                  fileInputRef.current.click();
                }
              }}
              disabled={isProcessing}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase">{t("vision.upload") || "Upload File"}</span>
                <span className="text-[8px] text-muted-foreground uppercase">IMG / PDF</span>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-24 gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.setAttribute("capture", "environment");
                  fileInputRef.current.click();
                }
              }}
              disabled={isProcessing}
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs font-medium">{t("vision.camera")}</span>
            </Button>
          </div>

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-6 gap-3 bg-muted/30 rounded-xl border border-dashed animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">{t("vision.processing")}</p>
            </div>
          )}

          {extractedData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between mb-3 text-start">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("vision.extractedLevels")}
                  </div>
                  <div className="flex items-center gap-2">
                    {extractedData.hour && (
                      <div className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-black">
                        {extractedData.hour}
                      </div>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setExtractedData(null)} 
                      className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                    >
                      {t("vision.clear") || "إعادة ضبط"}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {(() => {
                    const order = ["B1", "B2", "K1", "K2", "K3", "K4", "R1", "R2", "R3", "R4"];
                    const entries = Object.entries(extractedData.levels as Record<string, number | null>);
                    const sortedEntries = [...entries].sort((a, b) => {
                      const indexA = order.indexOf(a[0].toUpperCase());
                      const indexB = order.indexOf(b[0].toUpperCase());
                      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                      if (indexA !== -1) return -1;
                      if (indexB !== -1) return 1;
                      return a[0].localeCompare(b[0]);
                    });
                    return sortedEntries.map(([tank, level]) => (
                      <div key={tank} className="flex flex-col items-center p-1.5 bg-background rounded border shadow-sm">
                        <span className="text-[8px] font-black text-muted-foreground uppercase">{tank}</span>
                        <span className={cn("text-xs font-mono font-bold", level === null ? "text-muted-foreground" : "text-foreground")}>
                          {level ?? "—"}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="p-2.5 bg-sky-500/5 text-sky-600 rounded-lg border border-sky-500/10 text-start text-[10px] leading-relaxed">
                <p>💡 {t("vision.mergeHint")}</p>
              </div>

              <div className="space-y-2 text-start">
                <label className="text-xs font-bold text-muted-foreground">{t("vision.selectHour")}</label>
                <Select value={selectedHour} onValueChange={setSelectedHour}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("vision.selectHour")} />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!isProcessing && !extractedData && (
             <div className="flex items-start gap-3 p-3 bg-amber-500/5 text-amber-600 rounded-lg border border-amber-500/20 text-xs">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{t("diagram.helpHint")}</p>
             </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            onClick={handleApply} 
            disabled={!extractedData || !selectedHour}
            className="w-full"
          >
            {t("vision.fillReading")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
