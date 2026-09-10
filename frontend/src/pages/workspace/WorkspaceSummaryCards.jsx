import { FolderKanban, LockKeyhole, Target } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { SectionLabel } from "./Sidebar";

export function WorkspaceSummaryCards({ openTasksCount, completionRate }) {
  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Workspace summary">
      <Card className="border-white/10 bg-[#131b2a]" data-testid="summary-tasks-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <SectionLabel>Open tasks</SectionLabel>
            <FolderKanban className="size-4 text-emerald-300" />
          </div>
          <p className="mt-5 font-heading text-4xl font-semibold text-slate-50" data-testid="summary-open-tasks">
            {openTasksCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">indexed to your account</p>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#131b2a]" data-testid="summary-focus-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <SectionLabel>Focus completion</SectionLabel>
            <Target className="size-4 text-amber-300" />
          </div>
          <p className="mt-5 font-heading text-4xl font-semibold text-slate-50" data-testid="summary-completion-rate">
            {completionRate}%
          </p>
          <p className="mt-1 text-xs text-slate-500">this workspace snapshot</p>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#131b2a]" data-testid="summary-security-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <SectionLabel>Data boundary</SectionLabel>
            <LockKeyhole className="size-4 text-emerald-300" />
          </div>
          <p className="mt-5 font-heading text-2xl font-semibold text-emerald-300" data-testid="summary-data-boundary">
            MongoDB
          </p>
          <p className="mt-1 text-xs text-slate-500">production source of truth</p>
        </CardContent>
      </Card>
    </section>
  );
}
