import { Check, ChevronRight, Plus } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { SectionLabel } from "./Sidebar";

export const priorityStyles = {
  high: "border-red-400/25 bg-red-400/10 text-red-300",
  medium: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  low: "border-blue-400/25 bg-blue-400/10 text-blue-300",
};

export function TaskLinePanel({
  tasks,
  tasksQuery,
  newTaskTitle,
  setNewTaskTitle,
  taskMutation,
  toggleMutation,
  submitTask,
}) {
  return (
    <Card className="border-white/10 bg-[#131b2a]" data-testid="tasks-panel">
      <CardHeader className="flex flex-row items-start justify-between p-6 pb-2">
        <div>
          <SectionLabel>Today / execution</SectionLabel>
          <CardTitle className="mt-2 font-heading text-2xl tracking-tight text-slate-50" data-testid="tasks-panel-title">
            Your task line
          </CardTitle>
          <p className="mt-1 text-sm text-slate-500" data-testid="tasks-panel-description">
            Small, owned actions that move the week forward.
          </p>
        </div>
        <Badge variant="outline" className="border-white/10 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
          {tasks.length} records
        </Badge>
      </CardHeader>
      <CardContent className="p-6 pt-5">
        <form onSubmit={submitTask} className="mb-5 flex gap-2" data-testid="task-create-form">
          <Input
            data-testid="task-title-input"
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            placeholder="Add a task to your line…"
            className="h-11 border-white/10 bg-[#0b0f17] text-slate-100 placeholder:text-slate-600 focus-visible:ring-emerald-400/50"
            maxLength={180}
          />
          <Button
            type="submit"
            data-testid="task-create-button"
            disabled={!newTaskTitle.trim() || taskMutation.isPending}
            className="h-11 shrink-0 bg-emerald-400 px-4 text-[#07110f] hover:bg-emerald-300 hover:text-[#07110f]"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add task</span>
          </Button>
        </form>

        <div className="space-y-2" data-testid="task-list">
          {tasksQuery.isPending ? (
            <p className="py-8 text-sm text-slate-500" data-testid="task-list-loading">
              Loading owned tasks…
            </p>
          ) : tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 py-10 text-center" data-testid="task-list-empty">
              <p className="text-sm text-slate-400">Your line is clear.</p>
              <p className="mt-1 text-xs text-slate-600">Add the next useful action above.</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-lg border border-white/[0.07] bg-[#0f1622] p-3 transition-transform duration-150 hover:-translate-y-0.5 hover:border-emerald-400/30"
                data-testid={`task-item-${task.id}`}
              >
                <button
                  type="button"
                  data-testid={`task-item-checkbox-${task.id}`}
                  onClick={() => toggleMutation.mutate(task)}
                  className={`grid size-5 shrink-0 place-items-center rounded-md border transition-transform duration-150 hover:scale-105 ${
                    task.completed
                      ? "border-emerald-400 bg-emerald-400 text-[#07110f]"
                      : "border-slate-600 text-transparent hover:border-emerald-400"
                  }`}
                  aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                >
                  {task.completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </button>
                <span
                  className={`min-w-0 flex-1 text-sm ${task.completed ? "text-slate-600 line-through" : "text-slate-200"}`}
                  data-testid={`task-item-title-${task.id}`}
                >
                  {task.title}
                </span>
                <Badge
                  variant="outline"
                  className={`font-mono text-[9px] uppercase tracking-[0.13em] ${priorityStyles[task.priority] || priorityStyles.medium}`}
                  data-testid={`task-item-priority-${task.id}`}
                >
                  {task.priority}
                </Badge>
                <ChevronRight className="size-4 text-slate-700 transition-transform group-hover:translate-x-0.5" />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
