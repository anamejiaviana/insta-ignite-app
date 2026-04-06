import {
  LayoutDashboard,
  PenSquare,
  Calendar,
  Camera,
  FolderOpen,
  Settings,
  CreditCard,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage, TranslationKey } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const items: { titleKey: TranslationKey; url: string; icon: any }[] = [
  { titleKey: "dashboard", url: "/", icon: LayoutDashboard },
  { titleKey: "createContent", url: "/create", icon: PenSquare },
  { titleKey: "calendar", url: "/strategy/calendar", icon: Calendar },
  { titleKey: "shootingDay", url: "/shooting", icon: Camera },
  { titleKey: "library", url: "/library", icon: FolderOpen },
  { titleKey: "settings", url: "/settings", icon: Settings },
  { titleKey: "plansNav", url: "/plans", icon: CreditCard },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (url: string) => {
    navigate(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            <span className="text-primary-foreground font-bold text-sm">II</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-lg gradient-text">Insta-Ignite</span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => handleNavigation(item.url)}
                      className={cn(
                        "flex items-center w-full hover:bg-sidebar-accent/50",
                        isActive(item.url) && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{t(item.titleKey)}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
