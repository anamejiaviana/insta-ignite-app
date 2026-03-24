import { useNavigate } from "react-router-dom";
import { useClients } from "@/contexts/ClientContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, Film, Zap } from "lucide-react";

export default function Strategy() {
  const navigate = useNavigate();
  const { activeClient } = useClients();
  const { t } = useLanguage();

  const strategies = [
    {
      title: t("strategyWeeklyCalendar"),
      description: t("strategyWeeklyCalendarDesc"),
      icon: Calendar,
      path: "/strategy/calendar",
    },
    {
      title: t("strategyReelIdeas"),
      description: t("strategyReelIdeasDesc"),
      icon: Film,
      path: "/strategy/reels",
    },
    {
      title: t("strategyHookGenerator"),
      description: t("strategyHookGeneratorDesc"),
      icon: Zap,
      path: "/strategy/hooks",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("strategy")}</h1>
        {activeClient && (
          <p className="text-muted-foreground mt-1">
            {t("strategyPlanningFor")}{" "}
            <span className="text-primary font-medium">{activeClient.name}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((s) => (
          <button
            key={s.path}
            onClick={() => navigate(s.path)}
            className="glass glass-hover rounded-2xl p-6 text-left transition-all hover:shadow-glow group"
          >
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "var(--gradient-primary)" }}
            >
              <s.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
              {s.title}
            </h3>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </button>
        ))}
      </div>

      {/* Content Matrix Reference */}
      <div className="glass rounded-2xl p-6 mt-8">
        <h3 className="font-semibold text-lg mb-4">{t("strategyContentMatrix")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium"></th>
                <th className="text-left py-2 px-4 text-muted-foreground font-medium">{t("discover")}</th>
                <th className="text-left py-2 px-4 text-muted-foreground font-medium">{t("trust")}</th>
                <th className="text-left py-2 px-4 text-muted-foreground font-medium">{t("buy")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium">{t("strategyEducational")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyTipsTutorials")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyProcessExpertise")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyComparativesGuides")}</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium">{t("strategyEntertainment")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyTrendsHumor")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyBehindScenes")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyExperiencesUGC")}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">{t("strategyProduct")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyDemosReveals")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyTestimonialsCases")}</td>
                <td className="py-3 px-4 text-muted-foreground">{t("strategyOffersCTAs")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
