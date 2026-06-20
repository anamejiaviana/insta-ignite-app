import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const tryFlow = async (fn: () => Promise<any>) => {
      try {
        const res = await fn();
        return !res?.error;
      } catch {
        return false;
      }
    };

    const initRecovery = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
      );

      // Implicit hash flow (most common for recovery): #access_token=...
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        await tryFlow(() =>
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        );
        window.history.replaceState({}, "", url.pathname + url.search);
      }

      // PKCE flow: ?code=...
      const code = url.searchParams.get("code");
      if (code) {
        await tryFlow(() => supabase.auth.exchangeCodeForSession(code));
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.search);
      }

      // OTP token hash flow: ?token_hash=...&type=recovery
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type");
      if (tokenHash && type) {
        await tryFlow(() =>
          supabase.auth.verifyOtp({ type: type as any, token_hash: tokenHash })
        );
        url.searchParams.delete("token_hash");
        url.searchParams.delete("type");
        window.history.replaceState({}, "", url.pathname + url.search);
      }

      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        return;
      }
      // Give onAuthStateChange a moment before declaring the link invalid
      setTimeout(async () => {
        if (cancelled) return;
        const { data: d2 } = await supabase.auth.getSession();
        if (d2.session) setReady(true);
        else setSessionError("invalid");
      }, 2500);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setSessionError(null);
      }
    });

    initRecovery();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ variant: "destructive", title: t("passwordTooShort") });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: t("passwordsDoNotMatch") });
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error(t("resetLinkInvalid"));
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: t("passwordUpdated"), description: t("passwordUpdatedDesc") });
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md mx-auto">
        <div className="glass rounded-2xl p-8 shadow-elevated animate-scale-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold gradient-text mb-2">{t("resetPasswordTitle")}</h2>
            <p className="text-muted-foreground text-sm">
              {sessionError
                ? t("resetLinkInvalid")
                : ready
                ? t("resetPasswordSubtitle")
                : t("resetPasswordWaiting")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t("newPasswordLabel")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-secondary border-border focus:border-primary"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium">
                {t("confirmPasswordLabel")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10 pr-10 bg-secondary border-border focus:border-primary"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {t("updatePasswordButton")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("backToLogin")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
