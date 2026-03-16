import { useNavigate } from "react-router-dom";
import { useClients } from "@/contexts/ClientContext";
import { Calendar, Film, Zap, PenSquare } from "lucide-react";

const strategies = [
  {
    title: "Calendario mensual",
    description: "Planifica el contenido del mes con la matriz de contenido",
    icon: Calendar,
    path: "/strategy/calendar",
  },
  {
    title: "Ideas de reels",
    description: "Genera 10 ideas de reels adaptadas al cliente",
    icon: Film,
    path: "/strategy/reels",
  },
  {
    title: "Generador de hooks",
    description: "Crea hooks irresistibles para tus contenidos",
    icon: Zap,
    path: "/strategy/hooks",
  },
  {
    title: "Ideas de posts",
    description: "Obtén ideas frescas de posts para el feed",
    icon: PenSquare,
    path: "/strategy/posts",
  },
];

export default function Strategy() {
  const navigate = useNavigate();
  const { activeClient } = useClients();

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Estrategia</h1>
        {activeClient && (
          <p className="text-muted-foreground mt-1">
            Planificación para{" "}
            <span className="text-primary font-medium">{activeClient.name}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <h3 className="font-semibold text-lg mb-4">Matriz de contenido</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium"></th>
                <th className="text-left py-2 px-4 text-muted-foreground font-medium">Descubrir</th>
                <th className="text-left py-2 px-4 text-muted-foreground font-medium">Confiar</th>
                <th className="text-left py-2 px-4 text-muted-foreground font-medium">Comprar</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium">Educativo</td>
                <td className="py-3 px-4 text-muted-foreground">Tips, tutoriales</td>
                <td className="py-3 px-4 text-muted-foreground">Procesos, expertise</td>
                <td className="py-3 px-4 text-muted-foreground">Comparativas, guías</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium">Entretenimiento</td>
                <td className="py-3 px-4 text-muted-foreground">Tendencias, humor</td>
                <td className="py-3 px-4 text-muted-foreground">Behind the scenes</td>
                <td className="py-3 px-4 text-muted-foreground">Experiencias, UGC</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">Producto</td>
                <td className="py-3 px-4 text-muted-foreground">Demos, reveals</td>
                <td className="py-3 px-4 text-muted-foreground">Testimonios, casos</td>
                <td className="py-3 px-4 text-muted-foreground">Ofertas, CTAs directos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
