import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClients, Client } from "@/contexts/ClientContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Save, X, Loader2 } from "lucide-react";

const VISUAL_STYLES = [
  "fotografía gourmet",
  "lifestyle",
  "minimalista",
  "editorial",
  "instagram moderno",
  "dark mood",
  "fondo claro",
];

const DEMO_CLIENTS = [
  { name: "Colmado Giner", type: "tienda gourmet", city: "Reus", tone: "cercano, gourmet, local, elegante pero accesible", objective: "atraer clientes locales y promocionar productos y catas", keywords: ["gourmet", "Reus", "productos locales", "catas", "vino", "quesos"] },
  { name: "TC Interior", type: "interiorismo y reformas", city: "Reus", tone: "profesional, inspirador, visual", objective: "mostrar proyectos y captar clientes en Tarragona", keywords: ["interiorismo", "reformas", "Reus", "Tarragona", "diseño interior"] },
  { name: "Clínica Dental Mediterránea", type: "clínica dental", city: "Vila-seca y Reus", tone: "profesional, humano, tranquilizador", objective: "transmitir confianza y captar pacientes", keywords: ["dentista", "clínica dental", "Vila-seca", "Reus", "salud dental"] },
  { name: "Vermuts Rofes", type: "restaurante y espacio gastronómico", city: "Reus", tone: "auténtico, elegante, cultural", objective: "atraer público local y mostrar experiencia gastronómica", keywords: ["vermut", "gastronomía", "Reus", "restaurante", "experiencia"] },
  { name: "La Lleona", type: "restaurante italiano", city: "Reus", tone: "cercano, apetecible, social", objective: "atraer clientes y mostrar variedad de platos", keywords: ["italiano", "pizza", "pasta", "Reus", "restaurante"] },
];

interface ClientForm {
  name: string;
  type: string;
  city: string;
  tone: string;
  objective: string;
  keywords: string;
  default_visual_style: string;
}

const emptyForm: ClientForm = {
  name: "",
  type: "",
  city: "",
  tone: "",
  objective: "",
  keywords: "",
  default_visual_style: "",
};

export default function Settings() {
  const { clients, refreshClients } = useClients();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      type: client.type || "",
      city: client.city || "",
      tone: client.tone || "",
      objective: client.objective || "",
      keywords: (client.keywords || []).join(", "),
      default_visual_style: client.default_visual_style || "",
    });
    setShowForm(true);
  };

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const saveClient = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "El nombre es obligatorio" });
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
        tone: form.tone || null,
        objective: form.objective || null,
        keywords: form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        default_visual_style: form.default_visual_style || null,
      };

      if (editingId) {
        const { error } = await (supabase as any)
          .from("clients")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Cliente actualizado" });
      } else {
        payload.user_id = user.id;
        const { error } = await (supabase as any).from("clients").insert(payload);
        if (error) throw error;
        toast({ title: "Cliente creado" });
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await refreshClients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async (id: string) => {
    const { error } = await (supabase as any)
      .from("clients")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error al eliminar" });
    } else {
      toast({ title: "Cliente eliminado" });
      await refreshClients();
    }
  };

  const seedDemoClients = async () => {
    setSeeding(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("No user");

      const inserts = DEMO_CLIENTS.map((c) => ({
        ...c,
        user_id: user.id,
        default_visual_style: null,
      }));

      const { error } = await (supabase as any).from("clients").insert(inserts);
      if (error) throw error;
      toast({ title: "¡5 clientes demo creados!" });
      await refreshClients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al crear clientes",
        description: error.message,
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-8">Configuración</h1>

      {/* Clients Section */}
      <Card className="bg-card border-border mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Clientes</CardTitle>
          <div className="flex gap-2">
            {clients.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={seedDemoClients}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Cargar demos
              </Button>
            )}
            <Button variant="gradient" size="sm" onClick={startNew}>
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 && !showForm && (
            <p className="text-muted-foreground text-sm">
              No hay clientes. Añade uno o carga los clientes demo.
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
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => startEdit(client)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => deleteClient(client.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Client Form */}
          {showForm && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {editingId ? "Editar cliente" : "Nuevo cliente"}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setShowForm(false);
                    setForm(emptyForm);
                    setEditingId(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-secondary border-border h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Input
                    placeholder="Ej: restaurante, clínica..."
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="bg-secondary border-border h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ciudad</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="bg-secondary border-border h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Estilo visual</Label>
                  <Select
                    value={form.default_visual_style}
                    onValueChange={(v) =>
                      setForm({ ...form, default_visual_style: v })
                    }
                  >
                    <SelectTrigger className="bg-secondary border-border h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISUAL_STYLES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tono de marca</Label>
                <Input
                  placeholder="Ej: cercano, profesional, elegante..."
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  className="bg-secondary border-border h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Objetivo</Label>
                <Textarea
                  placeholder="Ej: atraer clientes locales..."
                  value={form.objective}
                  onChange={(e) =>
                    setForm({ ...form, objective: e.target.value })
                  }
                  className="bg-secondary border-border min-h-[60px]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Palabras clave (separadas por coma)</Label>
                <Input
                  placeholder="Ej: gourmet, Reus, vinos, local..."
                  value={form.keywords}
                  onChange={(e) =>
                    setForm({ ...form, keywords: e.target.value })
                  }
                  className="bg-secondary border-border h-9"
                />
              </div>

              <Button
                variant="gradient"
                size="sm"
                onClick={saveClient}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingId ? "Actualizar" : "Crear cliente"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
