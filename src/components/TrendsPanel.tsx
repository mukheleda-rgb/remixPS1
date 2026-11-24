import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, BarChart, Bar 
} from 'recharts';
import { type ReportSnapshot } from '@/lib/reports';
import { TrendingUp, Activity, Droplets, ArrowRightLeft } from 'lucide-react';
import { compute, VISIBLE_TANKS } from '@/lib/calculations';

interface Props {
  reports: ReportSnapshot[];
}

const TrendsPanel: React.FC<Props> = ({ reports }) => {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    // Collect last 12 readings processed
    const allReadings: any[] = [];
    
    // Sort reports by date
    const sorted = [...reports].sort((a, b) => a.createdAt - b.createdAt);
    
    sorted.forEach(report => {
      const rows = compute(report.readings, report.customTanks, 0);
      rows.forEach(row => {
        if (row.totalStockM3 != null) {
          allReadings.push({
            time: `${report.name.substring(0, 5)} ${row.reading.hour}`,
            stock: row.totalStockM3,
            free: row.freeVolumeM3,
            timestamp: report.createdAt,
          });
        }
      });
    });

    return allReadings.slice(-12);
  }, [reports]);

  if (reports.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-elegant border-border/40 overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("stats.stockTrend")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} unit="m³" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="stock" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorStock)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elegant border-border/40 overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            <Activity className="h-4 w-4 text-emerald-500" />
            {t("stats.utilizationTrend")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Stock" />
                <Bar dataKey="free" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Free Space" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendsPanel;
