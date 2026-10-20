import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildGuideContext, normalizeManual } from "@/lib/editorialGuide";

export interface Client {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  tone: string | null;
  objective: string | null;
  keywords: string[];
  default_visual_style: string | null;
  content_language: string;
  inspiration_account: string | null;
  extra_context: string | null;
  /** Compact text of the owner-APPROVED editorial manual (empty if none). Never saved back to clients. */
  editorial_guide_text?: string;
  created_at: string;
  updated_at: string;
}

interface ClientContextType {
  clients: Client[];
  activeClient: Client | null;
  setActiveClientId: (id: string) => void;
  refreshClients: () => Promise<void>;
  loading: boolean;
}

const ClientContext = createContext<ClientContextType | null>(null);

export function useClients() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClients must be used within ClientProvider");
  return ctx;
}

export function ClientProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [activeClientId, setActiveClientId] = useState<string | null>(() => {
    return localStorage.getItem("anypostly-active-client") || localStorage.getItem("insta-ignite-active-client") || null;
  });
  const [loading, setLoading] = useState(true);

  const refreshClients = async () => {
    const { data } = await (supabase as any)
      .from("clients")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    const { data: guides } = await (supabase as any)
      .from("editorial_guides")
      .select("client_id, approved")
      .eq("user_id", userId)
      .not("approved", "is", null);
    const guideMap = new Map<string, string>(
      ((guides as any[]) || []).map((g) => [g.client_id, buildGuideContext(normalizeManual(g.approved))])
    );
    if (data) {
      const mapped = (data as any[]).map((c: any) => ({
        ...c,
        keywords: (c.keywords as string[]) || [],
        content_language: c.content_language || "es",
        editorial_guide_text: guideMap.get(c.id) || "",
      })) as Client[];
      setClients(mapped);
      if (!activeClientId && mapped.length > 0) {
        setActiveClientId(mapped[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshClients();
  }, [userId]);

  useEffect(() => {
    if (activeClientId) {
      localStorage.setItem("anypostly-active-client", activeClientId);
    }
  }, [activeClientId]);

  const activeClient = clients.find((c) => c.id === activeClientId) || null;

  return (
    <ClientContext.Provider
      value={{ clients, activeClient, setActiveClientId, refreshClients, loading }}
    >
      {children}
    </ClientContext.Provider>
  );
}
