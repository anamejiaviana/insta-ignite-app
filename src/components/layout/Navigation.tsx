import { cn } from "@/lib/utils";
import { Sparkles, History, Settings } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "generator", name: "Generador", icon: Sparkles },
  { id: "history", name: "Historial", icon: History },
  { id: "settings", name: "Configuración", icon: Settings },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="glass rounded-xl p-1.5 inline-flex gap-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300",
              isActive
                ? "[background:var(--gradient-primary)] text-primary-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
