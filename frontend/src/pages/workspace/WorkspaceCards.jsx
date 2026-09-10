import { Activity, ArrowUpRight, Check, FileLock2, MessageSquareText, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { SectionLabel } from "./Sidebar";

export function CoreModulesCard({
  workspaceItems,
  workspaceQuery,
  moduleTitle,
  setModuleTitle,
  moduleCategory,
  setModuleCategory,
  submitModule,
  moduleMutation,
  moduleToggleMutation,
}) {
  return (
    <Card className="border-white/10 bg-[#131b2a]" data-testid="core-modules-card">
      <CardHeader className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Core modules</SectionLabel>
            <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="core-modules-title">
              Keep the rest in view
            </CardTitle>
          </div>
          <Badge variant="outline" className="border-white/10 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400" data-testid="core-modules-count">
            {workspaceItems.length} records
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <form onSubmit={submitModule} className="space-y-2" data-testid="core-module-create-form">
          <Input
            data-testid="module-title-input"
            value={moduleTitle}
            onChange={(event) => setModuleTitle(event.target.value)}
            placeholder="Add a module record…"
            className="border-white/10 bg-[#0b0f17] text-slate-100 placeholder:text-slate-600"
            maxLength={180}
          />
          <div className="flex gap-2">
            <select
              data-testid="module-category-select"
              value={moduleCategory}
              onChange={(event) => setModuleCategory(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-[#0b0f17] px-3 text-xs text-slate-300 outline-none focus:border-emerald-400"
            >
              <option value="reminder">Reminder</option>
              <option value="finance">Finance</option>
              <option value="calendar">Calendar</option>
              <option value="habit">Habit</option>
              <option value="shopping">Shopping</option>
            </select>
            <Button
              type="submit"
              data-testid="module-create-button"
              disabled={!moduleTitle.trim() || moduleMutation.isPending}
              className="h-10 bg-emerald-400 px-3 text-[#07110f] hover:bg-emerald-300 hover:text-[#07110f]"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </form>

        <div className="mt-4 max-h-52 space-y-2 overflow-auto" data-testid="workspace-item-list">
          {workspaceQuery.isPending ? (
            <p className="py-4 text-xs text-slate-600" data-testid="workspace-item-loading">
              Loading module records…
            </p>
          ) : workspaceItems.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-white/[0.07] bg-[#0f1622] p-2.5"
              data-testid={`workspace-item-${item.id}`}
            >
              <button
                type="button"
                data-testid={`workspace-item-toggle-${item.id}`}
                onClick={() => moduleToggleMutation.mutate(item)}
                className={`grid size-4 shrink-0 place-items-center rounded border ${
                  item.status === "done"
                    ? "border-emerald-400 bg-emerald-400 text-[#07110f]"
                    : "border-slate-600 text-transparent"
                }`}
                aria-label={`Mark ${item.title} ${item.status === "done" ? "open" : "done"}`}
              >
                <Check className="size-3" />
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-xs ${item.status === "done" ? "text-slate-600 line-through" : "text-slate-300"}`}
                  data-testid={`workspace-item-title-${item.id}`}
                >
                  {item.title}
                </p>
                <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-600">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DailyReviewCard({ dailyReview, reviewQuery }) {
  return (
    <Card className="border-amber-400/20 bg-amber-400/[0.05]" data-testid="daily-review-card">
      <CardHeader className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Daily review</SectionLabel>
            <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="daily-review-title">
              A softer landing
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            data-testid="daily-review-refresh-button"
            onClick={() => reviewQuery.refetch()}
            aria-label="Refresh daily review"
          >
            <Activity className="size-4 text-amber-300" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        {dailyReview ? (
          <>
            <div className="flex items-end justify-between">
              <p className="font-heading text-3xl font-semibold text-amber-200" data-testid="daily-review-open-count">
                {dailyReview.open_tasks + dailyReview.open_modules}
              </p>
              <Badge variant="outline" className="border-amber-400/20 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-300" data-testid="daily-review-local-badge">
                LOCAL / {dailyReview.date}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500" data-testid="daily-review-summary">
              open threads across tasks and life modules
            </p>
            <div className="mt-4 space-y-2">
              {dailyReview.next_actions.slice(0, 3).map((action, index) => (
                <p key={`${action}-${index}`} className="flex gap-2 text-xs leading-relaxed text-slate-300" data-testid={`daily-review-next-action-${index}`}>
                  <span className="font-mono text-amber-300">0{index + 1}</span>
                  {action}
                </p>
              ))}
            </div>
          </>
        ) : (
          <p className="py-6 text-xs text-slate-600" data-testid="daily-review-loading">
            Generating local review…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function AiAssistantCard({ aiPrompt, setAiPrompt, submitAi, sendAiPrompt, aiNotice }) {
  return (
    <Card className="border-white/10 bg-[#131b2a]" data-testid="ai-assistant-card">
      <CardHeader className="p-6 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-300" />
          <SectionLabel>Scoped assistant</SectionLabel>
        </div>
        <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="ai-assistant-title">
          Think with less noise
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-3">
        <form onSubmit={submitAi} className="space-y-3" data-testid="ai-prompt-form">
          <Input
            data-testid="ai-prompt-input"
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            placeholder="Ask about your next move…"
            className="border-white/10 bg-[#0b0f17] text-slate-100 placeholder:text-slate-600"
          />
          <Button
            type="button"
            onClick={sendAiPrompt}
            variant="outline"
            data-testid="ai-send-button"
            className="w-full border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <MessageSquareText className="mr-2 size-4" />
            Ask assistant{" "}
            <Badge variant="outline" className="ml-auto border-amber-400/20 font-mono text-[8px] text-amber-300">
              MOCKED
            </Badge>
          </Button>
        </form>
        {aiNotice ? (
          <p className="mt-3 text-xs leading-relaxed text-amber-300" data-testid="ai-mocked-status">
            {aiNotice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DocumentUploadCard({ documentNotice, setDocumentNotice }) {
  return (
    <Card className="border-white/10 bg-[#131b2a]" data-testid="document-upload-card">
      <CardHeader className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Private documents</SectionLabel>
            <CardTitle className="mt-2 font-heading text-xl text-slate-50" data-testid="document-upload-title">
              Keep important things close
            </CardTitle>
          </div>
          <FileLock2 className="size-5 text-emerald-300" />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <label
          htmlFor="document-upload"
          className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-white/15 bg-[#0f1622] p-4 transition-colors hover:border-emerald-400/40"
          data-testid="document-upload-dropzone"
        >
          <span>
            <span className="block text-sm text-slate-300">Upload a private document</span>
            <span className="mt-1 block text-xs text-slate-600">Encrypted object storage connector pending</span>
          </span>
          <ArrowUpRight className="size-4 text-slate-500" />
        </label>
        <input
          id="document-upload"
          type="file"
          className="sr-only"
          data-testid="document-file-input"
          onChange={() => {
            setDocumentNotice("Document storage is an extension point");
            toast("Document storage is an extension point", {
              description: "No file was uploaded in MOCKED preview mode.",
            });
          }}
        />
        {documentNotice ? (
          <p className="mt-3 text-xs leading-relaxed text-amber-300" data-testid="document-mocked-status">
            {documentNotice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
