import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KanbanColumnHeader } from "@/components/KanbanColumnHeader";
import { TaskCard } from "@/components/TaskCard";
import { groupTasksForSwimlanes } from "@/lib/swimlaneUtils";
import type { FullTask, Column, ColumnConnection, Collection, ProfileWithSector, AssigneeConfig } from "@/hooks/useTaskData";
import { GroupByOption } from "@/hooks/useViewConfig";

interface KanbanBoardViewProps {
  cols: Column[];
  filteredTasks: FullTask[];
  connections: ColumnConnection[];
  collectionId: string;
  isManager: boolean;
  allColumns: any[];
  automations: any[];
  profilesList: ProfileWithSector[];
  projectsList: any[];
  kanbanHistory: any[];
  wsSettings: any;
  wsHolidays: any[];
  viewConfig: any;
  dragColumnId: string | null;
  // Handlers
  isOverdue: (date: string | null) => boolean;
  getLinkedInfo: (task: FullTask) => any;
  handleColumnDrop: (e: React.DragEvent, id: string) => void;
  handleTaskDrop: (e: React.DragEvent, id: string) => void;
  handleColumnDragStart: (e: React.DragEvent, id: string) => void;
  handleColumnDragOver: (e: React.DragEvent) => void;
  handleRenameColumn: (id: string, name: string) => void;
  handleDeleteColumn: (id: string, moveId: string | null) => void;
  setNewTaskColumnId: (id: string) => void;
  setNewTaskModalOpen: (v: boolean) => void;
  updateColumn: any;
  createConnection: any;
  deleteConnectionMut: any;
  updateConnectionMut: any;
  createAutomation: any;
  deleteAutomation: any;
  setSelectedTask: (task: FullTask) => void;
  handleDeleteTask?: (task: FullTask) => void;
  // Inline add
  showInlineAdd: boolean;
  setShowInlineAdd: (v: boolean) => void;
  inlineAddCol: string;
  setInlineAddCol: (v: string) => void;
  handleAddColumn: () => void;
  collections: Collection[];
}

