import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, CheckCircle2, Info, Loader2, Sparkles, BookOpen, Copy } from "lucide-react";
import { aiTone, buildDraftRequest, buildGuideContext, normalizeManual, type EditorialManual, type GuideAnswers } from "@/lib/editorialGuide";
import { copyToClipboard } from "@/lib/clipboard";

type L = "es" | "en";
const TX = {
  es: {
    title: "Manual editorial", subtitle: "Responde unas preguntas sencillas y la IA preparará una propuesta de manual para que todos tus textos suenen a tu negocio.",
    noClient: "Primero crea o elige un negocio en Ajustes.", quick: "Rápido", advanced: "Avanzado",
    quickHelp: "Rápido: solo eliges opciones. Avanzado: además puedes escribir detalles (todo opcional).",
    step: "Paso {n} de 6", back: "Atrás", next: "Siguiente", optional: "Opcional",
    s: ["Tu negocio", "Tu cliente ideal", "Tu voz", "Tus temas", "Reglas de los textos", "Tu estilo visual"],
    h: [
      "Cuéntanos qué haces y qué te hace especial. Solo con tus palabras: la IA no inventará datos.",
      "¿A quién quieres atraer? Elige todo lo que encaje.",
      "¿Cómo quieres sonar? Y lo más importante: ¿cómo NO?",
      "Los pilares son los 4-6 temas sobre los que hablarás siempre. Elige los que te representen.",
      "Pequeñas reglas que harán que tus textos sean siempre coherentes.",
      "Cómo quieres que se vean tus fotos y publicaciones.",
    ],
    offer: "¿Qué ofreces?", offerPh: "Ej.: Pan de masa madre y panellets artesanos", difference: "¿Qué te hace diferente?", differencePh: "Ej.: Horneamos cada mañana con harina local",
    story: "Tu historia (si quieres contarla)", storyPh: "Solo lo que sea real: quién eres, cómo empezaste…",
    who: "Tu cliente ideal", needs: "¿Qué busca o le preocupa?", needsPh: "Ej.: Calidad, trato cercano, rapidez…",
    traits: "Quiero sonar…", avoid: "No quiero sonar…", pillarsL: "Temas", customPillars: "Otros temas", customPillarsPh: "Separados por comas",
    emojis: "Emojis", length: "Longitud", address: "Trato al cliente", alwaysSay: "Siempre mencionar", alwaysSayPh: "Ej.: Reserva por WhatsApp", neverSay: "Nunca decir", neverSayPh: "Ej.: 'barato', 'oferta'",
    visualL: "Estilo de fotos", colors: "Colores de marca", colorsPh: "Ej.: crema, verde oliva", photoNotes: "Notas de fotos", photoNotesPh: "Ej.: Siempre luz natural, sin caras de clientes",
    createDraft: "Crear propuesta con IA", draftCost: "Gasta 1 texto de tu cupo mensual. No se crean imágenes.",
    reviewTitle: "Propuesta de manual (revísala)", reviewHelp: "Es una propuesta basada SOLO en tus respuestas. Corrige lo que quieras antes de aprobarla. Hasta que la apruebes, tus textos no cambian.",
    brandDescription: "Descripción de marca", audience: "Cliente ideal", voice: "Voz de marca", doL: "Sí hacer (una por línea)", dontL: "No hacer (una por línea)",
    pillars: "Pilares editoriales (uno por línea: Nombre: descripción)", formats: "Instrucciones por formato", visual: "Identidad visual", sample: "Ejemplo de copy",
    approve: "Aprobar y aplicar", approved: "Manual aprobado y aplicado a tus contenidos", replaceConfirm: "Ya tienes un manual aprobado. ¿Quieres sustituirlo por esta nueva versión?",
    testCopy: "Probar con un copy de ejemplo", testCost: "Opcional · gasta 1 texto", testResult: "Copy de prueba (no se guarda)",
    activeTitle: "Manual activo", activeHelp: "Se aplica a posts, carruseles, reels, stories, hooks, ideas de reels, calendario y día de grabación.",
    edit: "Revisar o rehacer", viewDraft: "Ver propuesta pendiente", saveDraft: "Guardar cambios", saved: "Guardado", error: "Algo ha fallado", copied: "Copiado",
    langNote: "Los textos se seguirán escribiendo en el idioma de tu negocio ({lang}).",
  },
  en: {
    title: "Editorial guide", subtitle: "Answer a few simple questions and AI will draft a guide so all your texts sound like your business.",
    noClient: "First create or choose a business in Settings.", quick: "Quick", advanced: "Advanced",
    quickHelp: "Quick: just pick options. Advanced: you can also type details (all optional).",
    step: "Step {n} of 6", back: "Back", next: "Next", optional: "Optional",
    s: ["Your business", "Your ideal customer", "Your voice", "Your topics", "Writing rules", "Your visual style"],
    h: [
      "Tell us what you do and what makes you special. Your words only: AI won't invent facts.",
      "Who do you want to attract? Pick everything that fits.",
      "How do you want to sound? And most importantly: how NOT?",
      "Pillars are the 4-6 topics you will always talk about. Pick the ones that represent you.",
      "Small rules that keep your texts consistent.",
      "How you want your photos and posts to look.",
    ],
    offer: "What do you offer?", offerPh: "E.g. Sourdough bread and handmade pastries", difference: "What makes you different?", differencePh: "E.g. We bake every morning with local flour",
    story: "Your story (if you want)", storyPh: "Only what is real: who you are, how you started…",
    who: "Your ideal customer", needs: "What do they look for or worry about?", needsPh: "E.g. Quality, friendly service, speed…",
    traits: "I want to sound…", avoid: "I don't want to sound…", pillarsL: "Topics", customPillars: "Other topics", customPillarsPh: "Comma separated",
    emojis: "Emojis", length: "Length", address: "How you address customers", alwaysSay: "Always mention", alwaysSayPh: "E.g. Book via WhatsApp", neverSay: "Never say", neverSayPh: "E.g. 'cheap', 'sale'",
    visualL: "Photo style", colors: "Brand colours", colorsPh: "E.g. cream, olive green", photoNotes: "Photo notes", photoNotesPh: "E.g. Always natural light, no customer faces",
    createDraft: "Create draft with AI", draftCost: "Uses 1 text from your monthly allowance. No images are created.",
    reviewTitle: "Draft guide (please review)", reviewHelp: "This draft is based ONLY on your answers. Fix anything before approving. Your texts don't change until you approve it.",
    brandDescription: "Brand description", audience: "Ideal customer", voice: "Brand voice", doL: "Do (one per line)", dontL: "Don't (one per line)",
    pillars: "Content pillars (one per line: Name: description)", formats: "Per-format instructions", visual: "Visual identity", sample: "Sample copy",
    approve: "Approve and apply", approved: "Guide approved and applied to your content", replaceConfirm: "You already have an approved guide. Replace it with this new version?",
    testCopy: "Try it with a sample caption", testCost: "Optional · uses 1 text", testResult: "Test caption (not saved)",
    activeTitle: "Active guide", activeHelp: "Applied to posts, carousels, reels, stories, hooks, reel ideas, calendar and shooting day.",
    edit: "Review or redo", viewDraft: "See pending draft", saveDraft: "Save changes", saved: "Saved", error: "Something went wrong", copied: "Copied",
    langNote: "Texts will keep being written in your business language ({lang}).",
  },
};

