import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckSquare, Calendar, User, AlignLeft, Target, MoreHorizontal } from "lucide-react";
import { FullTask, Column } from "@/hooks/useTaskData";
import { ProfileWithSector } from "@/hooks/useTaskData";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ListRowProps {
  task: FullTask;
  columns: Column[];
  profiles: ProfileWithSector[];
  projects: any[]; // will type properly later
  isSelected: boolean;
  onToggleSelect: (taskId: string) => void;
  onUpdate: (taskId: string, updates: any) => void;
  onClick: (task: FullTask) => void;
}

export function ListRow({ task, columns, profiles, projects, isSelected, onToggleSelect, onUpdate, onClick }: ListRowProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);

  const assignee = profiles.find(p => p.id === task.assignee_id);
  const column = columns.find(c => c.id === task.column_id);
  const project = projects.find(p => p.id === (task as any).project_id);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleValue !== task.title && titleValue.trim()) {
      onUpdate(task.id, { title: titleValue.trim() });
    } else {
      setTitleValue(task.title);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgente": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "alta": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "media": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "baixa": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isDone = (task as any).is_done; // Check if it has is_done or relies on column

  return (
    <div className="group flex items-center border-b border-border/50 hover:bg-muted/50 transition-colors">
      {/* Checkbox */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center py-2">
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onToggleSelect(task.id)}
          className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity" 
        />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-[300px] flex items-center gap-2 py-2 px-3">
        <div 
          className={cn("w-3 h-3 rounded-full flex-shrink-0", isDone ? "bg-green-500" : "bg-primary")} 
          title={column?.name}
        />
        {isEditingTitle ? (
          <input
            autoFocus
            className="flex-1 bg-background border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={e => {
              if (e.key === "Enter") handleTitleBlur();
              if (e.key === "Escape") { setTitleValue(task.title); setIsEditingTitle(false); }
            }}
          />
        ) : (
          <span 
            className="text-sm font-medium cursor-pointer hover:underline truncate"
            onClick={() => onClick(task)}
            onDoubleClick={() => setIsEditingTitle(true)}
          >
            {task.title}
          </span>
        )}
        
        {task.subtasks?.length > 0 && (
          <Badge variant="secondary" className="text-xs scale-75 ml-2">
            <CheckSquare className="w-3 h-3 mr-1" />
            {task.subtasks.filter(s => s.is_done).length}/{task.subtasks.length}
          </Badge>
        )}
      </div>

      {/* Status / Column */}
      <div className="w-40 flex-shrink-0 py-2 px-3">
        <Badge variant="outline" className="text-xs truncate max-w-full">
          {column?.name || "Sem Status"}
        </Badge>
      </div>

      {/* Assignee */}
      <div className="w-40 flex-shrink-0 py-2 px-3 flex items-center gap-2">
        {assignee ? (
          <>
            <Avatar className="w-6 h-6">
              <AvatarImage src={assignee.avatar_url || ""} />
              <AvatarFallback className="text-[10px]">{assignee.name.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs truncate">{assignee.name}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> Não atribuído
          </span>
        )}
      </div>

      {/* Due Date */}
      <div className="w-32 flex-shrink-0 py-2 px-3">
        {task.due_date ? (
          <span className={cn(
            "text-xs flex items-center gap-1", 
            task.due_date < new Date().toISOString().split("T")[0] ? "text-red-500 font-medium" : "text-muted-foreground"
          )}>
            <Calendar className="w-3 h-3" />
            {format(new Date(task.due_date + "T12:00:00"), "dd MMM", { locale: ptBR })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>

      {/* Priority */}
      <div className="w-28 flex-shrink-0 py-2 px-3">
        <Badge className={cn("text-[10px] capitalize font-medium", getPriorityColor(task.priority))} variant="outline">
          {task.priority || "Normal"}
        </Badge>
      </div>

      {/* Project */}
      <div className="w-40 flex-shrink-0 py-2 px-3">
        {project ? (
          <span className="text-xs truncate flex items-center gap-1 text-muted-foreground">
            <Target className="w-3 h-3" />
            {project.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
    </div>
  );
}
