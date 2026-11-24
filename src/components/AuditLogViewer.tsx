import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Clipboard, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  History 
} from 'lucide-react';
import { getAllAuditLogs, type AuditLog, logAction } from '@/lib/db';
import { toast } from 'sonner';

export const AuditLogViewer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await getAllAuditLogs();
      // Sort in descending order (newest first)
      setLogs([...allLogs].sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error(e);
      toast.error(isRtl ? 'فشل تحميل سجل العمليات' : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.details.toLowerCase().includes(search.toLowerCase()) ||
        log.entityType.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase());
      
      const matchesAction = filterAction === 'ALL' || log.action === filterAction;
      return matchesSearch && matchesAction;
    });
  }, [logs, search, filterAction]);

  const getActionBadgeColor = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'UPDATE':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'EXPORT':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getActionName = (action: AuditLog['action']) => {
    if (isRtl) {
      switch (action) {
        case 'CREATE': return 'إضافة جديدة';
        case 'UPDATE': return 'تعديل وتحديث';
        case 'DELETE': return 'حذف وإلغاء';
        case 'EXPORT': return 'تصدير / طباعة';
        default: return action;
      }
    }
    return action;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString(isRtl ? 'ar-IQ' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className="shadow-elegant border-border/40 overflow-hidden bg-card">
      <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base font-bold">
              {isRtl ? 'سجل عمليات المناوبة (Shift Audit Logs)' : 'Shift Operations Audit Logs'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isRtl ? 'سجل تدقيق تفصيلي ومؤمن لجميع تعديلات وإجراءات مشغلي محطة PS1' : 'Detailed secure history of operations and adjustments on PS1'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={loadLogs} className="h-8 gap-1 rounded-full">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-bold">{isRtl ? 'تحديث' : 'Refresh'}</span>
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRtl ? 'ابحث في السجل...' : 'Search logs...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={isRtl ? 'pr-3 pl-9 h-9 text-xs' : 'pl-9 pr-3 h-9 text-xs'}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {isRtl ? 'نوع الإجراء:' : 'Action:'}
            </span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">{isRtl ? 'الكل' : 'All'}</option>
              <option value="CREATE">{isRtl ? 'إضافة (CREATE)' : 'Create'}</option>
              <option value="UPDATE">{isRtl ? 'تعديل (UPDATE)' : 'Update'}</option>
              <option value="DELETE">{isRtl ? 'حذف (DELETE)' : 'Delete'}</option>
              <option value="EXPORT">{isRtl ? 'تصدير (EXPORT)' : 'Export'}</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden bg-background max-h-[300px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              {isRtl ? 'لا توجد عمليات تطابق البحث' : 'No audit logs found matching criteria.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted/40 sticky top-0 z-10 text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 text-center w-[180px]">{isRtl ? 'الوقت والتاريخ' : 'Time & Date'}</th>
                  <th className="p-3 text-center w-[120px]">{isRtl ? 'النوع' : 'Action'}</th>
                  <th className="p-3 text-center w-[110px]">{isRtl ? 'المعدة/الكيان' : 'Entity'}</th>
                  <th className={`p-3 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'التفاصيل والعملية الجارية' : 'Detailed Operation Context'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 text-center font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border uppercase min-w-[75px] ${getActionBadgeColor(log.action)}`}>
                        {getActionName(log.action)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-foreground">
                        {log.entityType}
                      </span>
                    </td>
                    <td className={`p-3 ${isRtl ? 'text-right' : 'text-left'} font-medium text-foreground max-w-sm sm:max-w-md md:max-w-lg break-words`}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
