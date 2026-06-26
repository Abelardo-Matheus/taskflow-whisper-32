import { useState, useCallback, useEffect } from "react";

export type ViewType = "list" | "board" | "gantt" | "calendar";
export type GroupByOption = "status" | "assignee" | "priority" | "project" | "due_date" | "none";

interface ViewConfigState {
  currentView: ViewType;
  groupBy: GroupByOption;
  showSubtasksInline: boolean;
  collapsedGroups: string[];
  collapsedColumns: string[];
}

export function useViewConfig(collectionId: string | null) {
  // Load initial state from localStorage if available
  const [config, setConfig] = useState<ViewConfigState>(() => {
    const saved = localStorage.getItem(`view_config_${collectionId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      currentView: "board",
      groupBy: "status",
      showSubtasksInline: true,
      collapsedGroups: [],
      collapsedColumns: [],
    };
  });

  // Save to localStorage whenever it changes
  useEffect(() => {
    if (collectionId) {
      localStorage.setItem(`view_config_${collectionId}`, JSON.stringify(config));
    }
  }, [config, collectionId]);

  const setView = useCallback((view: ViewType) => {
    setConfig(prev => ({ ...prev, currentView: view }));
  }, []);

  const setGroupBy = useCallback((groupBy: GroupByOption) => {
    setConfig(prev => ({ ...prev, groupBy }));
  }, []);

  const toggleGroupCollapse = useCallback((groupId: string) => {
    setConfig(prev => ({
      ...prev,
      collapsedGroups: prev.collapsedGroups.includes(groupId)
        ? prev.collapsedGroups.filter(id => id !== groupId)
        : [...prev.collapsedGroups, groupId]
    }));
  }, []);

  const toggleColumnCollapse = useCallback((columnId: string) => {
    setConfig(prev => ({
      ...prev,
      collapsedColumns: (prev.collapsedColumns || []).includes(columnId)
        ? (prev.collapsedColumns || []).filter(id => id !== columnId)
        : [...(prev.collapsedColumns || []), columnId]
    }));
  }, []);

  const setShowSubtasksInline = useCallback((show: boolean) => {
    setConfig(prev => ({ ...prev, showSubtasksInline: show }));
  }, []);

  return {
    config,
    setView,
    setGroupBy,
    toggleGroupCollapse,
    toggleColumnCollapse,
    setShowSubtasksInline
  };
}
