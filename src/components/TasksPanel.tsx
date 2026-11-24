import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Plus, 
  Trash2, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MoreVertical,
  Download,
  FileText,
  Edit2
} from "lucide-react";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { Task, TaskStatus, TaskPriority } from "@/lib/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { savePdf } from "@/lib/native-save";
import { format } from "date-fns";
import { hapticFeedback } from "@/lib/haptics";

interface TasksPanelProps {}

export function TasksPanel(_props: TasksPanelProps = {}) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useLocalStorageState<Task[]>(
    "ps1-maintenance-tasks-v2",
    [],
  );
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ 
    title: "", 
    description: "", 
    priority: "medium" as TaskPriority,
    department: "mechanic"
  });

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const filteredTasks = safeTasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast.error(t("common.titleRequired") || "Title is required");
      return;
    }

    try {
      hapticFeedback("light");
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
      const task: Task = {
        id,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        status: "pending",
        priority: newTask.priority,
        department: newTask.department,
        createdAt: Date.now(),
      };

      setTasks([...safeTasks, task]);
      
      // Reset filters so the new task is definitely visible
      setStatusFilter("all");
      setPriorityFilter("all");
      
      setNewTask({ title: "", description: "", priority: "medium", department: "mechanic" });
      setIsAdding(false);
      toast.success(t("common.success") || "Added successfully", {
        description: task.title
      });
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error("Failed to add task");
    }
  };

  const handleUpdateTask = () => {
    if (!editingTask || !editingTask.title.trim()) return;
    
    hapticFeedback("light");
    setTasks(safeTasks.map(t => t.id === editingTask.id ? editingTask : t));
    setEditingTask(null);
    toast.success(t("common.success") || "Updated successfully");
  };

  const downloadTasksPdf = async () => {
    hapticFeedback("medium");
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF("p", "mm", "a4");
    
    // Header
    doc.setFillColor(15, 76, 129);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("MAINTENANCE TASKS REPORT", 105, 18, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Pumping Station One (PS-1) — Official Document`, 105, 25, { align: "center" });
    
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 195, 42, { align: "right" });

    const tableData = filteredTasks.map(t => [
      t.title,
      t.description || "—",
      t.department ? t(`tasks.dept.${t.department}`) : "—",
      t.priority.toUpperCase(),
      t.status.replace("_", " ").toUpperCase(),
      format(t.createdAt, "yyyy-MM-dd")
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["TASK", "DESCRIPTION", "DEPT", "PRIORITY", "STATUS", "DATE"]],
      body: tableData,
      headStyles: { fillColor: [15, 76, 129], cellPadding: 3, fontSize: 9 },
      bodyStyles: { cellPadding: 3, fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
    });

    await savePdf(doc, `PS1-Maintenance-Tasks-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = safeTasks.find(t => t.id === id);
    if (!taskToDelete) return;

    const newTasks = safeTasks.filter((t) => t.id !== id);
    setTasks(newTasks);

    toast.success(t("common.deleted") || "Deleted", {
      action: {
        label: t("common.undo") || "Undo",
        onClick: () => setTasks([...newTasks, taskToDelete]),
      },
    });
  };

  const handleStatusChange = (id: string, status: TaskStatus) => {
    setTasks(safeTasks.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "";
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress": return <Clock className="w-4 h-4 text-blue-500" />;
      case "pending": return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t("app.tasksTitle")}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 h-9 rounded-full px-3"
            onClick={downloadTasksPdf}
            disabled={filteredTasks.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t("common.downloadPdf") || "تحميل PDF"}</span>
          </Button>
          <Button onClick={() => { hapticFeedback("light"); setIsAdding(true); }} className="gap-2 h-9 rounded-full px-4" size="sm">
            <Plus className="w-4 h-4" />
            {t("tasks.add")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                {t("tasks.filterByStatus")}
              </label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="pending">{t("tasks.status.pending")}</SelectItem>
                  <SelectItem value="in_progress">{t("tasks.status.in_progress")}</SelectItem>
                  <SelectItem value="completed">{t("tasks.status.completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                {t("tasks.filterByPriority")}
              </label>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="low">{t("tasks.priority.low")}</SelectItem>
                  <SelectItem value="medium">{t("tasks.priority.medium")}</SelectItem>
                  <SelectItem value="high">{t("tasks.priority.high")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {(isAdding || editingTask) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="mb-8"
          >
            <Card className="border-primary/30 bg-primary/[0.03] backdrop-blur-sm shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  {editingTask ? t("tasks.edit") || "تعديل المهمة" : t("tasks.add") || "إضافة مهمة جديدة"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("common.title")}</label>
                    <Input 
                      value={editingTask ? editingTask.title : newTask.title} 
                      onChange={(e) => editingTask ? setEditingTask({...editingTask, title: e.target.value}) : setNewTask({ ...newTask, title: e.target.value })}
                      className="bg-background/50 border-primary/10 focus-visible:ring-primary"
                      placeholder="عنوان المهمة..."
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("common.priority")}</label>
                    <Select 
                      value={editingTask ? editingTask.priority : newTask.priority} 
                      onValueChange={(v) => editingTask ? setEditingTask({...editingTask, priority: v as any}) : setNewTask({ ...newTask, priority: v as any })}
                    >
                      <SelectTrigger className="bg-background/50 border-primary/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t("tasks.priority.low")}</SelectItem>
                        <SelectItem value="medium">{t("tasks.priority.medium")}</SelectItem>
                        <SelectItem value="high">{t("tasks.priority.high")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                    <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("tasks.department")}</label>
                    <Select 
                      value={editingTask ? editingTask.department : newTask.department} 
                      onValueChange={(v) => editingTask ? setEditingTask({...editingTask, department: v}) : setNewTask({ ...newTask, department: v })}
                    >
                      <SelectTrigger className="bg-background/50 border-primary/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mechanic">{t("tasks.dept.mechanic")}</SelectItem>
                        <SelectItem value="inst">{t("tasks.dept.inst")}</SelectItem>
                        <SelectItem value="elec">{t("tasks.dept.elec")}</SelectItem>
                        <SelectItem value="strat">{t("tasks.dept.strat")}</SelectItem>
                        <SelectItem value="spec">{t("tasks.dept.spec")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("common.description")}</label>
                  <Input 
                    value={editingTask ? editingTask.description : newTask.description} 
                    onChange={(e) => editingTask ? setEditingTask({...editingTask, description: e.target.value}) : setNewTask({ ...newTask, description: e.target.value })}
                    className="bg-background/50 border-primary/10 focus-visible:ring-primary"
                    placeholder="وصف إضافي (اختياري)..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9 px-4 rounded-full"
                    onClick={() => { setIsAdding(false); setEditingTask(null); }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button 
                    size="sm"
                    className="h-9 px-6 rounded-full shadow-lg shadow-primary/20"
                    onClick={editingTask ? handleUpdateTask : handleAddTask}
                  >
                    {editingTask ? t("common.save") || "حفظ التغييرات" : t("common.add")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-muted/10 rounded-2xl border-2 border-dashed border-muted/50">
            <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">{t("tasks.noTasks")}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="group hover:shadow-sm transition-all duration-200 overflow-hidden">
                  <div className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1 shrink-0">
                        {getStatusIcon(task.status)}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`font-semibold text-sm truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </h3>
                          {task.department && (
                            <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-black bg-primary/10 text-primary border-none">
                              {t(`tasks.dept.${task.department}`)}
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[9px] h-4 px-1.5 uppercase font-bold tracking-widest ${getPriorityColor(task.priority)}`}>
                            {t(`tasks.priority.${task.priority}`)}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Select 
                        value={task.status} 
                        onValueChange={(v) => handleStatusChange(task.id, v as TaskStatus)}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-[10px] font-bold uppercase tracking-wider bg-muted/20 border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t("tasks.status.pending")}</SelectItem>
                          <SelectItem value="in_progress">{t("tasks.status.in_progress")}</SelectItem>
                          <SelectItem value="completed">{t("tasks.status.completed")}</SelectItem>
                        </SelectContent>
                      </Select>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={() => { hapticFeedback("light"); setEditingTask(task); }}
                          >
                            <Edit2 className="w-4 h-4" />
                            {t("common.edit") || "تعديل"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive gap-2"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