const OPT: Record<string, { es: string; en: string }[]> = {
  who: [
    { es: "Vecinos del barrio", en: "Local neighbours" }, { es: "Familias", en: "Families" }, { es: "Jóvenes", en: "Young people" },
    { es: "Profesionales", en: "Professionals" }, { es: "Personas mayores", en: "Older adults" }, { es: "Turistas", en: "Tourists" },
    { es: "Empresas", en: "Businesses" }, { es: "Amantes de lo artesano", en: "Lovers of handmade" },
  ],
  traits: [
    { es: "Cercano", en: "Friendly" }, { es: "Cálido", en: "Warm" }, { es: "Profesional", en: "Professional" }, { es: "Divertido", en: "Fun" },
    { es: "Elegante", en: "Elegant" }, { es: "Inspirador", en: "Inspiring" }, { es: "Didáctico", en: "Educational" }, { es: "Tranquilo", en: "Calm" },
  ],
  avoid: [
    { es: "Agresivo", en: "Aggressive" }, { es: "Exagerado", en: "Over the top" }, { es: "Demasiado formal", en: "Too formal" },
    { es: "Vendedor", en: "Salesy" }, { es: "Infantil", en: "Childish" }, { es: "Técnico", en: "Too technical" },
  ],
  pillars: [
    { es: "Detrás de cámaras", en: "Behind the scenes" }, { es: "Proceso y oficio", en: "Process & craft" }, { es: "Producto o servicio", en: "Product or service" },
    { es: "Consejos útiles", en: "Useful tips" }, { es: "Equipo", en: "Team" }, { es: "Clientes y opiniones", en: "Customers & reviews" },
    { es: "Temporada y fechas", en: "Seasons & dates" }, { es: "Barrio y ciudad", en: "Neighbourhood & city" }, { es: "Valores", en: "Values" },
  ],
  visualStyle: [
    { es: "Luz natural", en: "Natural light" }, { es: "Minimalista", en: "Minimal" }, { es: "Colorido", en: "Colourful" }, { es: "Cálido", en: "Warm" },
    { es: "Elegante", en: "Elegant" }, { es: "Rústico", en: "Rustic" }, { es: "Moderno", en: "Modern" }, { es: "Primeros planos", en: "Close-ups" },
  ],
};
const SINGLE: Record<string, { v: string; es: string; en: string }[]> = {
  emojis: [{ v: "none", es: "Ninguno", en: "None" }, { v: "few", es: "Pocos", en: "A few" }, { v: "many", es: "Bastantes", en: "Plenty" }],
  length: [{ v: "short", es: "Cortos", en: "Short" }, { v: "medium", es: "Medios", en: "Medium" }, { v: "long", es: "Largos", en: "Long" }],
  address: [{ v: "informal", es: "Tú (cercano)", en: "Informal" }, { v: "formal", es: "Usted (formal)", en: "Formal" }, { v: "mixed", es: "Según contexto", en: "Depends" }],
};
const LANG_NAMES: Record<string, string> = { es: "español", ca: "català", en: "English" };

