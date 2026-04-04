import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useClients, Client } from "@/contexts/ClientContext";
import { useLanguage, UILanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Save, X, Loader2, Globe, Lock } from "lucide-react";
import { useUserPlan } from "@/hooks/useUserPlan";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BUSINESS_TYPES = [
  "restaurante",
  "tienda",
  "clínica",
  "interiorismo",
  "belleza",
  "gimnasio",
  "cafetería",
  "panadería",
  "hotel",
  "otro",
];

const CONTENT_LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "ca", label: "Català" },
  { value: "en", label: "English" },
];

const VISUAL_STYLES = [
  "fotografía gourmet",
  "lifestyle",
  "minimalista",
  "editorial",
  "instagram moderno",
  "dark mood",
  "fondo claro",
];

const UI_LANGUAGES: { value: UILanguage; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

interface ClientForm {
  name: string;
  type: string;
  city: string;
  address: string;
  tone: string;
  objective: string;
  keywords: string;
  default_visual_style: string;
  content_language: string;
  inspiration_account: string;
  extra_context: string;
}

const emptyForm: ClientForm = {
  name: "",
  type: "",
  city: "",
  address: "",
  tone: "",
  objective: "",
  keywords: "",
  default_visual_style: "",
  content_language: "es",
  inspiration_account: "",
  extra_context: "",
};

export default function Settings() {
  const { clients, refreshClients } = useClients();
  const { t, uiLanguage, setUILanguage } = useLanguage();
  const { toast } = useToast();
  const { plan, canAddBusiness } = useUserPlan();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      type: client.type || "",
      city: client.city || "",
      address: client.address || "",
      tone: client.tone || "",
      objective: client.objective || "",
      keywords: (client.keywords || []).join(", "),
      default_visual_style: client.default_visual_style || "",
      content_language: client.content_language || "es",
      inspiration_account: client.inspiration_account || "",
      extra_context: (client as any).extra_context || "",
    });
    setShowForm(true);
  };

  const startNew = () => {
    if (!canAddBusiness(clients.length)) {
      const limit = plan?.business_limit ?? 1;
      toast({
        variant: "destructive",
        title: `Tu plan actual incluye ${limit} negocio${limit > 1 ? "s" : ""}`,
        description: "Para añadir otra cuenta, necesitas ampliar tu plan.",
      });
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const saveClient = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: t("nameRequired") });
      return;
    }

    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No user");

      const payload: any = {
        name: form.name,
        type: form.type || null,
        city: form.city || null,
        address: form.address || null,
        tone: form.tone || null,
        objective: form.objective || null,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        default_visual_style: form.default_visual_style || null,
        content_language: form.content_language || "es",
        inspiration_account: form.inspiration_account || null,
        extra_context: form.extra_context || null,
      };

      if (editingId) {
        const { error } = await (supabase as any).from("clients").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: t("businessUpdated") });
      } else {
        payload.user_id = user.id;
        const { error } = await (supabase as any).from("clients").insert(payload);
        if (error) throw error;
        toast({ title: t("businessCreated") });
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await refreshClients();
    } catch (error: any) {
      toast({ variant: "destructive", title: t("errorSavingBusiness"), description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async (id: string) => {
    const { error } = await (supabase as any).from("clients").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: t("errorDeletingBusiness") });
    } else {
      toast({ title: t("businessDeleted") });
      await refreshClients();
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">{t("settings")}</h1>

      {/* Interface Language */}
      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("interfaceLanguage")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("interfaceLanguageDesc")}</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {UI_LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setUILanguage(lang.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  uiLanguage === lang.value
                    ? "text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                style={uiLanguage === lang.value ? { background: "var(--gradient-primary)" } : undefined}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("myBusinesses")}</CardTitle>
          <Button variant="gradient" size="sm" onClick={startNew}>
            <Plus className="h-4 w-4 mr-1" />
            {t("addBusiness")}
          </Button>
        </CardHeader>
        <CardContent>
          {clients.length === 0 && !showForm && (
            <p className="text-muted-foreground text-sm">
              {t("addBusinessToStart")}
            </p>
          )}

          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 group"
              >
                <div>
                  <p className="font-medium text-sm">{client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[client.type, client.city].filter(Boolean).join(" · ")}
                    {client.content_language && ` · ${CONTENT_LANGUAGES.find(l => l.value === client.content_language)?.label || client.content_language}`}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(client)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteBusinessTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("deleteBusinessWarning")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteClient(client.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t("confirmDelete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

          {showForm && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {editingId ? t("editBusiness") : t("newBusiness")}
                </h4>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setShowForm(false); setForm(emptyForm); setEditingId(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("businessName")}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("businessType")}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((bt) => (
                        <SelectItem key={bt} value={bt}>{bt.charAt(0).toUpperCase() + bt.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("city")}</Label>
                  <Input placeholder={t("cityPlaceholder")} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-secondary border-border h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("contentLanguage")}</Label>
                  <Select value={form.content_language} onValueChange={(v) => setForm({ ...form, content_language: v })}>
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("businessAddress")}</Label>
                <Input placeholder={t("addressPlaceholder")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-secondary border-border h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("inspirationAccount")}</Label>
                <Input placeholder={t("inspirationPlaceholder")} value={form.inspiration_account} onChange={(e) => setForm({ ...form, inspiration_account: e.target.value })} className="bg-secondary border-border h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("brandTone")}</Label>
                <Input placeholder={t("tonePlaceholder")} value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} className="bg-secondary border-border h-9" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("objectiveSetting")}</Label>
                  <Input placeholder={t("objectivePlaceholder")} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} className="bg-secondary border-border h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("visualStyleSetting")}</Label>
                  <Select value={form.default_visual_style} onValueChange={(v) => setForm({ ...form, default_visual_style: v })}>
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue placeholder={t("select")} />
                    </SelectTrigger>
                    <SelectContent>
                      {VISUAL_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("keywords")}</Label>
                <Input placeholder={t("keywordsPlaceholder")} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className="bg-secondary border-border h-9" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("extraContext")}</Label>
                <Textarea
                  placeholder={t("extraContextPlaceholder")}
                  value={form.extra_context}
                  onChange={(e) => setForm({ ...form, extra_context: e.target.value })}
                  className="bg-secondary border-border min-h-[80px] text-sm"
                />
                <p className="text-[11px] text-muted-foreground leading-tight mt-1">
                  {t("extraContextHelper")}
                </p>
              </div>

              <Button variant="gradient" size="sm" onClick={saveClient} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? t("update") : t("createBusiness")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
