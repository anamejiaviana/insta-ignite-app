import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, X } from "lucide-react";

// Shown only to NEW accounts: activated when the user has no businesses.
// Users who already had businesses never get the flag, so they never see it.
const FLAG = "anypostly-onboarding";

const TX = {
  es: {
    title: "Empieza en 3 pasos",
    sub: "Tardas unos minutos. Puedes hacerlo a tu ritmo y cerrar esta guía cuando quieras.",
    s1: "Crea tu negocio", s1d: "Solo hace falta el nombre. Lo demás es opcional.", s1c: "Crear mi negocio",
    s2: "Configura tu manual de marca", s2d: "6 preguntas rápidas para que los textos suenen a ti. Puedes dejarlo para más tarde.", s2c: "Configurar", s2skip: "Más tarde",
    s3: "Crea tu primer post o reel", s3d: "Usa tu propia foto si quieres. Nada se genera hasta que tú lo pidas.", s3c: "Crear contenido",
    done: "¡Todo listo! Ya puedes planificar tu semana.", close: "Cerrar guía",
  },
  en: {
    title: "Get started in 3 steps",
    sub: "It takes a few minutes. Go at your own pace and close this guide anytime.",
    s1: "Create your business", s1d: "Only the name is required. The rest is optional.", s1c: "Create my business",
    s2: "Set up your brand guide", s2d: "6 quick questions so your copy sounds like you. You can do it later.", s2c: "Set up", s2skip: "Later",
    s3: "Create your first post or reel", s3d: "Use your own photo if you like. Nothing is generated until you ask.", s3c: "Create content",
    done: "All set! You can now plan your week.", close: "Close guide",
  },
};

type State = { active: boolean; skippedGuide: boolean };

function read(): State | null {
  try { return JSON.parse(localStorage.getItem(FLAG) || "null"); } catch { return null; }
}

export function OnboardingChecklist() {
  const { clients, activeClient, loading } = useClients();
  const { uiLanguage } = useLanguage();
  const navigate = useNavigate();
  const T = TX[uiLanguage === "en" ? "en" : "es"];
  const [state, setState] = useState<State | null>(read);
  const [hasGuide, setHasGuide] = useState(false);
  const [hasPost, setHasPost] = useState(false);

  const save = (s: State | null) => {
    setState(s);
    localStorage.setItem(FLAG, JSON.stringify(s ?? { active: false, skippedGuide: false }));
  };

  // Activate only for brand-new accounts (no businesses at all)
  useEffect(() => {
    if (!loading && clients.length === 0 && state === null) save({ active: true, skippedGuide: false });
  }, [loading, clients.length]);

  useEffect(() => {
    if (!state?.active || !activeClient) return;
    (supabase as any).from("editorial_guides").select("draft, approved").eq("client_id", activeClient.id).maybeSingle()
      .then(({ data }: any) => setHasGuide(!!(data?.approved || data?.draft)));
    supabase.from("generated_posts").select("id", { count: "exact", head: true }).eq("client_id", activeClient.id)
      .then(({ count }) => setHasPost((count ?? 0) > 0));
  }, [state?.active, activeClient?.id]);

  if (loading || !state?.active) return null;

  const s1 = clients.length > 0;
  const s2 = s1 && (hasGuide || state.skippedGuide);
  const s3 = s1 && hasPost;
  const steps = [
    { done: s1, title: T.s1, desc: T.s1d, cta: T.s1c, go: () => navigate("/settings?new=1"), enabled: true },
    { done: s2, title: T.s2, desc: T.s2d, cta: T.s2c, go: () => navigate("/editorial"), enabled: s1, skip: true },
    { done: s3, title: T.s3, desc: T.s3d, cta: T.s3c, go: () => navigate("/create"), enabled: s1 },
  ];
  const current = steps.findIndex((s) => !s.done);
  const allDone = current === -1;

  return (
    <div className="mt-4 p-4 sm:p-5 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3" data-testid="onboarding">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">👋 {T.title}</h2>
          <p className="text-sm text-muted-foreground">{allDone ? T.done : T.sub}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" aria-label={T.close} onClick={() => save({ ...state, active: false })}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className={`flex gap-3 p-3 rounded-lg ${i === current ? "bg-card border border-border" : ""}`}>
            {s.done ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>{i + 1}. {s.title}</p>
              {i === current && (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button variant="gradient" size="sm" onClick={s.go} disabled={!s.enabled}>{s.cta}</Button>
                    {s.skip && (
                      <Button variant="ghost" size="sm" onClick={() => save({ ...state, skippedGuide: true })}>{T.s2skip}</Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
