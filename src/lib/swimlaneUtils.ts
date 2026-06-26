import { FullTask, Column, ProfileWithSector } from "@/hooks/useTaskData";
import { GroupByOption } from "@/hooks/useViewConfig";

export function groupTasksForSwimlanes(
  tasks: FullTask[],
  groupBy: GroupByOption,
  columns: Column[],
  profiles: ProfileWithSector[],
  projects: any[]
) {
  if (groupBy === "none" || groupBy === "status") {
    // If grouped by status or none, just return one giant swimlane
    return [{ id: "all", title: "Todas as Tarefas", tasks }];
  }

  const groupsMap = new Map<string, { id: string, title: string, tasks: FullTask[] }>();

  tasks.forEach(task => {
    let groupId = "unassigned";
    let title = "Não Atribuído";

    if (groupBy === "assignee") {
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
        groupId = task.due_date;
        title = task.due_date;
      } else {
        groupId = "no_date";
        title = "Sem Prazo";
      }
    }

    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, { id: groupId, title, tasks: [] });
    }
    groupsMap.get(groupId)!.tasks.push(task);
  });

  const result = Array.from(groupsMap.values());
  result.sort((a, b) => a.title.localeCompare(b.title));

  return result;
}
