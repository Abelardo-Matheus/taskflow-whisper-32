import { useState, useMemo } from "react";
import { Sun, CheckCircle2, AlertTriangle, Search, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityDot } from "@/components/PriorityBadge";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useAllTasks, useUpdateTask, useUpdateSubtask, useAllColumns, useProfiles, useColumnAutomations, type FullTask } from "@/hooks/useTaskData";
import { cn, getBRTToday } from "@/lib/utils";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function MeuDiaPage() {
  const { user } = useAuth();
  const { data: tasks } = useAllTasks();
  const { data: allColumns } = useAllColumns();
  const { data: profiles } = useProfiles();
  const { data: automations } = useColumnAutomations();
  const updateTask = useUpdateTask();
  const updateSubtask = useUpdateSubtask();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<FullTask | null>(null);

  const today = getBRTToday();
  const activeTasks = tasks?.filter(t => !(t as any).is_archived) || [];
  
  // Apply Search and Priority filters
  const filteredTasks = activeTasks.filter(t => {
    const matchesUser = user && ((t.assignee_ids || []).includes(user.id) || t.assignee_id === user.id);
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchesUser && matchesSearch && matchesPriority;
  });

  const todayTasks = filteredTasks.filter(t => t.due_date && t.due_date.startsWith(today));
  const overdueTasks = filteredTasks.filter(t => {
    if (!t.due_date) return false;
    if (t.due_date.startsWith(today)) return false;
    if (t.due_date.split("T")[0] > today) return false;
    const isDoneCol = automations?.some(a => a.column_id === t.column_id && a.type === "complete_task");
    return !isDoneCol;
  });
  
  const myFutureOrNoDateTasks = filteredTasks.filter(t => {
    if (!user || (!(t.assignee_ids || []).includes(user.id) && t.assignee_id !== user.id)) return false;
    if (!t.due_date) return true;
    if (t.due_date.startsWith(today)) return false;
    return t.due_date.split("T")[0] > today;
  });

  // Subtasks with due_date = today across all filtered tasks
  const todaySubtasks = useMemo(() => {
    return (filteredTasks || []).flatMap(t => 
      (t.subtasks || [])
        .filter(s => s.due_date === today)
        .map(s => ({ subtask: s, task: t }))
    ).filter(({ subtask, task }) => {
      const matchSearch = subtask.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [filteredTasks, today, searchQuery]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const d = dateStr.includes("T") ? new Date(dateStr) : new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const handleFinalizeTask = (e: React.MouseEvent, task: FullTask) => {
    e.stopPropagation();
    const doneColumn = allColumns?.find(
      c => c.collection_id === task.collection_id && 
           automations?.some(a => a.column_id === c.id && a.type === "complete_task")
    );
    if (doneColumn) {
      updateTask.mutate({ id: task.id, column_id: doneColumn.id });
      toast.success("Task movida para " + doneColumn.name);
    } else {
      toast.error("Nenhuma coluna configurada para concluir tasks.");
    }
  };

  const priorityCounts = useMemo(() => {
    const all = [...todayTasks, ...overdueTasks, ...myFutureOrNoDateTasks];
    return {
      urgente: all.filter(t => t.priority === "urgente").length,
      alta: all.filter(t => t.priority === "alta").length,
      media: all.filter(t => t.priority === "media").length,
      baixa: all.filter(t => t.priority === "baixa").length,
      total: all.length + todaySubtasks.length,
      overdue: overdueTasks.length,
    };
  }, [todayTasks, overdueTasks, myFutureOrNoDateTasks, todaySubtasks]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl p-6 h-full flex flex-col">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-attention/15">
              <Sun className="h-5 w-5 text-status-attention" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">Meu Dia</h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          
          <div className="flex flex-1 sm:max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar tarefas..." 
                className="pl-9 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] bg-card shrink-0">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Widget */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 shrink-0">
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-card-foreground">{priorityCounts.total}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Total</p>
          </div>
          <div className={cn("rounded-xl border p-4 text-center shadow-sm transition-colors", priorityCounts.overdue > 0 ? "bg-status-overdue/10 border-status-overdue/30" : "bg-card")}>
            <p className={cn("text-2xl font-bold", priorityCounts.overdue > 0 ? "text-status-overdue" : "text-card-foreground")}>{priorityCounts.overdue}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Atrasadas</p>
          </div>
          <div className={cn("rounded-xl border p-4 text-center shadow-sm transition-colors", priorityCounts.urgente > 0 ? "bg-priority-urgent/10 border-priority-urgent/30" : "bg-card")}>
            <p className={cn("text-2xl font-bold", priorityCounts.urgente > 0 ? "text-priority-urgent" : "text-card-foreground")}>{priorityCounts.urgente}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Urgentes</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-priority-high">{priorityCounts.alta}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Alta</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-8 pb-10 pr-1 scrollbar-thin">
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <div>
              <h2 className="font-heading text-sm font-semibold text-status-overdue mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Atrasadas ({overdueTasks.length})
              </h2>
              <div className="space-y-2">
                {overdueTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center gap-3 rounded-lg border border-status-overdue/20 bg-status-overdue/5 p-3.5 cursor-pointer transition-colors hover:bg-status-overdue/10 hover:border-status-overdue/40 group"
                  >
                    <PriorityDot priority={task.priority} />
                    <span className="flex-1 text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors">{task.title}</span>
                    <span className="text-[11px] text-status-overdue font-medium whitespace-nowrap">
                      {formatDateDisplay(task.due_date!)}
                    </span>
                    {task.collections && <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">{task.collections.name}</Badge>}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={(e) => handleFinalizeTask(e, task)}
                      title="Finalizar task"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Tasks */}
          <div>
            <h2 className="font-heading text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
              <Sun className="h-4 w-4" /> Hoje ({todayTasks.length})
            </h2>
            {todayTasks.length === 0 && overdueTasks.length === 0 && todaySubtasks.length === 0 && myFutureOrNoDateTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl border-dashed bg-card/50">
                <CheckCircle2 className="h-12 w-12 text-status-on-track/30 mb-4" />
                <h2 className="font-heading text-lg font-semibold text-foreground">Nenhuma task pra hoje</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {searchQuery || priorityFilter !== "all" ? "Nenhuma tarefa encontrada com esses filtros." : "Tudo limpo por aqui! 🎉"}
                </p>
              </div>
            ) : todayTasks.length > 0 ? (
              <div className="space-y-2">
                {todayTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3.5 cursor-pointer transition-colors hover:border-primary/40 hover:shadow-sm group"
                  >
                    <PriorityDot priority={task.priority} />
                    <span className="flex-1 text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors">{task.title}</span>
                    {task.collections && <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">{task.collections.name}</Badge>}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={(e) => handleFinalizeTask(e, task)}
                      title="Finalizar task"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* My Future / No Date Tasks */}
          {myFutureOrNoDateTasks.length > 0 && (
            <div>
              <h2 className="font-heading text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> A Fazer / Futuras ({myFutureOrNoDateTasks.length})
              </h2>
              <div className="space-y-2">
                {myFutureOrNoDateTasks.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3.5 cursor-pointer transition-colors hover:border-primary/40 hover:shadow-sm group"
                  >
                    <PriorityDot priority={task.priority} />
                    <span className="flex-1 text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors">{task.title}</span>
                    {task.due_date && (
                      <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                        {formatDateDisplay(task.due_date)}
                      </span>
                    )}
                    {task.collections && <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">{task.collections.name}</Badge>}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                      onClick={(e) => handleFinalizeTask(e, task)}
                      title="Finalizar task"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Subtasks */}
          {todaySubtasks.length > 0 && (
            <div>
              <h2 className="font-heading text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Subtasks de hoje ({todaySubtasks.length})
              </h2>
              <div className="space-y-2">
                {todaySubtasks.map(({ subtask, task }) => (
                  <div 
                    key={subtask.id} 
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3.5 cursor-pointer transition-colors hover:border-primary/40 hover:shadow-sm group"
                  >
                    <div onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={subtask.is_done}
                        onCheckedChange={(checked) => updateSubtask.mutate({ id: subtask.id, is_done: !!checked })}
                      />
                    </div>
                    <span className={cn("flex-1 text-sm font-medium text-card-foreground truncate group-hover:text-primary transition-colors", subtask.is_done && "line-through text-muted-foreground")}>
                      {subtask.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0 max-w-[150px] truncate hidden sm:inline-flex" title={task.title}>
                      {task.title}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <TaskDetailPanel 
        task={selectedTask} 
        columns={allColumns?.filter(c => c.collection_id === selectedTask?.collection_id) || []} 
        profiles={profiles || []} 
        onClose={() => setSelectedTask(null)} 
      />
    </AppLayout>
  );
}
