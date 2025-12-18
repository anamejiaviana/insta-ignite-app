import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/AuthForm";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { BrandConfigForm } from "@/components/brand/BrandConfigForm";
import { PostGenerator } from "@/components/post/PostGenerator";
import { PostHistory } from "@/components/history/PostHistory";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface BrandConfig {
  brand_name?: string;
  brand_voice?: string;
  visual_style?: string;
  default_language?: string;
  color_palette?: string[];
  logo_url?: string | null;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("generator");
  const [brandConfig, setBrandConfig] = useState<BrandConfig | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadBrandConfig();
    }
  }, [user]);

  const loadBrandConfig = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("brand_configs")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setBrandConfig({
        ...data,
        color_palette: (data.color_palette as string[]) || [],
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>
        <AuthForm />
      </div>
    );
  }

  const userName = user.user_metadata?.full_name || user.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-background">
      <Header
        onSettingsClick={() => setActiveTab("settings")}
        userName={userName}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="max-w-4xl mx-auto">
          {activeTab === "generator" && (
            <div className="glass rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">Crear nuevo post</h2>
              <PostGenerator userId={user.id} brandConfig={brandConfig} />
            </div>
          )}

          {activeTab === "history" && (
            <div className="glass rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">Historial de posts</h2>
              <PostHistory userId={user.id} />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="glass rounded-2xl p-6 md:p-8 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">Configuración de marca</h2>
              <BrandConfigForm userId={user.id} onSave={loadBrandConfig} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
