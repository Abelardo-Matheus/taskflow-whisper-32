import { useState, useMemo } from "react";
import { FullTask, Column, ProfileWithSector } from "@/hooks/useTaskData";
import { ListGroup } from "./ListGroup";
import { ListBulkActions } from "./ListBulkActions";
import { GroupByOption } from "@/hooks/useViewConfig";

interface ListViewProps {
  tasks: FullTask[];
  columns: Column[];
  profiles: ProfileWithSector[];
  projects: any[];
  groupBy: GroupByOption;
  collapsedGroups: string[];
  onToggleCollapse: (groupId: string) => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  onClickTask: (task: FullTask) => void;
  onBulkUpdate: (taskIds: string[], updates: any) => void;
  onBulkDelete: (taskIds: string[]) => void;
}

export function ListView({
  tasks, columns, profiles, projects, groupBy, collapsedGroups,
  onToggleCollapse, onUpdateTask, onClickTask, onBulkUpdate, onBulkDelete
}: ListViewProps) {
  
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleClearSelection = () => setSelectedTaskIds([]);

  // Grouping Logic
  const groupedTasks = useMemo(() => {
    if (!tasks) return [];
    
    if (groupBy === "none") {
      return [{ id: "all", title: "Todas as Tarefas", tasks, color: null }];
    }

    const groupsMap = new Map<string, { id: string, title: string, tasks: FullTask[], color: string | null }>();

    tasks.forEach(task => {
      let groupId = "unassigned";
      let title = "Não Atribuído";
      let color = null;

      if (groupBy === "status") {
        const col = columns.find(c => c.id === task.column_id);
        if (col) {
          groupId = col.id;
          title = col.name;
          color = (col as any).color || null;
        }
      } else if (groupBy === "assignee") {
        const user = profiles.find(p => p.id === task.assignee_id);
        if (user) {
          groupId = user.id;
          title = user.name;
        }
      } else if (groupBy === "priority") {
        groupId = task.priority || "Normal";
        title = task.priority || "Normal";
        title = title.charAt(0).toUpperCase() + title.slice(1);
      } else if (groupBy === "project") {
        const proj = projects.find(p => p.id === (task as any).project_id);
        if (proj) {
          groupId = proj.id;
          title = proj.name;
        }
      } else if (groupBy === "due_date") {
        if (task.due_date) {
          const dateStr = task.due_date.includes("T") ? task.due_date.split("T")[0] : task.due_date;
          groupId = dateStr;
          const [y, m, d] = dateStr.split("-");
          title = `${d}/${m}/${y}`;
        } else {
          groupId = "no_date";
          title = "Sem Prazo";
        }
      }

      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, { id: groupId, title, tasks: [], color });
      }
      groupsMap.get(groupId)!.tasks.push(task);
    });

    // Convert map to array and sort
    const result = Array.from(groupsMap.values());
    
    // Sort groups based on context
    if (groupBy === "status") {
      result.sort((a, b) => {
        const colA = columns.find(c => c.id === a.id)?.position || 0;
        const colB = columns.find(c => c.id === b.id)?.position || 0;
        return colA - colB;
      });
    } else {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [tasks, groupBy, columns, profiles, projects]);

  // Bulk actions wrappers (can open modals in the future)
  const handleDeleteSelected = () => {
    if (confirm(`Tem certeza que deseja excluir ${selectedTaskIds.length} tarefas?`)) {
      onBulkDelete(selectedTaskIds);
      setSelectedTaskIds([]);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        Nenhuma tarefa encontrada.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      {groupedTasks.map(group => (
        <ListGroup
          key={group.id}
          title={group.title}
          color={group.color}
          tasks={group.tasks}
          columns={columns}
          profiles={profiles}
          projects={projects}
          isCollapsed={collapsedGroups.includes(group.id)}
          onToggleCollapse={() => onToggleCollapse(group.id)}
          selectedTaskIds={selectedTaskIds}
          onToggleSelectTask={handleToggleSelectTask}
          onUpdateTask={onUpdateTask}
          onClickTask={onClickTask}
        />
      ))}

      <ListBulkActions
        selectedCount={selectedTaskIds.length}
        onClearSelection={handleClearSelection}
        onDelete={handleDeleteSelected}
        onChangeStatus={() => alert("Mudar status em lote em breve!")}
        onAssign={() => alert("Atribuir em lote em breve!")}
        onChangePriority={() => alert("Mudar prioridade em lote em breve!")}
      />
    </div>
  );
}
