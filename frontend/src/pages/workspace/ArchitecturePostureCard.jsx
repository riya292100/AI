import { BadgeCheck, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { SectionLabel } from "./Sidebar";

export function ArchitecturePostureCard() {
  return (
    <Card className="border-emerald-400/20 bg-emerald-400/[0.06]" data-testid="arch-status-banner">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center justify-between">
          <SectionLabel>Architecture posture</SectionLabel>
          <BadgeCheck className="size-5 text-emerald-300" />
        </div>
        <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="arch-status-title">
          Hardened baseline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-3">
        <div className="space-y-3 text-sm">
          {[
            "React 19 + Vite + strict TypeScript",
            "FastAPI + Pydantic v2 contracts",
            "MongoDB ownership filters + indexes",
            "HttpOnly session + CSRF boundary",
          ].map((item) => (
            <div
              className="flex items-center gap-2 text-slate-300"
              key={item}
              data-testid={`arch-status-item-${item.slice(0, 8).toLowerCase().replaceAll(" ", "-")}`}
            >
              <Check className="size-3.5 text-emerald-300" />
              {item}
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-white/10 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300" data-testid="arch-status-mocked-note">
          Firebase, AI, and private object storage are MOCKED / extension points
        </p>
      </CardContent>
    </Card>
  );
}
