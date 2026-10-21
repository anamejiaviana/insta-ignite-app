import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useSubscription } from "@/hooks/useSubscription";
import { TrialBanner } from "@/components/plan/TrialBanner";
import { PaymentTestModeBanner } from "@/components/plan/PaymentTestModeBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Crown, Sparkles, Building2, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import {
  type PlanKey, PRICE_TO_PLAN, billingErrorKey, callBilling, getStripe, hasPaidAccess, paymentsEnvironment, planChangeKind,
} from "@/lib/billing";

const PLANS = [
  { key: "solo" as const, icon: Building2, limit: 1, price: "29" },
  { key: "pro" as const, icon: Sparkles, limit: 3, price: "69", popular: true },
  { key: "studio" as const, icon: Crown, limit: 5, price: "115" },
];

const CORE_FEATURES_KEYS = [
  "plansFeatureCalendar",
  "plansFeatureContent",
  "plansFeatureShooting",
  "plansFeatureLibrary",
  "plansFeatureCustomization",
] as const;

const NAME: Record<PlanKey, string> = { solo: "Solo", pro: "Pro", studio: "Studio" };

export default function Plans() {
  const { t, uiLanguage: language } = useLanguage();
  const { plan } = useUserPlan();
  const { sub, refresh } = useSubscription();
  const { toast } = useToast();
  const env = paymentsEnvironment();
  const [busy, setBusy] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ plan: PlanKey; kind: "upgrade" | "downgrade" } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(language === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "long", year: "numeric" });
  const paid = hasPaidAccess(sub) && sub?.status !== "canceled";
  const currentKey: PlanKey | null = paid && sub?.price_id ? PRICE_TO_PLAN[sub.price_id] ?? null : null;
  const fail = (code?: string) => toast({ title: t(billingErrorKey(code)), variant: code === "payments_unavailable" || code === "not_needed" ? undefined : "destructive" });

  const startCheckout = async (p: PlanKey) => {
    setBusy(p);
    const { data, code } = await callBilling<{ clientSecret: string }>("create-checkout", { plan: p, locale: language });
    setBusy(null);
    if (!data?.clientSecret) return fail(code);
    setClientSecret(data.clientSecret);
  };

  const changePlan = async (p: PlanKey) => {
    setConfirm(null);
    setBusy(p);
    const { data, code } = await callBilling<{ result: string; effective_at?: string }>("change-plan", { plan: p });
    setBusy(null);
    if (!data) return fail(code);
    if (data.result === "upgraded") toast({ title: t("billUpgraded") });
    if (data.result === "downgrade_scheduled" && data.effective_at) toast({ title: t("billDowngradeScheduled", { date: fmtDate(data.effective_at) }) });
    await refresh();
    setTimeout(() => window.location.reload(), 800);
  };

  const runAction = async (action: "cancel" | "resume" | "keep") => {
    setConfirmCancel(false);
    setBusy(action);
    const body = action === "keep" ? { plan: currentKey } : { action };
    const { data, code } = await callBilling<{ result: string }>("change-plan", body);
    setBusy(null);
    if (!data) return fail(code);
    toast({ title: t(action === "cancel" ? "billCancelDone" : action === "resume" ? "billResumed" : "billUpgraded") });
    await refresh();
  };

  const openPortal = async () => {
    setBusy("portal");
    const win = window.open("", "_blank");
    const { data, code } = await callBilling<{ url: string }>("create-portal-session", {});
    setBusy(null);
    if (!data?.url) { win?.close(); return fail(code); }
    if (win) win.location.href = data.url; else window.location.href = data.url;
  };

  const onPlanClick = (p: PlanKey) => {
    if (!env) return fail("payments_unavailable");
    if (currentKey) {
      const kind = planChangeKind(currentKey, p);
      if (kind !== "same") setConfirm({ plan: p, kind });
      return;
    }
    startCheckout(p);
  };

  const closeCheckout = () => {
    setClientSecret(null);
    toast({ title: t("billCheckoutClosed") });
  };

  const isComp = plan?.status === "comp";

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-4"><PaymentTestModeBanner /></div>
      <div className="mb-6"><TrialBanner /></div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("plansTitle")}</h1>
        <p className="text-muted-foreground">{t("plansSubtitle")}</p>
      </div>

      {sub && sub.status === "past_due" && (
        <Card className="mb-6 p-4 border-destructive/50 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm">{t("billPastDue")}</p>
        </Card>
      )}
      {sub && hasPaidAccess(sub) && sub.current_period_end && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground">
          <span data-testid="sub-period">
            {sub.cancel_at_period_end || sub.status === "canceled"
              ? t("billEndsOn", { date: fmtDate(sub.current_period_end) })
              : t("billRenewsOn", { date: fmtDate(sub.current_period_end) })}
          </span>
        </div>
      )}
      {currentKey && sub?.pending_price_id && PRICE_TO_PLAN[sub.pending_price_id] && sub.current_period_end && (
        <p className="mb-4 text-center text-sm text-foreground" data-testid="pending-change">
          {t("billPendingChange", { plan: NAME[PRICE_TO_PLAN[sub.pending_price_id]], date: fmtDate(sub.current_period_end) })}{" "}
          <Button variant="link" className="h-auto p-0" disabled={!!busy} onClick={() => runAction("keep")}>{t("billKeepPlan")}</Button>
        </p>
      )}
      {sub?.provider_customer_id && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={openPortal} disabled={busy === "portal"}>
            {busy === "portal" && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("billManage")}
          </Button>
          {currentKey && !sub.cancel_at_period_end && (
            <Button variant="ghost" onClick={() => setConfirmCancel(true)} disabled={!!busy} data-testid="cancel-sub">{t("billCancelSub")}</Button>
          )}
          {currentKey && sub.cancel_at_period_end && (
            <Button variant="gradient" onClick={() => runAction("resume")} disabled={!!busy} data-testid="resume-sub">
              {busy === "resume" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("billResume")}
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {PLANS.map((p) => {
          const current = currentKey === p.key;
          const kind = currentKey ? planChangeKind(currentKey, p.key) : null;
          const label = kind === "upgrade" ? t("billUpgrade") : kind === "downgrade" ? t("billDowngrade") : t("billSubscribe");
          return (
            <Card key={p.key} className={`relative bg-card border-border transition-all ${p.popular ? "ring-2 ring-primary shadow-lg" : ""}`}>
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="text-xs px-3 py-0.5 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                    {t("plansMostPopular")}
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-6">
                <div className="mx-auto mb-3 h-11 w-11 rounded-xl flex items-center justify-center bg-secondary">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">{t(`planName_${p.key}`)}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t(`planDesc_${p.key}`)}</p>
              </CardHeader>
              <CardContent className="text-center space-y-5">
                <div>
                  <span className="text-4xl font-bold">{p.price} €</span>
                  <span className="text-muted-foreground text-sm">{t("billPerMonth")}</span>
                  <p className="text-xs text-muted-foreground mt-1">{t("billVatIncluded")}</p>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {p.limit === 1 ? t("plansBusiness1") : `${t("plansBusinessUpTo")} ${p.limit} ${t("plansBusinesses")}`}
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
                  <Button variant="secondary" className="w-full" disabled>{t("plansCurrentPlan")}</Button>
                ) : (
                  <Button
                    variant={p.popular ? "gradient" : "outline"}
                    className="w-full"
                    disabled={!!busy || isComp || sub?.status === "past_due"}
                    onClick={() => onPlanClick(p.key)}
                    data-testid={`plan-${p.key}`}
                  >
                    {busy === p.key && <Loader2 className="h-4 w-4 animate-spin" />}
                    {label}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border bg-card/50 p-8 text-center">
        <h3 className="text-xl font-semibold mb-2">{t("plansCustomTitle")}</h3>
        <p className="text-muted-foreground text-sm mb-5">{t("plansCustomDesc")}</p>
        <Button variant="outline" asChild><a href="mailto:hola@anypostly.com">{t("plansCustomCTA")}</a></Button>
      </Card>

      <div className="text-center space-y-2 mt-6">
        <p className="text-sm text-muted-foreground">{t("plansBusinessExplainer")}</p>
        <p className="text-xs text-muted-foreground">{t("plansFooter")}</p>
      </div>

      <Dialog open={!!clientSecret} onOpenChange={(o) => { if (!o) closeCheckout(); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("billCheckoutTitle")}</DialogTitle></DialogHeader>
          {clientSecret && (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: () => Promise.resolve(clientSecret) }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("billCancelSubTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("billCancelSubDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("billBack")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => runAction("cancel")}>{t("billCancelSub")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm && t(confirm.kind === "upgrade" ? "billConfirmUpgradeTitle" : "billConfirmDowngradeTitle", { plan: NAME[confirm.plan] })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm && t(confirm.kind === "upgrade" ? "billConfirmUpgradeDesc" : "billConfirmDowngradeDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("billCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && changePlan(confirm.plan)}>{t("billConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
