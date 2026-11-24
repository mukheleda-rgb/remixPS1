import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 bg-white/10 text-primary-foreground border-white/20 hover:bg-white/20"
      onClick={toggleLanguage}
    >
      <Languages className="h-4 w-4" />
      {t("language.switcher")}
    </Button>
  );
}
