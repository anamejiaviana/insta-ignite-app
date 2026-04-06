import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";

export function AppLayout() {
  const { clients, activeClient, setActiveClientId } = useClients();
  const { t } = useLanguage();
  const [switching, setSwitching] = useState(false);

  // Brief loading indicator when switching business
  const handleClientChange = (id: string) => {
    setSwitching(true);
    setActiveClientId(id);
  };

  useEffect(() => {
    if (switching) {
      const timer = setTimeout(() => setSwitching(false), 600);
      return () => clearTimeout(timer);
    }
  }, [activeClient, switching]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 shrink-0 bg-card/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground" />
              {clients.length > 1 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={activeClient?.id || ""}
                    onValueChange={handleClientChange}
                  >
                    <SelectTrigger className="w-[140px] sm:w-[220px] bg-secondary border-border h-9">
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {switching && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                  )}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {switching ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 animate-fade-in">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{t("loadingBusiness")}</span>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
