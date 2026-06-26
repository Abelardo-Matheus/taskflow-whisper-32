import { ChevronDown, ChevronRight } from "lucide-react";
import { FullTask, Column, ProfileWithSector } from "@/hooks/useTaskData";
import { ListRow } from "./ListRow";
import { Badge } from "@/components/ui/badge";

interface ListGroupProps {
  title: string;
  tasks: FullTask[];
  columns: Column[];
  profiles: ProfileWithSector[];
  projects: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedTaskIds: string[];
  onToggleSelectTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  onClickTask: (task: FullTask) => void;
  color?: string | null;
}

export function ListGroup({
  title, tasks, columns, profiles, projects, isCollapsed, onToggleCollapse, 
  selectedTaskIds, onToggleSelectTask, onUpdateTask, onClickTask, color
}: ListGroupProps) {
  
  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Group Header */}
      <div 
        className="flex items-center gap-2 py-2 px-1 mb-2 cursor-pointer hover:bg-muted/30 rounded transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="p-1 rounded-sm hover:bg-muted text-muted-foreground">
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
        
        {color && (
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        )}
        
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary" className="ml-2 text-xs">{tasks.length}</Badge>
      </div>

      {/* Group Content */}
      {!isCollapsed && (
        <div className="border border-border/50 rounded-lg overflow-hidden bg-card">
          {/* Table Header */}
          <div className="flex items-center border-b border-border/50 bg-muted/30 text-xs font-semibold text-muted-foreground">
            <div className="w-10 flex-shrink-0" />
            <div className="flex-1 min-w-[300px] py-2 px-3">Tarefa</div>
            <div className="w-40 flex-shrink-0 py-2 px-3">Status</div>
            <div className="w-40 flex-shrink-0 py-2 px-3">Responsável</div>
            <div className="w-32 flex-shrink-0 py-2 px-3">Prazo</div>
            <div className="w-28 flex-shrink-0 py-2 px-3">Prioridade</div>
            <div className="w-40 flex-shrink-0 py-2 px-3">Projeto</div>
          </div>
          
          {/* Rows */}
          <div className="flex flex-col">
            {tasks.map(task => (
              <ListRow 
                key={task.id}
                task={task}
                columns={columns}
                profiles={profiles}
                projects={projects}
                isSelected={selectedTaskIds.includes(task.id)}
                onToggleSelect={onToggleSelectTask}
                onUpdate={onUpdateTask}
                onClick={onClickTask}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
