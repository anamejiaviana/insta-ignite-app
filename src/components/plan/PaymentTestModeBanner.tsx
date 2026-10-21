import { useLanguage } from "@/contexts/LanguageContext";
import { paymentsEnvironment } from "@/lib/billing";

export function PaymentTestModeBanner() {
  const { t } = useLanguage();
  const env = paymentsEnvironment();
  if (env === "live") return null;
  return (
    <div className="w-full rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-center text-sm text-foreground">
      {env === "sandbox" ? t("billTestBanner") : t("billNotConfigured")}
    </div>
  );
}
