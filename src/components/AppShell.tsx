import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AppShell is the root semantic component for the application.
 * It provides a consistent layout structure and accessibility markers.
 */
export function AppShell({ children, className }: AppShellProps) {
  const { t } = useTranslation();
  const version = "2.4.5"; 
  const lastUpdate = "2026-05-19 18:15";

  const handleForceReload = () => {
    if (window.confirm(t("common.reloadApp"))) {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      }
      window.location.reload();
    }
  };

  return (
    <div 
      id="app-shell" 
      className={cn("min-h-screen bg-background text-foreground antialiased pb-12", className)}
    >
      {children}
      <footer className="w-full py-4 px-6 text-[10px] text-muted-foreground/50 text-center no-print border-t mt-8 bg-muted/30">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-3">
            <span>{t("common.version")}: {version}</span>
            <span>•</span>
            <span>{t("common.lastUpdate")}: {lastUpdate}</span>
          </div>
          <button 
            onClick={handleForceReload}
            className="px-2 py-0.5 rounded border border-muted-foreground/20 hover:bg-muted transition-colors"
          >
            {t("common.reloadApp")}
          </button>
        </div>
      </footer>
    </div>
  );
}
