import { Trash2, Users, LayoutList, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ListBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onChangeStatus: () => void;
  onAssign: () => void;
  onChangePriority: () => void;
}

export function ListBulkActions({ 
  selectedCount, onClearSelection, onDelete, onChangeStatus, onAssign, onChangePriority 
}: ListBulkActionsProps) {
  
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-popover border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2 border-r border-border pr-4">
        <Badge variant="default" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
          {selectedCount}
        </Badge>
        <span className="text-sm font-medium">selecionadas</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={onChangeStatus}>
          <LayoutList className="w-4 h-4" /> Status
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={onAssign}>
          <Users className="w-4 h-4" /> Atribuir
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-2" onClick={onChangePriority}>
          <Flag className="w-4 h-4" /> Prioridade
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
          <Trash2 className="w-4 h-4" /> Excluir
        </Button>
      </div>

      <div className="border-l border-border pl-2 ml-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClearSelection}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
