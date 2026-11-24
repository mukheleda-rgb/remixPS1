import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  url: string;
  searchQuery?: string | null;
}

export default function DiagramNativeViewer({ url, searchQuery }: Props) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  
  // URL Fragment for native PDF search and view settings
  // #search="query" works in Chrome/Edge/Safari
  // #view=FitH fits horizontal
  const finalUrl = searchQuery 
    ? `${url}#search="${searchQuery}"&view=FitH` 
    : `${url}#view=FitH`;

  useEffect(() => {
    setIsLoading(true);
  }, [finalUrl]);

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">
            {t("diagram.loading") || "جاري تشغيل العارض المتقدم..."}
          </p>
        </div>
      )}
      
      <iframe
        src={finalUrl}
        className="w-full h-full border-none"
        onLoad={() => setIsLoading(false)}
        title="PS1 Process Flow Diagram"
        key={finalUrl} // Force re-render on search change
      />
    </div>
  );
}
