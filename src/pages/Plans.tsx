import { useLanguage } from "@/contexts/LanguageContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  {
    key: "solo" as const,
    icon: Building2,
    limit: 1,
    price: "29",
    planName: "basic",
  },
  {
    key: "pro" as const,
    icon: Sparkles,
    limit: 3,
    price: "69",
    planName: "pro",
    popular: true,
  },
  {
    key: "studio" as const,
    icon: Crown,
    limit: 5,
    price: "99",
    planName: "studio",
  },
];

const CORE_FEATURES_KEYS = [
  "plansFeatureCalendar",
  "plansFeatureContent",
  "plansFeatureShooting",
  "plansFeatureLibrary",
  "plansFeatureCustomization",
] as const;

export default function Plans() {
  const { t } = useLanguage();
  const { plan } = useUserPlan();
  const { toast } = useToast();

  const handleUpgrade = () => {
    toast({
      title: t("plansComingSoon"),
      description: t("plansComingSoonDesc"),
    });
  };

  const isCurrentPlan = (planName: string) => {
    if (!plan) return false;
    if (plan.business_limit === -1) return false;
    return plan.plan_name === planName;
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">{t("plansTitle")}</h1>
        <p className="text-muted-foreground">{t("plansSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {PLANS.map((p) => {
          const current = isCurrentPlan(p.planName);
          return (
            <Card
              key={p.key}
              className={`relative bg-card border-border transition-all ${
                p.popular ? "ring-2 ring-primary shadow-lg" : ""
              }`}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge
                    className="text-xs px-3 py-0.5 text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {t("plansMostPopular")}
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-6">
                <div className="mx-auto mb-3 h-11 w-11 rounded-xl flex items-center justify-center bg-secondary">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">{t(`planName_${p.key}`)}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(`planDesc_${p.key}`)}
                </p>
              </CardHeader>
              <CardContent className="text-center space-y-5">
                <div>
                  <span className="text-4xl font-bold">{p.price} €</span>
                  <span className="text-muted-foreground text-sm">/mes</span>
                </div>

                <p className="text-sm font-medium text-foreground">
                  {p.limit === 1
                    ? t("plansBusiness1")
                    : `${t("plansBusinessUpTo")} ${p.limit} ${t("plansBusinesses")}`}
                </p>

                <ul className="space-y-2 text-left text-sm">
                  {CORE_FEATURES_KEYS.map((fk) => (
                    <li key={fk} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{t(fk)}</span>
                    </li>
                  ))}
                </ul>

                {current ? (
                  <Button variant="secondary" className="w-full" disabled>
                    {t("plansCurrentPlan")}
                  </Button>
                ) : (
                  <Button
                    variant={p.popular ? "gradient" : "outline"}
                    className="w-full"
                    onClick={handleUpgrade}
                  >
                    {t("plansContactUpgrade")}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          {t("plansBusinessExplainer")}
        </p>
        <p className="text-sm text-muted-foreground font-medium">
          {t("plansCustomPlan")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("plansFooter")}
        </p>
      </div>
    </div>
  );
}
