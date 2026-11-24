import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { 
  StickyNote, 
  Send, 
  User, 
  Clock, 
  Trash2,
  MessageSquareQuote,
  Edit2,
  Download,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { savePdf } from "@/lib/native-save";
import { hapticFeedback } from "@/lib/haptics";
import { toast } from "sonner";

interface Note {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export function ShiftHandoff() {
  const { t } = useTranslation();
  const [notes, setNotes] = useLocalStorageState<Note[]>("ps1-shift-notes", []);
  const [newNote, setNewNote] = useState("");
  const [author, setAuthor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    hapticFeedback("light");
    
    if (editingId) {
      setNotes(notes.map(n => n.id === editingId ? { ...n, text: newNote.trim(), author: author.trim() || t("shift.operator") || "Operator" } : n));
      setEditingId(null);
      toast.success(t("shift.noteUpdated") || "تم تحديث الملاحظة");
    } else {
      const note: Note = {
        id: Math.random().toString(36).slice(2, 9),
        text: newNote.trim(),
        author: author.trim() || t("shift.operator") || "Operator",
        timestamp: Date.now(),
      };
      setNotes([note, ...notes].slice(0, 50)); // Keep last 50
      toast.success(t("shift.noteAdded") || "تمت إضافة الملاحظة");
    }
    
    setNewNote("");
  };

  const deleteNote = (id: string) => {
    hapticFeedback("medium");
    setNotes(notes.filter(n => n.id !== id));
    toast.success(t("shift.noteDeleted") || "تم حذف الملاحظة");
  };

  const startEdit = (note: Note) => {
    hapticFeedback("light");
    setNewNote(note.text);
    setAuthor(note.author);
    setEditingId(note.id);
  };

  const cancelEdit = () => {
    setNewNote("");
    setAuthor("");
    setEditingId(null);
  };

  const downloadNotesPdf = async () => {
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
    doc.text("SHIFT HANDOFF REPORT", 105, 18, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Pumping Station One (PS-1) — Shift Rotation Notes`, 105, 25, { align: "center" });
    
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 195, 42, { align: "right" });

    const tableData = notes.map(n => [
      format(n.timestamp, "yyyy-MM-dd HH:mm"),
      n.author,
      n.text
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["DATE / TIME", "OPERATOR", "NOTES / OBSERVATIONS"]],
      body: tableData,
      headStyles: { fillColor: [15, 76, 129], cellPadding: 3, fontSize: 9 },
      bodyStyles: { cellPadding: 3, fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
    });

    await savePdf(doc, `Shift-Handoff-Notes-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return (
    <div className="rounded-2xl border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="border-b px-5 py-4 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-bold text-foreground">
              {t("shift.title") || "ملاحظات الاستلام والتسليم (Shift Handoff)"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("shift.description") || "سجل الملاحظات المهمة للمناوبة التالية"}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 h-9 rounded-full px-3 no-print"
          onClick={downloadNotesPdf}
          disabled={notes.length === 0}
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{t("shift.downloadPdf") || "تحميل PDF"}</span>
        </Button>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input 
              placeholder={t("shift.author") || "اسم المشغل"} 
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-1/3 text-xs"
            />
            <div className="relative flex-1">
              <Textarea 
                placeholder={t("shift.placeholder") || "اكتب الملاحظات هنا..."}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[80px] text-sm resize-none pr-10"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {editingId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-muted-foreground"
                    onClick={cancelEdit}
                  >
                    {t("common.cancel") || "إلغاء"}
                  </Button>
                )}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className={cn("h-8 w-8", editingId ? "text-amber-500" : "text-primary")}
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                >
                  {editingId ? <Edit2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
          {notes.map((note) => (
            <div key={note.id} className={cn(
              "group relative flex flex-col gap-1 p-3 rounded-xl border bg-muted/10 hover:bg-muted/30 transition-colors",
              editingId === note.id && "ring-2 ring-primary border-primary bg-primary/5"
            )}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground">{note.author}</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(note.timestamp, "yyyy-MM-dd HH:mm")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(note)}
                      className="h-7 w-7 text-muted-foreground hover:text-primary transition-all p-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNote(note.id)}
                      className="h-7 w-7 text-destructive/40 hover:text-destructive hover:scale-110 transition-all p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {note.text}
              </p>
            </div>
          ))}

          {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-40">
              <MessageSquareQuote className="h-12 w-12 mb-2" />
              <p className="text-sm italic">{t("shift.noNotes") || "لا توجد ملاحظات مسجلة"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
