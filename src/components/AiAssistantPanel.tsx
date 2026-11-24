import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Trash2, 
  ArrowRight, 
  HelpCircle,
  Copy,
  Check,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLocalStorageState } from "@/hooks/use-local-storage";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { hapticFeedback } from "@/lib/haptics";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

interface Props {
  alerts?: any[];
  readings?: any[];
  pipeLabels?: Record<string, string>;
}

export function AiAssistantPanel({ alerts = [], readings = [], pipeLabels = {} }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  
  const [messages, setMessages] = useLocalStorageState<ChatMessage[]>("ps1-ai-chat-history", [
    {
      id: "welcome",
      role: "model",
      text: isRtl 
        ? "أهلاً بك! أنا المساعد الذكي لمحطة الضخ PS1. كيف يمكنني مساعدتك اليوم في إدارة الخزانات، القراءات، صيانة الصمامات أو مراجعة ضوابط خطط السلامة والتشغيل؟"
        : "Welcome! I am the intelligent assistant for Pumping Station 1 (PS1). How can I assist you today with tank levels, readings, valve maintenance, or safety operation plans?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(true);

  // Check if Gemini API Key is configured on backend
  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to check health");
      })
      .then((data) => {
        if (data && typeof data.hasApiKey === "boolean") {
          setHasApiKey(data.hasApiKey);
        }
      })
      .catch((err) => {
        console.error("Health check error:", err);
      });
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = textToSend?.trim() || inputText.trim();
    if (!messageContent) return;

    if (!textToSend) {
      setInputText("");
    }

    hapticFeedback("light");

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      text: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build dynamic active context to send to API
      const context = {
        alerts,
        pipeLabels,
        levels: readings && readings.length > 0 ? readings[0] : null,
        hour: readings && readings.length > 0 ? readings[0].hour : null,
        tasks: JSON.parse(localStorage.getItem("ps1-maintenance-tasks-v2") || "[]")
      };

      // Map chat messages into API history format
      const history = messages.filter(m => m.id !== "welcome").map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          history,
          context
        })
      });

      if (!res.ok) {
        let errMsg = isRtl ? "فشل الاتصال بخادم الذكاء الاصطناعي" : "Failed to connect to AI server";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (e) {
          // If response is not JSON
          errMsg += ` (Status: ${res.status})`;
        }
        throw new Error(errMsg);
      }

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        throw new Error(isRtl ? "تنسيق الاستجابة من الخادم غير صالح" : "Invalid response format received from server");
      }
      
      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: data.text || (isRtl ? "عذرًا، لم أتمكن من إيجاد إجابة." : "Sorry, I couldn't generate a response."),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMessage]);
      hapticFeedback("medium");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || (isRtl ? "خطأ أثناء معالجة استفسارك" : "Error processing your request"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(isRtl ? "تم النسخ بنجاح" : "Copied successfully");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome",
        role: "model",
        text: isRtl 
          ? "تم تصفير المحادثة بنجاح. أنا جاهز لاستقبال استفساراتك الجديدة حول محطة PS1."
          : "Chat cleared successfully. I am ready to receive your new queries regarding PS1.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    hapticFeedback("heavy");
  };

  // Predefined quick questions
  const quickPrompts = isRtl ? [
    { title: "حالة الخزانات", prompt: "أعطني ملخصاً بيانياً مفصلاً عن مستويات الخزانات الحالية وحساب المواد التشغيلية في PS1" },
    { title: "الإنذارات والتحذيرات", prompt: "هل توجد أي تحذيرات نشطة أو تجاوزات بالمستويات للخزانات اليوم؟" },
    { title: "حساب الخزين", prompt: "كيف يتم حساب مستويات الخزانات والمخزون بالمتر المكعب والبرميل؟" },
    { title: "ضوابط السلامة", prompt: "ما هي إجراءات السلامة وصرف النفط الخام في حالات الطوارئ في محطة PS1؟" }
  ] : [
    { title: "Tank Levels Summary", prompt: "Summarize the current tank levels and oil quantity status at PS1" },
    { title: "Active Alarms", prompt: "Are there any active alarms or level overrides detected right now?" },
    { title: "Stock Calculation Guide", prompt: "How logic in PS1 calculates net storage, total m3, and bbl?" },
    { title: "Safety Operations Code", prompt: "What are the core safety SOPs and crude oil containment guidelines?" }
  ];

  // Lightweight visual markdown style formatter
  const formatMessageText = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let cleanLine = line.trim();

      // Bold formatting: **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      let parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-extrabold text-slate-800 dark:text-slate-100">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      const content = parts.length > 0 ? parts : line;

      // Unordered list
      if (cleanLine.startsWith("- ") || cleanLine.startsWith("* ")) {
        return (
          <li key={idx} className="list-disc list-inside ml-2 md:ml-4 py-0.5 text-xs text-muted-foreground rtl:mr-2 rtl:ml-0">
            {cleanLine.substring(2)}
          </li>
        );
      }

      // Ordered list (numbers)
      const numMatch = cleanLine.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="list-decimal list-inside ml-2 md:ml-4 py-0.5 text-xs text-muted-foreground rtl:mr-2 rtl:ml-0">
            {numMatch[2]}
          </li>
        );
      }

      if (cleanLine === "") {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 md:text-sm">
          {content}
        </p>
      );
    });
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] md:h-[650px] w-full bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <CardHeader className="p-4 md:p-5 border-b border-slate-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-black/20 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary/20 to-lime-500/20 text-primary dark:text-lime-400 rounded-2xl border border-primary/20 shadow-inner flex items-center justify-center">
            <Bot className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 matches-glow">
              {isRtl ? "المساعد الذكي للمحطة" : "PS1 Smart CoPilot"}
              <Sparkles className="h-3.5 w-3.5 text-primary/80 animate-spin-slow dark:text-lime-400" />
            </CardTitle>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium">
              {isRtl 
                ? "مدعوم بنموذج الذكاء الاصطناعي لفهم وتحليل قراءات PS1" 
                : "Powered by Gemini model for PS1 calculations & guidelines"}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={messages.length <= 1}
              className="h-9 w-9 text-slate-400 hover:text-rose-500 active:scale-95 transition-all rounded-xl"
              title={isRtl ? "مسح المحادثة" : "Clear Chat"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right">
                {isRtl ? "تأكيد مسح المحادثة" : "Confirm Clear Chat"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                {isRtl 
                  ? "هل أنت متأكد من رغبتك في مسح سجل المحادثات؟" 
                  : "Are you sure you want to clear chat history?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>{isRtl ? "إلغاء" : "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearHistory}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isRtl ? "تأكيد" : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-transparent scrollbar-thin scrollbar-thumb-muted">
        {hasApiKey === false && (
          <div className="p-4 mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 space-y-2 text-xs md:text-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-amber-900 dark:text-amber-100">
                  {isRtl ? "مساعد الذكاء الاصطناعي بحاجة لمفتاح تفعيل (Secrets)" : "AI Assistant Needs GEMINI_API_KEY"}
                </p>
                <p className="text-amber-700/95 dark:text-amber-400/95 text-xs">
                  {isRtl 
                    ? "الذكاء الاصطناعي جاهز للعمل ولكنه يتطلب مفتاح تفعيل. فضلاً، انتقل للإعدادات ⚙️ في الجانب السفلي الأيسر، ثم اضغط على الأسرار (Secrets) وأضف مفتاح GEMINI_API_KEY لتفعيله بنجاح."
                    : "The AI Copilot is compiled but requires light activation. Please click the Settings gear icon ⚙️ on the bottom left, go to Secrets, and add your GEMINI_API_KEY."}
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div className="flex flex-col items-center justify-center text-center py-6 md:py-10 max-w-md mx-auto space-y-4">
            <div className="p-4 bg-muted/40 rounded-full border border-border/40 text-muted-foreground">
              <Sparkles className="h-8 w-8 animate-bounce text-primary" />
            </div>
            <h4 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100">
              {isRtl ? "كيف يمكنني مساعدتك اليوم؟" : "How can I help you today?"}
            </h4>
            <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
              {isRtl 
                ? "يمكنك الاستفسار عن تفاصيل الخزانات الحالية، مراجعة العمليات، أو طلب حلول إرشادية بخصوص الصيانة ومستندات السلامة المعتمدة." 
                : "Retrieve real-time stats of tanks, compute flow margins, or ask me for technical SOP instructions and safety checks."}
            </p>
          </div>
        )}

        {/* Messaging area */}
        <div className="space-y-4">
          {messages.map((msg) => {
            const isBot = msg.role === "model";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 max-w-[85%] ${isBot ? "" : "ml-auto rtl:mr-auto rtl:ml-0 flex-row-reverse"}`}
              >
                {isBot && (
                  <div className="h-7 w-7 md:h-8 md:w-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                
                <div className="flex flex-col space-y-1">
                  <div className={`p-3 md:p-4 rounded-3xl text-sm shadow-sm border ${
                    isBot 
                      ? "bg-white dark:bg-zinc-900 border-slate-200/50 dark:border-zinc-800 rounded-tl-sm rtl:rounded-tr-sm rtl:rounded-tl-3xl text-slate-800 dark:text-white"
                      : "bg-primary text-primary-foreground border-primary/20 rounded-tr-sm rtl:rounded-tl-sm rtl:rounded-tr-3xl"
                  }`}>
                    <div className="space-y-1.5">
                      {isBot ? formatMessageText(msg.text) : (
                        <p className="text-xs md:text-sm leading-relaxed">{msg.text}</p>
                      )}
                    </div>

                    {isBot && msg.id !== "welcome" && (
                      <div className="flex items-center justify-end gap-1.5 mt-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/50 text-[10px] text-muted-foreground">
                        <button
                          onClick={() => handleCopyText(msg.text, msg.id)}
                          className="hover:text-primary active:scale-95 p-1 rounded transition-all"
                          title={isRtl ? "نسخ الإجابة" : "Copy answer"}
                        >
                          {copiedId === msg.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        <span>{msg.timestamp}</span>
                      </div>
                    )}
                  </div>
                  {!isBot && (
                    <span className="text-[9px] text-muted-foreground self-end px-1">{msg.timestamp}</span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 max-w-[80%]">
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 animate-spin-slow">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 rounded-3xl rounded-tl-sm rtl:rounded-tr-sm rtl:rounded-tl-3xl shadow-sm text-xs text-muted-foreground flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary/80 animate-bounce delay-100" />
                  <span className="h-2 w-2 rounded-full bg-primary/80 animate-bounce delay-200" />
                  <span className="h-2 w-2 rounded-full bg-primary/80 animate-bounce delay-300" />
                </div>
                <span>{isRtl ? "جاري التفكير والتوجيه..." : "Generating directions..."}</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>
      </CardContent>

      {/* Input controls & Prompt selectors */}
      <div className="border-t border-slate-200/60 dark:border-zinc-800/60 p-4 bg-white/40 dark:bg-black/10 backdrop-blur-md space-y-3">
        {/* Suggestion actions */}
        {messages.length <= 3 && !isLoading && (
          <div className="space-y-1.5">
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              {isRtl ? "استفسارات مقترحة وسريعة:" : "Quick actions & suggestions:"}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSendMessage(item.prompt)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 text-[10px] md:text-xs text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1 hover:scale-[1.02] active:scale-95"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRtl ? "اكتب سؤالك هنا بخصوص العمليات والكميات..." : "Ask me anything about readings and safety codes..."}
            className="flex-1 bg-white/80 dark:bg-zinc-900 border-2 border-slate-200/70 dark:border-zinc-800/70 focus:border-primary/60 dark:focus:border-primary/60 focus:ring-0 text-xs md:text-sm px-4 py-3 rounded-2xl outline-none transition-all placeholder-slate-400 text-slate-800 dark:text-zinc-100"
            disabled={isLoading}
          />

          <Button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 text-white bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 shadow-md transition-all disabled:opacity-50"
          >
            <Send className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
