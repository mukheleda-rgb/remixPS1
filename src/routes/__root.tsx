import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useTranslation, I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";

function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">{t("notfound.title")}</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("notfound.subtitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notfound.message")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("buttons.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <I18nextProvider i18n={i18n}>
      <AppShell>
        <Outlet />
        <Toaster />
      </AppShell>
    </I18nextProvider>
  );
}
