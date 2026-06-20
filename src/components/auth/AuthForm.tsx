import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowRight, Loader2, Globe } from "lucide-react";
import { useLanguage, UILanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const UI_LANGUAGES: { value: UILanguage; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

type Mode = "login" | "signup" | "forgot";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t, uiLanguage, setUILanguage } = useLanguage();

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: t("welcomeBack") });
      } else if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast({ title: t("accountCreated"), description: t("accountCreatedDesc") });
      } else if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: t("resetEmailSent"), description: t("resetEmailSentDesc") });
        setMode("login");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const currentLangLabel = UI_LANGUAGES.find((l) => l.value === uiLanguage)?.label;

  const title = isForgot ? t("forgotPasswordTitle") : isLogin ? t("loginTitle") : t("signupTitle");
  const subtitle = isForgot
    ? t("forgotPasswordSubtitle")
    : isLogin
    ? t("loginSubtitle")
    : t("signupSubtitle");

  return (
    <div className="w-full max-w-md mx-auto relative">
      <div className="absolute -top-12 right-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Globe className="h-4 w-4" />
              <span className="text-sm">{currentLangLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {UI_LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.value}
                onClick={() => setUILanguage(lang.value)}
                className={uiLanguage === lang.value ? "font-semibold text-primary" : ""}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="glass rounded-2xl p-8 shadow-elevated animate-scale-in">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold gradient-text mb-2">{title}</h2>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                {t("nameLabel")}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-secondary border-border focus:border-primary"
                  required={isSignup}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t("emailLabel")}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary border-border focus:border-primary"
                required
              />
            </div>
          </div>

          {!isForgot && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t("passwordLabel")}
                </Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("forgotPasswordLink")}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary border-border focus:border-primary"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isForgot ? t("sendResetLink") : isLogin ? t("loginButton") : t("signupButton")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          {isForgot ? (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← <span className="text-primary font-medium">{t("backToLogin")}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode(isLogin ? "signup" : "login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? t("noAccount") : t("hasAccount")}
              <span className="text-primary font-medium">
                {isLogin ? t("registerLink") : t("loginLink")}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
