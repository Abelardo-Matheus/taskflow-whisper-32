import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Zap, Check, ChevronsUpDown, X } from "lucide-react";
import { cn, fromDatetimeLocal } from "@/lib/utils";
import { useWorkspaceSettings, useWorkspaceHolidays } from "@/hooks/useWorkspaceSettings";
import { formatHoursDuration } from "@/lib/taskDistribution";
import type { TaskPriority, ProfileWithSector, Project } from "@/hooks/useTaskData";

export interface NewTaskData {
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_ids: string[];
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  duration_hours: number | null;
  auto_position: boolean;
  daily_work_hours?: number;
  work_start_hour?: number;
  weekend_days?: number[];
  holidays?: string[];
}

interface NewTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: NewTaskData) => void;
  profiles: ProfileWithSector[];
  projects?: Project[];
  loading?: boolean;
  columnName?: string;
}

export function NewTaskModal({ open, onOpenChange, onConfirm, profiles, projects, loading, columnName }: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [durationHours, setDurationHours] = useState<number>(1);
  const [autoPosition, setAutoPosition] = useState(false);
  const { data: wsSettings } = useWorkspaceSettings();
  const { data: wsHolidays } = useWorkspaceHolidays();

  const dailyHours = wsSettings?.daily_work_hours || 8;
  const hasProject = projectId !== "none";
  const hasAssignee = assigneeIds.length > 0;

  const workStartHour = (() => {
    const t = wsSettings?.work_start_time || "09:00";
    const [h, m] = t.split(":").map(Number);
    return h + (m || 0) / 60;
  })();

  const handleConfirm = () => {
    if (!title.trim()) return;

    const useAutoPos = autoPosition && hasAssignee;

    onConfirm({
      title: title.trim(),
      description: description.trim() || null,
      assignee_id: hasAssignee ? assigneeIds[0] : null,
      assignee_ids: assigneeIds,
      priority,
      due_date: useAutoPos ? null : (fromDatetimeLocal(dueDate) || null),
      project_id: hasProject ? projectId : null,
      duration_hours: durationHours,
      auto_position: useAutoPos,
      ...(useAutoPos ? {
        daily_work_hours: dailyHours,
        work_start_hour: workStartHour,
        weekend_days: wsSettings?.weekend_days || [0, 6],
        holidays: wsHolidays?.map(h => h.holiday_date) || [],
      } : {}),
    });

    // Reset
    setTitle("");
    setDescription("");
    setAssigneeIds([]);
    setPriority("media");
    setDueDate("");
    setProjectId("none");
    setDurationHours(1);
    setAutoPosition(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Nova Task{columnName ? ` — ${columnName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Titulo *</Label>
            <Input
              id="task-title"
              placeholder="Titulo da task..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && title.trim() && handleConfirm()}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Descricao</Label>
            <Textarea
              id="task-desc"
              placeholder="Descreva a task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 flex flex-col">
              <Label>Responsáveis</Label>
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={assigneeOpen} className="justify-between min-h-10 h-auto p-2">
                    {assigneeIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assigneeIds.map(id => {
                          const profile = profiles.find(p => p.user_id === id);
                          return (
                            <Badge key={id} variant="secondary" className="px-1 font-normal">
                              {profile?.name}
                              <div
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAssigneeIds(prev => prev.filter(p => p !== id));
                                }}
                              >
                                <X className="h-3 w-3" />
                              </div>
                            </Badge>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-normal">Nenhum</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar responsável..." />
                    <CommandList>
                      <CommandEmpty>Nenhum responsável encontrado.</CommandEmpty>
                      <CommandGroup>
                        {profiles.map(p => (
                          <CommandItem
                            key={p.user_id}
                            value={p.name}
                            onSelect={() => {
                              setAssigneeIds(prev => 
                                prev.includes(p.user_id) 
                                  ? prev.filter(id => id !== p.user_id) 
                                  : [...prev, p.user_id]
                              );
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", assigneeIds.includes(p.user_id) ? "opacity-100" : "opacity-0")} />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-position toggle */}
          {hasAssignee && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
              <Checkbox
                id="auto-position"
                checked={autoPosition}
                onCheckedChange={(checked) => setAutoPosition(!!checked)}
              />
              <label htmlFor="auto-position" className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Posicionar automaticamente na agenda
              </label>
            </div>
          )}

          {/* Project selector */}
          {projects && projects.length > 0 && (
            <div className="space-y-1.5">
              <Label>Projeto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>Duracao (horas)</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                onClick={() => setDurationHours(Math.max(0.5, durationHours - 0.5))}
              >-</Button>
              <Input
                type="number" min={0.5} step={0.5}
                value={durationHours}
                onChange={(e) => { const v = parseFloat(e.target.value); if (v >= 0.5) setDurationHours(v); }}
                className="text-center h-9"
              />
              <Button
                type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                onClick={() => setDurationHours(durationHours + 0.5)}
              >+</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatHoursDuration(durationHours, dailyHours)}
            </p>
          </div>

          {/* Prazo final — hidden when auto-position is on */}
          {!autoPosition && (
            <div className="space-y-1.5">
              <Label>Prazo final</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Opcional — exibe linha de prazo no Gantt</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!title.trim() || loading}>
            Criar Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