export function KanbanBoardView(props: KanbanBoardViewProps) {
  const {
    cols, filteredTasks, connections, collectionId, isManager,
    allColumns, automations, profilesList, projectsList,
    kanbanHistory, wsSettings, wsHolidays, viewConfig, dragColumnId,
    isOverdue, getLinkedInfo, handleColumnDrop, handleTaskDrop,
    handleColumnDragStart, handleColumnDragOver, handleRenameColumn,
    handleDeleteColumn, setNewTaskColumnId, setNewTaskModalOpen,
    updateColumn, createConnection, deleteConnectionMut, updateConnectionMut,
    createAutomation, deleteAutomation, setSelectedTask, handleDeleteTask,
    showInlineAdd, setShowInlineAdd, inlineAddCol, setInlineAddCol, handleAddColumn, collections
  } = props;

  const swimlanes = useMemo(() => {
    return groupTasksForSwimlanes(filteredTasks, viewConfig.config.groupBy, cols, profilesList, projectsList);
  }, [filteredTasks, viewConfig.config.groupBy, cols, profilesList, projectsList]);

  const workStartHour = useMemo(() => {
    const t = wsSettings?.work_start_time || "09:00";
    const [h, m] = t.split(":").map(Number);
    return h + (m || 0) / 60;
  }, [wsSettings]);

  return (
    <div className="flex-1 overflow-auto p-6 flex flex-col gap-8">
      {swimlanes.map((swimlane, swimlaneIndex) => (
        <div key={swimlane.id} className="flex flex-col gap-4 min-w-max">
          {swimlanes.length > 1 && (
            <div className="sticky left-0 flex items-center gap-2 px-1">
              <h3 className="text-sm font-semibold tracking-wide text-foreground">{swimlane.title}</h3>
              <Badge variant="secondary" className="text-xs">{swimlane.tasks.length}</Badge>
            </div>
          )}

          <div className="flex gap-4 h-full">
            {cols?.map(column => {
              const colTasks = swimlane.tasks.filter(t => t.column_id === column.id);
              const hasConnection = connections?.some(c => c.source_column_id === column.id) || false;
              const overdueCount = colTasks.filter(t => isOverdue(t.due_date)).length;
              const otherColumns = cols.filter(c => c.id !== column.id);
              const colColor = (column as any).color as string | null;
              const collectionColor = (collections?.find(c => c.id === collectionId) as any)?.color as string | null;
              const wipLimit = (column as any).wip_limit || 0;
              const isOverWip = wipLimit > 0 && colTasks.length >= wipLimit;
              const isCollapsed = (viewConfig.config.collapsedColumns || []).includes(column.id);

              const borderStyle: React.CSSProperties = {};
              if (colColor) borderStyle.borderTop = `3px solid ${colColor}`;
              if (collectionColor) borderStyle.borderLeft = `3px solid ${collectionColor}`;

              return (
                <div
                  key={column.id}
                  className={cn(
                    "flex shrink-0 flex-col rounded-xl bg-kanban-column p-3 transition-all relative overflow-hidden",
                    isCollapsed ? "w-14 items-center cursor-pointer" : "w-72",
                    dragColumnId === column.id && "opacity-50",
                    isOverWip && "ring-2 ring-destructive/30"
                  )}
                  style={Object.keys(borderStyle).length > 0 ? borderStyle : undefined}
                  onClick={() => isCollapsed && viewConfig.toggleColumnCollapse(column.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    if (e.dataTransfer.getData("column-id")) {
                      handleColumnDrop(e, column.id);
                    } else {
                      handleTaskDrop(e, column.id);
                    }
                  }}
                >
                  {/* Show headers only on the first swimlane to avoid clutter, unless there's only one swimlane */}
                  {(swimlaneIndex === 0 || swimlanes.length === 1) && (
                    <KanbanColumnHeader
                      column={column}
                      taskCount={filteredTasks.filter(t => t.column_id === column.id).length} // Total tasks in column for header
                      overdueCount={filteredTasks.filter(t => t.column_id === column.id && isOverdue(t.due_date)).length}
                      hasConnection={hasConnection}
                      isManager={isManager}
                      otherColumns={otherColumns}
                      collections={collections || []}
                      currentCollectionId={collectionId!}
                      allColumns={allColumns || []}
                      connections={connections || []}
                      automations={automations || []}
                      profiles={profilesList || []}
                      onRename={handleRenameColumn}
                      onDelete={handleDeleteColumn}
                      onAddTask={(colId) => { setNewTaskColumnId(colId); setNewTaskModalOpen(true); }}
                      onUpdateColumn={(id, updates) => updateColumn.mutate({ id, ...updates })}
                      onCreateConnection={(sourceId, targetId) => { createConnection.mutate({ source_column_id: sourceId, target_column_id: targetId }, { onSuccess: () => {}, onError: () => {} }); }}
                      onDeleteConnection={(id) => { deleteConnectionMut.mutate(id); }}
                      onUpdateConnectionTimeOptions={(id, timeOptions) => { updateConnectionMut.mutate({ id, time_options: timeOptions }); }}
                      onUpdateConnectionAssignee={(id, config) => { updateConnectionMut.mutate({ id, assignee_config: config }); }}
                      onCreateAutomation={(colId, type, value) => { createAutomation.mutate({ column_id: colId, type, value }); }}
                      onDeleteAutomation={(id) => { deleteAutomation.mutate(id); }}
                      onDragStart={handleColumnDragStart}
                      onDragOver={handleColumnDragOver}
                      onDrop={handleColumnDrop}
                      isCollapsed={isCollapsed}
                      onToggleCollapse={() => viewConfig.toggleColumnCollapse(column.id)}
                    />
                  )}

                  {!isCollapsed && (
                    <div className={cn("flex-1 space-y-2 overflow-y-auto scrollbar-thin", swimlaneIndex > 0 && "mt-2")}>
                      {colTasks.map(task => {
                        const linked = getLinkedInfo(task);
                        const taskProjectName = (task as any).project_id
                          ? projectsList?.find(p => p.id === (task as any).project_id)?.name || null
                          : null;
                        const taskHistory = kanbanHistory?.filter(h => h.task_id === task.id) || [];
                        const isDoneCol = automations?.some(a => a.column_id === column.id && a.type === "complete_task") || false;
                        return (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={setSelectedTask}
                            showLinked={!!task.linked_task_id}
                            linkedCollectionName={linked.name}
                            linkedDirection={linked.direction}
                            projectName={taskProjectName}
                            kanbanHistory={taskHistory}
                            dailyWorkHours={wsSettings?.daily_work_hours || 8}
                            workStartHour={workStartHour}
                            weekendDays={wsSettings?.weekend_days || [0, 6]}
                            holidays={wsHolidays?.map(h => h.holiday_date) || []}
                            isDoneColumn={isDoneCol}
                            onDelete={handleDeleteTask}
                            profiles={profilesList}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add column inline — only for admin/gestor. Only show on the first row */}
            {(swimlaneIndex === 0 && collectionId && isManager) && (
              <div className="flex w-72 shrink-0 flex-col items-center justify-start pt-3">
                {showInlineAdd ? (
                  <div className="w-full rounded-xl bg-kanban-column p-3">
                    <Input
                      autoFocus
                      placeholder="Nome da coluna…"
                      value={inlineAddCol}
                      onChange={(e) => setInlineAddCol(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddColumn();
                        if (e.key === "Escape") { setShowInlineAdd(false); setInlineAddCol(""); }
                      }}
                      onBlur={() => {
                        if (!inlineAddCol.trim()) { setShowInlineAdd(false); setInlineAddCol(""); }
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowInlineAdd(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full justify-center"
                  >
                    <Plus className="h-4 w-4" /> Coluna
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {(!cols || cols.length === 0) && !collectionId && (
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <p>Nenhuma coluna. Adicione uma para começar!</p>
        </div>
      )}
    </div>
  );
}
