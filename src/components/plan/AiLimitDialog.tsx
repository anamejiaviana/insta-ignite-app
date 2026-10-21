import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { AI_LIMIT_EVENT, installAiErrorInterceptor, type AiLimitCode } from "@/lib/aiErrors";

installAiErrorInterceptor();

const TX = {
  es: {
    trial_expired: ["Tu prueba gratuita ha terminado", "Puedes seguir entrando, ver y copiar todo lo que guardaste. Las funciones con IA están en pausa. El pago online aún no está disponible."],
    image_limit_reached: ["Has usado todas tus imágenes con IA", "Editar y crear imágenes comparten el mismo cupo. Puedes seguir usando tus propias fotos y crear textos."],
    text_limit_reached: ["Has usado todos tus textos con IA", "Lo que ya guardaste sigue disponible para ver y copiar."],
    trial_daily_cap: ["Imágenes con IA en pausa por hoy", "Hoy se ha alcanzado el límite diario de imágenes de prueba. No se ha gastado tu cupo; inténtalo mañana o usa tu propia foto."],
    no_plan: ["Tu cuenta no tiene plan", "Escríbenos para revisarlo."],
    plans: "Ver planes", close: "Cerrar",
  },
  en: {
    trial_expired: ["Your free trial has ended", "You can still sign in, view and copy everything you saved. AI features are paused. Online payment isn't available yet."],
    image_limit_reached: ["You've used all your AI images", "Editing and creating images share the same allowance. You can keep using your own photos and creating texts."],
    text_limit_reached: ["You've used all your AI texts", "Everything you saved is still available to view and copy."],
    trial_daily_cap: ["AI images paused for today", "Today's daily limit for trial images was reached. Your allowance wasn't used; try tomorrow or use your own photo."],
    no_plan: ["Your account has no plan", "Contact us so we can check it."],
    plans: "See plans", close: "Close",
  },
};

export function AiLimitDialog() {
  const [code, setCode] = useState<AiLimitCode | null>(null);
  const { uiLanguage } = useLanguage();
  const navigate = useNavigate();
  const T = TX[uiLanguage === "en" ? "en" : "es"];

  useEffect(() => {
    const h = (e: Event) => setCode((e as CustomEvent).detail);
    window.addEventListener(AI_LIMIT_EVENT, h);
    return () => window.removeEventListener(AI_LIMIT_EVENT, h);
  }, []);

  if (!code) return null;
  const [title, desc] = T[code];
  return (
    <AlertDialog open onOpenChange={(o) => !o && setCode(null)}>
      <AlertDialogContent data-testid={`ai-limit-${code}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{T.close}</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setCode(null); navigate("/plans"); }}>{T.plans}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