export default function EditorialGuide() {
  const { activeClient, refreshClients } = useClients();
  const { uiLanguage } = useLanguage();
  const l: L = uiLanguage === "en" ? "en" : "es";
  const T = TX[l];
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"quick" | "advanced">("quick");
  const [view, setView] = useState<"wizard" | "review" | "overview">("wizard");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<GuideAnswers>({});
  const [draft, setDraft] = useState<EditorialManual | null>(null);
  const [approved, setApproved] = useState<EditorialManual | null>(null);
  const [busy, setBusy] = useState<"" | "draft" | "approve" | "test" | "save">("");
  const [testCopy, setTestCopy] = useState("");

  useEffect(() => {
    if (!activeClient) { setLoading(false); return; }
    setLoading(true);
    (supabase as any).from("editorial_guides").select("answers, draft, approved").eq("client_id", activeClient.id).maybeSingle()
      .then(({ data }: any) => {
        setAnswers(data?.answers || {});
        setDraft(data?.draft ? normalizeManual(data.draft) : null);
        setApproved(data?.approved ? normalizeManual(data.approved) : null);
        setView(data?.approved ? "overview" : data?.draft ? "review" : "wizard");
        setStep(0); setTestCopy("");
        setLoading(false);
      });
  }, [activeClient?.id]);

  const persist = async (patch: Record<string, any>) => {
    if (!activeClient) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("editorial_guides")
      .upsert({ user_id: u.user!.id, client_id: activeClient.id, answers, ...patch }, { onConflict: "client_id" });
    if (error) throw error;
  };

  const set = (k: keyof GuideAnswers, v: any) => setAnswers((a) => ({ ...a, [k]: v }));
  const toggle = (k: keyof GuideAnswers, v: string) => {
    const cur = ((answers[k] as string[]) || []);
    set(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
  };

  const next = async () => {
    try { await persist({}); } catch { /* answers are retried on next save */ }
    setStep((s) => Math.min(5, s + 1));
  };

  const callPost = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("generate-post", { body });
    if (error) {
      let msg = error.message;
      try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* keep */ }
      throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const baseClientContext = (tone: string | null) => activeClient && ({
    name: activeClient.name, type: activeClient.type, city: activeClient.city, address: activeClient.address,
    tone, objective: activeClient.objective, keywords: activeClient.keywords, extra_context: activeClient.extra_context,
  });

  const createDraft = async () => {
    if (!activeClient) return;
    setBusy("draft");
    try {
      try { await persist({}); } catch { /* non-blocking */ }
      const req = buildDraftRequest(answers, activeClient.content_language || "es");
      const data = await callPost({ ...req, postType: "post", clientContext: baseClientContext(activeClient.tone), language: activeClient.content_language || "es" });
      const m = normalizeManual(data);
      setDraft(m);
      await persist({ draft: m });
      setTestCopy("");
      setView("review");
    } catch (e: any) {
      toast({ variant: "destructive", title: T.error, description: e.message });
    } finally { setBusy(""); }
  };

  const saveDraft = async () => {
    setBusy("save");
    try { await persist({ draft }); toast({ title: T.saved }); }
    catch (e: any) { toast({ variant: "destructive", title: T.error, description: e.message }); }
    finally { setBusy(""); }
  };

  const approve = async () => {
    if (!draft) return;
    if (approved && JSON.stringify(approved) !== JSON.stringify(draft) && !window.confirm(T.replaceConfirm)) return;
    setBusy("approve");
    try {
      await persist({ draft, approved: draft, approved_at: new Date().toISOString() });
      setApproved(draft);
      await refreshClients();
      setView("overview");
      toast({ title: T.approved });
    } catch (e: any) {
      toast({ variant: "destructive", title: T.error, description: e.message });
    } finally { setBusy(""); }
  };

  const runTest = async () => {
    if (!draft || !activeClient) return;
    setBusy("test");
    try {
      const topic = draft.pillars[0]?.name || activeClient.type || activeClient.name;
      const data = await callPost({
        title: topic, description: draft.pillars[0]?.description || "", postType: "post",
        clientContext: baseClientContext(aiTone(activeClient.tone, buildGuideContext(draft))),
        language: activeClient.content_language || "es",
      });
      setTestCopy([data.mainCopy, (data.hashtags || []).map((h: string) => `#${h}`).join(" ")].filter(Boolean).join("\n\n"));
    } catch (e: any) {
      toast({ variant: "destructive", title: T.error, description: e.message });
    } finally { setBusy(""); }
  };

  const chips = (k: keyof GuideAnswers, options: { es: string; en: string }[]) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const val = o[l];
        const on = ((answers[k] as string[]) || []).includes(val);
        return (
          <button key={val} type="button" onClick={() => toggle(k, val)}
            className={cn("px-3 py-2 rounded-full border text-sm min-h-[40px] transition-colors",
              on ? "bg-primary/15 border-primary text-primary" : "bg-secondary border-border text-foreground hover:border-primary/50")}>
            {val}
          </button>
        );
      })}
    </div>
  );
  const single = (k: keyof GuideAnswers, label: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {SINGLE[k as string].map((o) => (
          <button key={o.v} type="button" onClick={() => set(k, answers[k] === o.v ? undefined : o.v)}
            className={cn("px-3 py-2 rounded-full border text-sm min-h-[40px]",
              answers[k] === o.v ? "bg-primary/15 border-primary text-primary" : "bg-secondary border-border")}>
            {o[l]}
          </button>
        ))}
      </div>
    </div>
  );
  const text = (k: keyof GuideAnswers, label: string, ph: string, area = false) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">{label}<span className="text-xs text-muted-foreground font-normal">{T.optional}</span></Label>
      {area
        ? <Textarea value={(answers[k] as string) || ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} className="bg-secondary border-border min-h-[80px]" />
        : <Input value={(answers[k] as string) || ""} placeholder={ph} onChange={(e) => set(k, e.target.value)} className="bg-secondary border-border" />}
    </div>
  );
  const adv = mode === "advanced";

  const stepBody = useMemo(() => [
    <>{text("offer", T.offer, T.offerPh)}{text("difference", T.difference, T.differencePh)}{adv && text("story", T.story, T.storyPh, true)}</>,
    <><Label>{T.who}</Label>{chips("audienceWho", OPT.who)}{adv && text("audienceNeeds", T.needs, T.needsPh, true)}</>,
    <><Label>{T.traits}</Label>{chips("voiceTraits", OPT.traits)}<Label>{T.avoid}</Label>{chips("voiceAvoid", OPT.avoid)}</>,
    <><Label>{T.pillarsL}</Label>{chips("pillars", OPT.pillars)}{adv && text("customPillars", T.customPillars, T.customPillarsPh)}</>,
    <>{single("emojis", T.emojis)}{single("length", T.length)}{single("address", T.address)}{adv && text("alwaysSay", T.alwaysSay, T.alwaysSayPh)}{adv && text("neverSay", T.neverSay, T.neverSayPh)}</>,
    <><Label>{T.visualL}</Label>{chips("visualStyle", OPT.visualStyle)}{adv && text("colors", T.colors, T.colorsPh)}{adv && text("photoNotes", T.photoNotes, T.photoNotesPh, true)}</>,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [answers, l, adv]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!activeClient) return (
    <div className="max-w-xl mx-auto p-6 text-center space-y-4">
      <p className="text-muted-foreground">{T.noClient}</p>
      <Button variant="outline" onClick={() => navigate("/settings")}>{T.next}</Button>
    </div>
  );

  const langNote = T.langNote.replace("{lang}", LANG_NAMES[activeClient.content_language] || activeClient.content_language);
  const lines = (a: string[]) => a.join("\n");
  const toLines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  const upd = (patch: Partial<EditorialManual>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const area = (label: string, value: string, onChange: (v: string) => void, rows = 3) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className="bg-secondary border-border" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" />{T.title}</h1>
        <p className="text-sm text-muted-foreground">{T.subtitle}</p>
        <p className="text-xs text-muted-foreground"><Badge variant="secondary" className="mr-2">{activeClient.name}</Badge>{langNote}</p>
      </div>

      {view === "overview" && approved && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-primary" />{T.activeTitle}</div>
          <p className="text-xs text-muted-foreground">{T.activeHelp}</p>
          <pre className="whitespace-pre-wrap text-sm font-sans bg-background/50 rounded-lg p-3">{buildGuideContext(approved)}</pre>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setStep(0); setView("wizard"); }}>{T.edit}</Button>
            {draft && JSON.stringify(draft) !== JSON.stringify(approved) && <Button variant="ghost" onClick={() => setView("review")}>{T.viewDraft}</Button>}
          </div>
        </div>
      )}

      {view === "wizard" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-secondary p-1">
              {(["quick", "advanced"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={cn("px-4 py-1.5 rounded-md text-sm", mode === m ? "bg-background font-medium" : "text-muted-foreground")}>{T[m]}</button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{T.step.replace("{n}", String(step + 1))}</span>
          </div>
          <p className="text-xs text-muted-foreground">{T.quickHelp}</p>
          <Progress value={((step + 1) / 6) * 100} />
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-semibold">{T.s[step]}</h2>
            <p className="text-sm text-muted-foreground flex gap-2"><Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />{T.h[step]}</p>
            <div className="space-y-4">{stepBody[step]}</div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft className="h-4 w-4" />{T.back}</Button>
            {step < 5
              ? <Button variant="gradient" className="flex-1 h-12" onClick={next}>{T.next}<ArrowRight className="h-4 w-4" /></Button>
              : <Button variant="gradient" className="flex-1 h-12" disabled={busy === "draft"} onClick={createDraft}>
                  {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{T.createDraft}
                </Button>}
          </div>
          {step === 5 && <p className="text-xs text-muted-foreground text-center">{T.draftCost}</p>}
        </div>
      )}

      {view === "review" && draft && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <h2 className="text-lg font-semibold flex items-center gap-2">{T.reviewTitle}<Badge variant="outline">{l === "en" ? "Draft" : "Propuesta"}</Badge></h2>
            <p className="text-sm text-muted-foreground">{T.reviewHelp}</p>
          </div>
          {area(T.brandDescription, draft.brandDescription, (v) => upd({ brandDescription: v }))}
          {area(T.audience, draft.audience, (v) => upd({ audience: v }))}
          {area(T.voice, draft.voice.description, (v) => upd({ voice: { ...draft.voice, description: v } }), 2)}
          <div className="grid sm:grid-cols-2 gap-3">
            {area(T.doL, lines(draft.voice.do), (v) => upd({ voice: { ...draft.voice, do: toLines(v) } }), 5)}
            {area(T.dontL, lines(draft.voice.dont), (v) => upd({ voice: { ...draft.voice, dont: toLines(v) } }), 5)}
          </div>
          {area(T.pillars, draft.pillars.map((p) => (p.description ? `${p.name}: ${p.description}` : p.name)).join("\n"),
            (v) => upd({ pillars: toLines(v).slice(0, 6).map((x) => { const i = x.indexOf(":"); return i > 0 ? { name: x.slice(0, i).trim(), description: x.slice(i + 1).trim() } : { name: x, description: "" }; }) }), 6)}
          <div className="space-y-2">
            <Label>{T.formats}</Label>
            {(["post", "carousel", "reel", "story"] as const).map((f) => (
              <div key={f} className="flex gap-2 items-start">
                <Badge variant="secondary" className="mt-2 w-20 justify-center capitalize">{f}</Badge>
                <Textarea rows={2} value={draft.formats[f]} onChange={(e) => upd({ formats: { ...draft.formats, [f]: e.target.value } })} className="bg-secondary border-border" />
              </div>
            ))}
          </div>
          {area(T.visual, draft.visual, (v) => upd({ visual: v }))}
          {area(T.sample, draft.sampleCopy, (v) => upd({ sampleCopy: v }), 5)}

          <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
            <Button variant="outline" disabled={busy === "test"} onClick={runTest} className="w-full sm:w-auto">
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{T.testCopy}
            </Button>
            <p className="text-xs text-muted-foreground">{T.testCost}</p>
            {testCopy && (
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>{T.testResult}</Label>
                  <Button size="sm" variant="ghost" onClick={async () => { await copyToClipboard(testCopy); toast({ title: T.copied }); }}><Copy className="h-4 w-4" /></Button></div>
                <p className="whitespace-pre-wrap text-sm bg-secondary rounded-lg p-3">{testCopy}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="h-12" onClick={() => { setStep(0); setView("wizard"); }}><ArrowLeft className="h-4 w-4" />{T.back}</Button>
            <Button variant="outline" className="h-12" disabled={busy === "save"} onClick={saveDraft}>{T.saveDraft}</Button>
            <Button variant="gradient" className="h-12 flex-1" disabled={busy === "approve"} onClick={approve}>
              {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{T.approve}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
