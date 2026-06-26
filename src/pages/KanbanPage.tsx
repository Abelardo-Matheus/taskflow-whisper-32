import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link2, Plus, Archive } from "lucide-react";
import { KanbanFilters, applyKanbanFilters, type KanbanFilterState } from "@/components/KanbanFilters";
import { Input } from "@/components/ui/input";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailPanel } from "@/components/TaskDetailPanel";
import { NewTaskModal } from "@/components/NewTaskModal";
import { AppLayout } from "@/components/AppLayout";
import { CollectionSelector } from "@/components/CollectionSelector";
import { NewCollectionModal } from "@/components/NewCollectionModal";
import { DeleteCollectionDialog } from "@/components/DeleteCollectionDialog";
import { KanbanColumnHeader } from "@/components/KanbanColumnHeader";
import { TimeLimitModal } from "@/components/TimeLimitModal";
import { useViewConfig } from "@/hooks/useViewConfig";
import { ListView } from "@/components/views/list/ListView";
import { KanbanBoardView } from "@/components/views/board/KanbanBoardView";
import { LayoutList, Kanban, AlignLeft } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useCollections, useColumns, useTasks, useAllTasks, useCreateTask, useUpdateTask,
  useCreateCollectionWithColumns, useDeleteCollection, useSaveLastCollection,
  useUpdateColumn, useDeleteColumn, useReorderColumns, useCreateColumn,
  useColumnConnections, useUserRoles, useAllColumns, useProfiles, useProjects,
  useColumnAutomations, useCreateColumnAutomation, useDeleteColumnAutomation,
  useCreateColumnConnection, useDeleteColumnConnection, useArchiveCollection,
  useUpdateColumnConnection, useTaskKanbanHistory,
  type FullTask, type Collection, type ColumnConnection,
} from "@/hooks/useTaskData";
import { useWorkspaceSettings, useWorkspaceHolidays } from "@/hooks/useWorkspaceSettings";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function KanbanPage() {
  const { data: collections } = useCollections();
  const { data: connections } = useColumnConnections();
  const { data: roles } = useUserRoles();
  const { data: kanbanHistory } = useTaskKanbanHistory();
  const { data: wsSettings } = useWorkspaceSettings();
  const { data: wsHolidays } = useWorkspaceHolidays();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const userRole = roles?.find(r => r.user_id === user?.id)?.role || "usuario";
  const isManager = userRole === "admin" || userRole === "gestor";

  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<FullTask | null>(null);
  
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [inlineAddCol, setInlineAddCol] = useState("");
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  // Task creation modal
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | null>(null);
  // Column drag state
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  // Filters
  const [filters, setFilters] = useState<KanbanFilterState>({ assignee: "all", priority: "all", deadline: "all" });
  
  // View Config
  const viewConfig = useViewConfig(activeCollection);

  // Time modal state
  const [timeLimitModal, setTimeLimitModal] = useState<{
    open: boolean;
    taskId: string;
    taskTitle: string;
    columnId: string;
    connection: ColumnConnection;
    destinationName: string;
    destinationColor: string | null;
  } | null>(null);

  const saveLastCollection = useSaveLastCollection();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const reorderColumns = useReorderColumns();
  const createColumn = useCreateColumn();
  const createCollectionWithColumns = useCreateCollectionWithColumns();
  const deleteCollectionMut = useDeleteCollection();
  const archiveCollection = useArchiveCollection();
  const { data: allColumns } = useAllColumns();
  const { data: profilesList } = useProfiles();
  const { data: automations } = useColumnAutomations();
  const createAutomation = useCreateColumnAutomation();
  const deleteAutomation = useDeleteColumnAutomation();
  const createConnection = useCreateColumnConnection();
  const deleteConnectionMut = useDeleteColumnConnection();
  const updateConnectionMut = useUpdateColumnConnection();
  const { data: projectsList } = useProjects();

  // Restore last collection
  useEffect(() => {
    if (!activeCollection && collections && collections.length > 0 && profile) {
      const lastId = (profile as any).last_collection_id;
      const active = collections.filter(c => !c.is_archived);
      if (lastId && active.some(c => c.id === lastId)) {
        setActiveCollection(lastId);
      } else if (active.length > 0) {
        setActiveCollection(active[0].id);
      }
    }
  }, [collections, profile, activeCollection]);

  const handleSelectCollection = useCallback((id: string) => {
    setActiveCollection(id);
    saveLastCollection.mutate(id);
  }, [saveLastCollection]);

  const activeCollections = collections?.filter(c => !c.is_archived) || [];
  const collectionId = activeCollection || activeCollections?.[0]?.id || null;
  const { data: cols } = useColumns(collectionId);
  const { data: tasks } = useTasks(collectionId);
  const { data: allTasksData } = useAllTasks();

  const today = new Date().toISOString().split("T")[0];

  // Helper to resolve linked card info for a task
  const getLinkedInfo = useCallback((task: FullTask): { name: string | null; direction: "outgoing" | "incoming" | null } => {
    if (!task.linked_task_id || !allTasksData || !collections) return { name: null, direction: null };
    // Outgoing: this task's linked_task_id points to another task
    const linkedTask = allTasksData.find(t => t.id === task.linked_task_id);
    if (linkedTask && linkedTask.collection_id !== collectionId) {
      const coll = collections.find(c => c.id === linkedTask.collection_id);
      return { name: coll?.name || null, direction: "outgoing" };
    }
    // Incoming: check if the linked task is in the current collection (meaning this task was created from another)
    if (linkedTask && linkedTask.collection_id === collectionId) {
      // The linked task is here, so this card was the target → find the source collection
      const sourceTask = allTasksData.find(t => t.linked_task_id === task.id && t.collection_id !== collectionId);
      if (sourceTask) {
        const coll = collections.find(c => c.id === sourceTask.collection_id);
        return { name: coll?.name || null, direction: "incoming" };
      }
    }
    return { name: null, direction: null };
  }, [allTasksData, collections, collectionId]);

  const isArchivable = cols && cols.length > 0 && tasks && tasks.length > 0 &&
    tasks.every(t => t.column_id === cols[cols.length - 1].id);

  useEffect(() => {
    if (isArchivable) {
      toast("Todas as tasks estão concluídas! Deseja arquivar esta coleção?", {
        action: { label: "Arquivar", onClick: () => handleArchiveCollection() },
        duration: 8000,
      });
    }
  }, [isArchivable]);

  // ─── Handlers ───

  const handleQuickCreate = () => {
    if (!collectionId || !cols?.length) return;
    setNewTaskColumnId(cols[0].id);
    setNewTaskModalOpen(true);
  };

  const handleModalTaskCreate = async (data: import("@/components/NewTaskModal").NewTaskData) => {
    if (!newTaskColumnId || !collectionId) return;
    try {
      if (data.auto_position) {
        // Edge function: creates task + overrides atomically server-side
        const { error } = await supabase.functions.invoke("auto-create-task", {
          body: {
            title: data.title,
            description: data.description,
            collection_id: collectionId,
            column_id: newTaskColumnId,
            assignee_id: data.assignee_id,
            priority: data.priority,
            project_id: data.project_id,
            duration_hours: data.duration_hours,
            auto_position: true,
            daily_work_hours: data.daily_work_hours,
            work_start_hour: data.work_start_hour,
            weekend_days: data.weekend_days,
            holidays: data.holidays,
          },
        });
        if (error) throw error;
        // Invalidate caches so Gantt picks up the new task + overrides
        qc.invalidateQueries({ queryKey: ["all-tasks"] });
        qc.invalidateQueries({ queryKey: ["tasks", collectionId] });
        qc.invalidateQueries({ queryKey: ["schedule-overrides"] });
      } else {
        // Normal creation via client
        createTask.mutate({
          title: data.title,
          column_id: newTaskColumnId,
          collection_id: collectionId,
          description: data.description,
          assignee_id: data.assignee_id,
          priority: data.priority,
          due_date: data.due_date,
          ...(data.project_id ? { project_id: data.project_id } : {}),
          ...(data.duration_hours ? { duration_hours: data.duration_hours } : {}),
        } as any);
      }

      setNewTaskModalOpen(false);
      setNewTaskColumnId(null);
      toast.success("Task criada!");
    } catch (e) {
      console.error("Task creation error:", e);
      toast.error("Erro ao criar task");
    }
  };

  const executeCrossCollectionAutomation = async (taskId: string, columnId: string, timeLimitHours: number | null, chosenAssigneeId: string | null = null) => {
    if (!connections || !user) return;
    const outgoing = connections.filter(c => c.source_column_id === columnId);
    if (outgoing.length === 0) return;
    const task = tasks?.find(t => t.id === taskId);
    if (!task) return;

    for (const conn of outgoing) {
      const { data: targetCol } = await supabase
        .from("columns").select("collection_id").eq("id", conn.target_column_id).single();
      if (!targetCol) continue;

      let existingLinked: any = null;
      if (task.linked_task_id) {
        const { data } = await supabase
          .from("tasks").select("*")
          .eq("id", task.linked_task_id)
          .eq("collection_id", targetCol.collection_id)
          .single();
        if (data) existingLinked = data;
      }
      if (!existingLinked) {
        const { data } = await supabase
          .from("tasks").select("*")
          .eq("linked_task_id", task.id)
          .eq("collection_id", targetCol.collection_id)
          .single();
        if (data) existingLinked = data;
      }

      if (existingLinked) {
        await supabase.from("tasks").update({ column_id: conn.target_column_id }).eq("id", existingLinked.id);
        toast.success("Card vinculado movido!");
      } else {
        const newDurationHours = timeLimitHours ?? task.duration_hours;
        const newDurationDays = timeLimitHours ? null : task.duration_days;

        // Determine assignee based on connection config
        const cfg = conn.assignee_config;
        let newAssigneeId: string | null;
        if (cfg?.mode === "none") {
          newAssigneeId = null;
        } else if (cfg?.mode === "fixed") {
          newAssigneeId = cfg.user_id;
        } else if (cfg?.mode === "choose") {
          newAssigneeId = chosenAssigneeId;
        } else {
          // null config = inherit from original card
          newAssigneeId = task.assignee_id;
        }

        const { data: linkedTask } = await supabase.from("tasks").insert({
          title: task.title,
          description: task.description,
          column_id: conn.target_column_id,
          collection_id: targetCol.collection_id,
          created_by: user.id,
          priority: task.priority,
          due_date: null,
          linked_task_id: task.id,
          project_id: (task as any).project_id || null,
          assignee_id: newAssigneeId,
          duration_hours: newDurationHours,
          duration_days: newDurationDays,
        }).select().single();

        if (linkedTask) {
          await supabase.from("tasks").update({ linked_task_id: linkedTask.id }).eq("id", task.id);
          toast.success("Card vinculado criado na coleção destino!");
        }
      }

      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["all-tasks"] });
    }
  };

  const handleTaskDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (e.dataTransfer.getData("column-id")) return;
    const taskId = e.dataTransfer.getData("task-id");
    if (!taskId) return;

    // Apply automations for this column (affects the ORIGINAL card only)
    const colAutos = automations?.filter(a => a.column_id === columnId) || [];
    const autoUpdates: Record<string, any> = { column_id: columnId };
    for (const auto of colAutos) {
      if (auto.type === "assign_user") autoUpdates.assignee_id = auto.value;
      if (auto.type === "set_priority") autoUpdates.priority = auto.value;
    }
    updateTask.mutate({ id: taskId, ...autoUpdates }, {
      onSuccess: () => {
        // Check if column has complete/archive automation for toast feedback
        const hasComplete = colAutos.some(a => a.type === "complete_task");
        const hasArchive = colAutos.some(a => a.type === "archive_task");
        if (hasComplete) toast.success("Task concluída!");
        if (hasArchive) toast.success("Task arquivada!");

        if (cols && cols.length > 0 && tasks && collectionId) {
          // Check if all non-archived tasks are done
          const activeTasks = tasks.filter(t => !(t as any).is_archived);
          const updatedActive = activeTasks.map(t => t.id === taskId ? { ...t, column_id: columnId } : t);
          // If the dropped task went to a complete column, check if all active tasks are now done
          if (hasComplete && updatedActive.length > 0 && isManager) {
            const allDone = updatedActive.every(t => (t as any).is_done || t.id === taskId);
            if (allDone) {
              toast("Todas as tasks foram concluídas! 🎉", {
                description: "Deseja arquivar esta coleção?",
                duration: 10000,
                action: {
                  label: "Arquivar",
                  onClick: () => {
                    archiveCollection.mutate(collectionId);
                    toast.success("Coleção arquivada!");
                  },
                },
              });
            }
          }
        }
      },
    });

    // Check for cross-collection connections
    if (!connections || !user) return;
    const outgoing = connections.filter(c => c.source_column_id === columnId);
    if (outgoing.length === 0) return;

    const task = tasks?.find(t => t.id === taskId);
    if (!task) return;

    // Check if any connection needs the modal (time_options or assignee choose)
    const connNeedingModal = outgoing.find(c => {
      const hasTimeOpts = c.time_options && c.time_options.length > 0;
      const hasAssigneeChoice = c.assignee_config?.mode === "choose";
      return hasTimeOpts || hasAssigneeChoice;
    });

    if (connNeedingModal) {
      const { data: targetCol } = await supabase
        .from("columns").select("collection_id").eq("id", connNeedingModal.target_column_id).single();
      const destCollection = targetCol ? collections?.find(c => c.id === targetCol.collection_id) : null;

      setTimeLimitModal({
        open: true,
        taskId,
        taskTitle: task.title,
        columnId,
        connection: connNeedingModal,
        destinationName: destCollection?.name || "Kanban destino",
        destinationColor: (destCollection as any)?.color || null,
      });
    } else {
      // No modal needed — execute directly
      await executeCrossCollectionAutomation(taskId, columnId, null);
    }
  };

  const handleTimeLimitConfirm = async (timeLimitHours: number | null, assigneeId: string | null = null) => {
    if (!timeLimitModal) return;
    await executeCrossCollectionAutomation(timeLimitModal.taskId, timeLimitModal.columnId, timeLimitHours, assigneeId);
    setTimeLimitModal(null);
  };

  const handleAddColumn = () => {
    if (!inlineAddCol.trim() || !collectionId) return;
    createColumn.mutate({ name: inlineAddCol.trim(), collection_id: collectionId, position: cols?.length || 0 });
    setInlineAddCol("");
    setShowInlineAdd(false);
    toast.success("Coluna criada!");
  };

  const handleRenameColumn = (id: string, name: string) => {
    updateColumn.mutate({ id, name });
    toast.success("Coluna renomeada!");
  };

  const handleDeleteColumn = (id: string, moveToColumnId: string | null) => {
    if (!collectionId) return;
    deleteColumn.mutate({ id, collection_id: collectionId, moveTasksTo: moveToColumnId });
    toast.success("Coluna excluída!");
  };

  // Column reorder via drag
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDragColumnId(columnId);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("column-id");
    if (!sourceId || sourceId === targetColumnId || !cols || !collectionId) return;

    const sourceIdx = cols.findIndex(c => c.id === sourceId);
    const targetIdx = cols.findIndex(c => c.id === targetColumnId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const newCols = [...cols];
    const [moved] = newCols.splice(sourceIdx, 1);
    newCols.splice(targetIdx, 0, moved);

    const updates = newCols.map((c, i) => ({ id: c.id, position: i }));
    reorderColumns.mutate({ columns: updates, collection_id: collectionId });
    setDragColumnId(null);
    toast.success("Colunas reordenadas!");
  };

  const handleArchiveCollection = async () => {
    if (!collectionId) return;
    await supabase.from("collections").update({ is_archived: true }).eq("id", collectionId);
    qc.invalidateQueries({ queryKey: ["collections"] });
    setActiveCollection(null);
    toast.success("Coleção arquivada!");
  };

  const handleUnarchiveCollection = async (id: string) => {
    await supabase.from("collections").update({ is_archived: false }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["collections"] });
    toast.success("Coleção restaurada!");
  };

  const handleCreateCollection = async (name: string, columns: string[], color: string | null) => {
    try {
      const data = await createCollectionWithColumns.mutateAsync({ name, columns, ...(color ? { color } : {}) });
      setNewCollectionOpen(false);
      setActiveCollection(data.id);
      saveLastCollection.mutate(data.id);
      toast.success("Coleção criada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar coleção");
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteCollectionMut.mutateAsync(id);
      setDeleteTarget(null);
      if (activeCollection === id) setActiveCollection(null);
      toast.success("Coleção excluída permanentemente!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir coleção");
    }
  };

  const currentSelectedTask = selectedTask && tasks?.find(t => t.id === selectedTask.id) || null;
  const isOverdue = (dueDate: string | null) => dueDate ? dueDate < today : false;

  // Apply client-side filters
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return applyKanbanFilters(tasks, filters);
  }, [tasks, filters]);

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b px-6 py-3">
          <CollectionSelector
            collections={collections || []}
            activeId={collectionId}
            onSelect={handleSelectCollection}
            onNewCollection={() => setNewCollectionOpen(true)}
            onArchive={handleArchiveCollection}
            onUnarchive={handleUnarchiveCollection}
            onDelete={(c) => setDeleteTarget(c)}
            onManage={() => navigate("/configuracoes")}
            userRole={userRole}
          />
          
          <div className="mx-4 h-6 w-px bg-border" />
          
          <ToggleGroup type="single" value={viewConfig.config.currentView} onValueChange={(val) => val && viewConfig.setView(val as any)}>
            <ToggleGroupItem value="board" aria-label="Kanban View" title="Quadro Kanban">
              <Kanban className="w-4 h-4 mr-2" /> Quadro
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List View" title="Lista">
              <LayoutList className="w-4 h-4 mr-2" /> Lista
            </ToggleGroupItem>
          </ToggleGroup>

          <Button variant="outline" size="sm" onClick={handleQuickCreate} disabled={!collectionId} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova Task
          </Button>
          {isArchivable && isManager && (
            <Button variant="outline" size="sm" onClick={handleArchiveCollection} className="gap-1 text-muted-foreground">
              <Archive className="h-4 w-4" /> Arquivar
            </Button>
          )}
        </div>

        {/* Filters bar */}
        <KanbanFilters filters={filters} onChange={setFilters} profiles={profilesList || []} />

        {/* Views */}
        {viewConfig.config.currentView === "list" ? (
          <ListView 
            tasks={filteredTasks}
            columns={cols || []}
            profiles={profilesList || []}
            projects={projectsList || []}
            groupBy={viewConfig.config.groupBy}
            collapsedGroups={viewConfig.config.collapsedGroups}
            onToggleCollapse={viewConfig.toggleGroupCollapse}
            onUpdateTask={(id, updates) => updateTask.mutate({ id, ...updates })}
            onClickTask={setSelectedTask}
            onBulkUpdate={() => {}}
            onBulkDelete={(ids) => { ids.forEach(id => updateTask.mutate({ id, is_archived: true })) }} // Simplification for now
          />
        ) : (
          <KanbanBoardView
            cols={cols || []}
            filteredTasks={filteredTasks}
            connections={connections || []}
            collectionId={collectionId!}
            isManager={isManager}
            allColumns={allColumns || []}
            automations={automations || []}
            profilesList={profilesList || []}
            projectsList={projectsList || []}
            kanbanHistory={kanbanHistory || []}
            wsSettings={wsSettings}
            wsHolidays={wsHolidays || []}
            viewConfig={viewConfig}
            dragColumnId={dragColumnId}
            isOverdue={isOverdue}
            getLinkedInfo={getLinkedInfo}
            handleColumnDrop={handleColumnDrop}
            handleTaskDrop={handleTaskDrop}
            handleColumnDragStart={handleColumnDragStart}
            handleColumnDragOver={handleColumnDragOver}
            handleRenameColumn={handleRenameColumn}
            handleDeleteColumn={handleDeleteColumn}
            setNewTaskColumnId={setNewTaskColumnId}
            setNewTaskModalOpen={setNewTaskModalOpen}
            updateColumn={updateColumn}
            createConnection={createConnection}
            deleteConnectionMut={deleteConnectionMut}
            updateConnectionMut={updateConnectionMut}
            createAutomation={createAutomation}
            deleteAutomation={deleteAutomation}
            setSelectedTask={setSelectedTask}
            showInlineAdd={showInlineAdd}
            setShowInlineAdd={setShowInlineAdd}
            inlineAddCol={inlineAddCol}
            setInlineAddCol={setInlineAddCol}
            handleAddColumn={handleAddColumn}
            collections={collections || []}
          />
        )}
      </div>

      <TaskDetailPanel task={currentSelectedTask} columns={cols || []} profiles={profilesList || []} onClose={() => setSelectedTask(null)} />
      <NewTaskModal
        open={newTaskModalOpen}
        onOpenChange={setNewTaskModalOpen}
        onConfirm={handleModalTaskCreate}
        profiles={profilesList || []}
        projects={projectsList || []}
        loading={createTask.isPending}
        columnName={cols?.find(c => c.id === newTaskColumnId)?.name}
      />
      <NewCollectionModal
        open={newCollectionOpen}
        onOpenChange={setNewCollectionOpen}
        onConfirm={handleCreateCollection}
        loading={createCollectionWithColumns.isPending}
      />
      <DeleteCollectionDialog
        collection={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        onConfirm={handleDeleteCollection}
        loading={deleteCollectionMut.isPending}
      />
      {timeLimitModal && (
        <TimeLimitModal
          open={timeLimitModal.open}
          onOpenChange={(v) => { if (!v) setTimeLimitModal(null); }}
          taskTitle={timeLimitModal.taskTitle}
          destinationName={timeLimitModal.destinationName}
          destinationColor={timeLimitModal.destinationColor}
          timeOptions={timeLimitModal.connection.time_options || []}
          assigneeConfig={timeLimitModal.connection.assignee_config}
          profiles={profilesList || []}
          onConfirm={handleTimeLimitConfirm}
        />
      )}
    </AppLayout>
  );
}
