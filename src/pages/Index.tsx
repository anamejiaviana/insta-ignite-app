import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/auth/AuthForm";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClientProvider } from "@/contexts/ClientContext";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Dashboard from "./Dashboard";
import CreateContent from "./CreateContent";
import Strategy from "./Strategy";
import ReelIdeas from "./ReelIdeas";
import HookGenerator from "./HookGenerator";
import ContentCalendar from "./ContentCalendar";
import ShootingDay from "./ShootingDay";
import Library from "./Library";
import MediaLibrary from "./MediaLibrary";
import Settings from "./Settings";
import Plans from "./Plans";
import NotFound from "./NotFound";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  return (
    <ClientProvider userId={user.id}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="create" element={<CreateContent />} />
          <Route path="strategy" element={<Strategy />} />
          <Route path="strategy/reels" element={<ReelIdeas />} />
          <Route path="strategy/hooks" element={<HookGenerator />} />
          <Route path="strategy/calendar" element={<ContentCalendar />} />
          <Route path="shooting" element={<ShootingDay />} />
          <Route path="library" element={<Library />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="settings" element={<Settings />} />
          <Route path="plans" element={<Plans />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ClientProvider>
  );
};

export default Index;
