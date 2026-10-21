import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTestModeBanner } from "@/components/plan/PaymentTestModeBanner";

const PLAN_LABEL: Record<string, string> = { basic: "Solo", pro: "Pro", studio: "Studio" };

export default function CheckoutReturn() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<"checking" | "active" | "slow">("checking");
  const [plan, setPlan] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    let tries = 0;
    const poll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || stop) return;
      const { data } = await supabase.from("user_plans").select("status, plan_name").eq("user_id", user.id).maybeSingle();
      if (data?.status === "active") { setPlan(PLAN_LABEL[data.plan_name] ?? data.plan_name); setState("active"); return; }
      if (++tries >= 15) { setState("slow"); return; }
      setTimeout(poll, 2000);
    };
    poll();
    return () => { stop = true; };
  }, [sessionId]);

  return (
    <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
      <PaymentTestModeBanner />
      <Card className="p-8 text-center space-y-4">
        {!sessionId ? (
          <p className="text-muted-foreground">{t("billReturnNoSession")}</p>
        ) : (
          <>
            {state === "checking" && <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />}
            {state === "active" && <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />}
            {state === "slow" && <Clock className="h-10 w-10 mx-auto text-muted-foreground" />}
            <h1 className="text-2xl font-bold">{t("billReturnTitle")}</h1>
            <p className="text-muted-foreground" data-testid="return-state">
              {state === "checking" ? t("billReturnChecking") : state === "active" ? t("billReturnActive", { plan }) : t("billReturnSlow")}
            </p>
          </>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <Button asChild variant="outline"><Link to="/plans">{t("billBackToPlans")}</Link></Button>
          {state === "active" && <Button asChild variant="gradient"><Link to="/create">{t("billGoHome")}</Link></Button>}
        </div>
      </Card>
    </div>
  );
}
