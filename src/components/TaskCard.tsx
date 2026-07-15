import { cn, getBRTToday } from "@/lib/utils";
import { AlertTriangle, Calendar, CheckCircle2, Link2, ArrowRight, ArrowLeft, FolderOpen, Clock, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PriorityDot } from "./PriorityBadge";
import type { FullTask, ProfileWithSector } from "@/hooks/useTaskData";
import type { TaskKanbanHistoryRecord } from "@/hooks/useTaskData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskCardProps {
  task: FullTask;
  onClick: (task: FullTask) => void;
  showLinked?: boolean;
  linkedCollectionName?: string | null;
  linkedDirection?: "outgoing" | "incoming" | null;
  projectName?: string | null;
  kanbanHistory?: TaskKanbanHistoryRecord[];
  dailyWorkHours?: number;
  weekendDays?: number[];
  holidays?: string[];
  isDoneColumn?: boolean;
  onDelete?: (task: FullTask) => void;
  profiles?: ProfileWithSector[];
}

function isOverdue(task: FullTask, isDoneColumn?: boolean): boolean {
  if (isDoneColumn) return false;
  if (!task.due_date) return false;
  return task.due_date < getBRTToday();
}

function calcWorkHours(from: Date, to: Date, dailyHours: number, weekendDays: number[], holidays: Set<string>): number {
  let hours = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const endDate = new Date(to);
  endDate.setHours(0, 0, 0, 0);
  while (d <= endDate) {
    const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const isOff = weekendDays.includes(d.getDay()) || holidays.has(dk);
    if (!isOff) hours += dailyHours;
    d.setDate(d.getDate() + 1);
  }
  return hours;
}

export function TaskCard({ task, onClick, showLinked, linkedCollectionName, linkedDirection, projectName, kanbanHistory, dailyWorkHours = 8, weekendDays = [0, 6], holidays = [], isDoneColumn = false, onDelete, profiles = [] }: TaskCardProps) {
  const overdue = isOverdue(task, isDoneColumn);
  const subtasksDone = task.subtasks?.filter(s => s.is_done).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;
  const hasActiveImpediment = task.impediments?.some(imp => !imp.resolved_at) || false;

  // Calculate kanban time exceeded
  let kanbanExceededHours = 0;
  let totalExceededHours = 0;
  const holidaySet = new Set(holidays);

  if (kanbanHistory && kanbanHistory.length > 0) {
    // Current (open) record
    const currentRec = kanbanHistory.find(r => !r.exited_at);
    if (currentRec && currentRec.time_limit_hours && currentRec.time_limit_hours > 0) {
      const workHrs = calcWorkHours(new Date(currentRec.entered_at), new Date(), dailyWorkHours, weekendDays, holidaySet);
      if (workHrs > currentRec.time_limit_hours) {
        kanbanExceededHours = Math.round((workHrs - currentRec.time_limit_hours) * 10) / 10;
      }
    }

    // Total duration exceeded
    const taskDuration = (task as any).duration_hours;
    if (taskDuration && taskDuration > 0) {
      let totalWorkHours = 0;
      for (const rec of kanbanHistory) {
        const entered = new Date(rec.entered_at);
        const exited = rec.exited_at ? new Date(rec.exited_at) : new Date();
        totalWorkHours += calcWorkHours(entered, exited, dailyWorkHours, weekendDays, holidaySet);
      }
      if (totalWorkHours > taskDuration) {
        totalExceededHours = Math.round((totalWorkHours - taskDuration) * 10) / 10;
      }
    }
  }

  const hasKanbanOverdue = kanbanExceededHours > 0;
  const hasTotalOverdue = totalExceededHours > 0;

  const assignees = profiles.filter(p => (task.assignee_ids || []).includes(p.user_id));
  if (!task.assignee_ids?.length && task.assignee_id) {
    const legacyAssignee = profiles.find(p => p.id === task.assignee_id);
    if (legacyAssignee && !assignees.find(a => a.id === legacyAssignee.id)) assignees.push(legacyAssignee);
  }

  return (
    <div
      onClick={() => onClick(task)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("task-id", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group cursor-pointer rounded-lg border bg-card p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevation-3 hover:border-primary/40",
        overdue && "border-status-overdue/30",
        (hasKanbanOverdue || hasTotalOverdue) && "border-destructive border-2"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug text-card-foreground">{task.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          {showLinked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    {linkedDirection === "incoming"
                      ? `Originado de: ${linkedCollectionName || "outra coleção"}`
                      : `Vinculado a: ${linkedCollectionName || "outra coleção"}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {hasActiveImpediment && <AlertTriangle className="h-3.5 w-3.5 text-status-attention" />}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("Tem certeza que deseja excluir esta task?")) {
                  onDelete(task);
                }
              }}
              className="text-muted-foreground hover:text-destructive transition-colors ml-1 p-0.5 rounded"
              title="Excluir task"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <PriorityDot priority={task.priority} />
        {task.due_date && (
          <span className={cn("flex items-center gap-1 text-[11px] font-medium", overdue ? "text-status-overdue" : "text-muted-foreground")}>
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
        {subtasksTotal > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            {subtasksDone}/{subtasksTotal}
          </span>
        )}
        {assignees.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden ml-auto">
            {assignees.map((assignee, idx) => (
              <Avatar key={assignee.user_id} className="w-5 h-5 border-[1.5px] border-background z-10 hover:z-20 relative" title={assignee.name}>
                <AvatarImage src={assignee.avatar_url || ""} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{assignee.name.substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
        {/* Kanban time exceeded badge */}
        {hasKanbanOverdue && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold bg-destructive text-destructive-foreground">
            <Clock className="h-2.5 w-2.5" /> Excedido: +{kanbanExceededHours}h
          </span>
        )}
        {/* Total time exceeded badge */}
        {hasTotalOverdue && !hasKanbanOverdue && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold bg-destructive text-destructive-foreground">
            <Clock className="h-2.5 w-2.5" /> Atrasada: +{totalExceededHours}h
          </span>
        )}
        {/* Project badge */}
        {projectName && (
          <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium bg-primary/10 text-primary">
            <FolderOpen className="h-2.5 w-2.5" /> {projectName}
          </span>
        )}
        {/* Linked collection badge */}
        {showLinked && linkedCollectionName && (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-medium",
            linkedDirection === "incoming"
              ? "bg-accent text-muted-foreground"
              : "bg-primary/10 text-primary"
          )}>
            {linkedDirection === "incoming" ? (
              <><ArrowLeft className="h-2.5 w-2.5" /> de: {linkedCollectionName}</>
            ) : (
              <><ArrowRight className="h-2.5 w-2.5" /> {linkedCollectionName}</>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
