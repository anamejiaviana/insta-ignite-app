import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles } from "lucide-react";

type Status = "loading" | "none" | "draft" | "active";

const TX = {
  es: {
    title: "Manual editorial de tu marca",
    benefit: "Responde 6 preguntas sencillas y la IA preparará un manual con tu voz, tus temas y tu estilo. Una vez aprobado, todos tus textos sonarán a tu negocio.",
    none: "Sin configurar", draft: "Borrador", active: "Manual activo",
    ctaNew: "Configurar mi marca con IA", ctaDraft: "Continuar mi manual", ctaActive: "Mejorar mi configuración",
    for: "Para",
  },
  en: {
    title: "Your brand's editorial guide",
    benefit: "Answer 6 simple questions and AI will draft a guide with your voice, topics and style. Once approved, all your copy will sound like your business.",
    none: "Not set up", draft: "Draft", active: "Guide active",
    ctaNew: "Set up my brand with AI", ctaDraft: "Continue my guide", ctaActive: "Improve my setup",
    for: "For",
  },
};

export function EditorialGuideCard() {
  const { activeClient } = useClients();
  const { uiLanguage } = useLanguage();
  const navigate = useNavigate();
  const T = TX[uiLanguage === "en" ? "en" : "es"];
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!activeClient) return;
    setStatus("loading");
    (supabase as any)
      .from("editorial_guides")
      .select("answers, draft, approved")
      .eq("client_id", activeClient.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.approved) setStatus("active");
        else if (data?.draft || (data?.answers && Object.keys(data.answers).length)) setStatus("draft");
        else setStatus("none");
      });
  }, [activeClient?.id]);

  if (!activeClient) return null;

  const badge = status === "active" ? T.active : status === "draft" ? T.draft : status === "none" ? T.none : "…";
  const cta = status === "active" ? T.ctaActive : status === "draft" ? T.ctaDraft : T.ctaNew;

  return (
    <Card className="mb-6 border-primary/40 bg-primary/5">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{T.title}</h2>
          <Badge variant={status === "active" ? "default" : "secondary"} data-testid="editorial-status">{badge}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{T.benefit}</p>
        <p className="text-xs text-muted-foreground">{T.for}: <span className="font-medium text-foreground">{activeClient.name}</span></p>
        <Button variant="gradient" className="w-full sm:w-auto" onClick={() => navigate("/editorial")}>
          <Sparkles className="h-4 w-4 mr-1" />{cta}
        </Button>
      </CardContent>
    </Card>
  );
}
