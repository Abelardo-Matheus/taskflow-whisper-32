
-- Fix: restrict sectors RW to admin/gestor
DROP POLICY IF EXISTS "Create workspace sectors" ON public.sectors;
DROP POLICY IF EXISTS "Update workspace sectors" ON public.sectors;
DROP POLICY IF EXISTS "Delete workspace sectors" ON public.sectors;

CREATE POLICY "Create workspace sectors" ON public.sectors
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id = public.get_user_workspace_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  );

CREATE POLICY "Update workspace sectors" ON public.sectors
  FOR UPDATE TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  );

CREATE POLICY "Delete workspace sectors" ON public.sectors
  FOR DELETE TO authenticated
  USING (
    workspace_id = public.get_user_workspace_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'gestor'::app_role))
  );

-- Fix: workspaces UPDATE restricted to admin
DROP POLICY IF EXISTS "Users can update their workspace" ON public.workspaces;
CREATE POLICY "Users can update their workspace" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (
    id = public.get_user_workspace_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix: tasks INSERT enforces collection access
DROP POLICY IF EXISTS "Create tasks by role" ON public.tasks;
CREATE POLICY "Create tasks by role" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    collection_id IN (
      SELECT id FROM public.collections
      WHERE workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), id)
    )
  );

-- Fix: subtasks - add collection access check
DROP POLICY IF EXISTS "View subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Create subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Delete subtasks" ON public.subtasks;

CREATE POLICY "View subtasks" ON public.subtasks
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

CREATE POLICY "Create subtasks" ON public.subtasks
  FOR INSERT TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

CREATE POLICY "Update subtasks" ON public.subtasks
  FOR UPDATE TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

CREATE POLICY "Delete subtasks" ON public.subtasks
  FOR DELETE TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

-- Fix: task_kanban_history - add collection access check
DROP POLICY IF EXISTS "View task kanban history" ON public.task_kanban_history;
DROP POLICY IF EXISTS "Insert task kanban history" ON public.task_kanban_history;
DROP POLICY IF EXISTS "Update task kanban history" ON public.task_kanban_history;

CREATE POLICY "View task kanban history" ON public.task_kanban_history
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

CREATE POLICY "Insert task kanban history" ON public.task_kanban_history
  FOR INSERT TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

CREATE POLICY "Update task kanban history" ON public.task_kanban_history
  FOR UPDATE TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

-- Fix: impediments - add collection access check
DROP POLICY IF EXISTS "View impediments" ON public.impediments;
DROP POLICY IF EXISTS "Create impediments" ON public.impediments;
DROP POLICY IF EXISTS "Update impediments" ON public.impediments;

CREATE POLICY "View impediments" ON public.impediments
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

CREATE POLICY "Create impediments" ON public.impediments
  FOR INSERT TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

CREATE POLICY "Update impediments" ON public.impediments
  FOR UPDATE TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.collections c ON c.id = t.collection_id
      WHERE c.workspace_id = public.get_user_workspace_id()
        AND public.user_has_collection_access(auth.uid(), c.id)
    )
  );

-- Fix: revoke EXECUTE on SECURITY DEFINER trigger / internal functions from public API roles
REVOKE EXECUTE ON FUNCTION public.handle_impediment_resolved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_column_task_action() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_column_task_action_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_request_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_linked_card_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_task_kanban_history_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_task_kanban_history_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_via_whatsapp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vault_read_secret(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vault_store_workspace_secret(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vault_delete_workspace_secret(uuid, text) FROM PUBLIC, anon;

-- Revoke from anon on RLS helper functions (auth-only)
REVOKE EXECUTE ON FUNCTION public.get_team_member_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_sector_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_sector_ids() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_workspace_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_collection_access(uuid, uuid) FROM PUBLIC, anon;
