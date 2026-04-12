import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings, Sparkles } from "lucide-react";

interface HeaderProps {
  onSettingsClick: () => void;
  userName?: string;
}

export function Header({ onSettingsClick, userName }: HeaderProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow [background:var(--gradient-primary)]">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Anypostly</h1>
            <p className="text-xs text-muted-foreground">Content planner</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userName && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              Hola, <span className="text-foreground">{userName}</span>
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
