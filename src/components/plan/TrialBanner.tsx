import { Link } from "react-router-dom";
import { Clock, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useImageUsage } from "@/hooks/useImageUsage";

const TX = {
  es: {
    title: (d: number) => `Prueba gratuita: ${d === 1 ? "queda 1 día" : `quedan ${d} días`}`,
    quota: (t: number, tl: number, i: number, il: number) => `Has usado ${t} de ${tl} textos y ${i} de ${il} imágenes con IA (editar y crear comparten las imágenes).`,
    noCard: "Sin tarjeta y sin cobros automáticos.",
    textOut: "Has usado todos los textos con IA de la prueba.",
    imgOut: "Has usado todas las imágenes con IA de la prueba. Puedes seguir usando tus propias fotos.",
    expiredTitle: "Tu prueba gratuita ha terminado",
    expiredDesc: "Puedes seguir entrando, ver y copiar todo lo que guardaste. Las funciones con IA están en pausa hasta que tengas un plan.",
    plans: "Ver planes",
  },
  en: {
    title: (d: number) => `Free trial: ${d === 1 ? "1 day left" : `${d} days left`}`,
    quota: (t: number, tl: number, i: number, il: number) => `You've used ${t} of ${tl} AI texts and ${i} of ${il} AI images (editing and creating share the images).`,
    noCard: "No card and no automatic charges.",
    textOut: "You've used all the AI texts in your trial.",
    imgOut: "You've used all the AI images in your trial. You can keep using your own photos.",
    expiredTitle: "Your free trial has ended",
    expiredDesc: "You can still sign in, view and copy everything you saved. AI features are paused until you have a plan.",
    plans: "See plans",
  },
};

/** Visible only for trial accounts. Existing (legacy/comp/active) accounts never see it. */
export function TrialBanner() {
  const { uiLanguage } = useLanguage();
  const T = TX[uiLanguage === "en" ? "en" : "es"];
  const { isTrial, expired, daysLeft, loading } = useUserPlan();
  const { usage } = useImageUsage();
  if (loading || !isTrial) return null;

  if (expired) {
    return (
      <div className="p-4 rounded-xl border-2 border-destructive/40 bg-destructive/10 flex gap-3" data-testid="trial-banner">
        <Lock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">{T.expiredTitle}</p>
          <p className="text-muted-foreground">{T.expiredDesc}</p>
          <Link to="/plans" className="text-primary font-medium underline">{T.plans}</Link>
        </div>
      </div>
    );
  }

  const tl = usage.textLimit ?? 40;
  const t = usage.textCurrent ?? 0;
  return (
    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex gap-3" data-testid="trial-banner">
      <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{T.title(daysLeft)}</p>
        <p className="text-muted-foreground">{T.quota(t, tl, usage.current, usage.limit)} {T.noCard}</p>
        {t >= tl && <p className="text-destructive font-medium">{T.textOut}</p>}
        {usage.current >= usage.limit && <p className="text-destructive font-medium">{T.imgOut}</p>}
      </div>
    </div>
  );
}
