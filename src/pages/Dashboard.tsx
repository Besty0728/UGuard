import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getApps, getLogs } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { RefreshButton } from '@/components/common/Buttons';
import { CustomDropdown } from '@/components/common/Dropdowns';
import { timeAgo } from '@/lib/utils';
import type { AppInfo, AccessLog } from '@/types';

type Granularity = '6h' | '24h' | 'date';

export function Dashboard() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartApp, setChartApp] = useState('all');
  const [granularity, setGranularity] = useState<Granularity>('24h');

  const loadData = async () => {
    setLoading(true);
    try {
      const [appsRes, logsRes] = await Promise.all([
        getApps(),
        getLogs({ limit: 300 })
      ]);
      setApps(appsRes);
      setLogs(logsRes.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // 图表数据转换逻辑
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { label: string; count: number }[] = [];
    const filteredLogs = logs.filter(l => chartApp === 'all' || l.appId === chartApp);

    if (granularity === '6h') {
      // 6小时，每20分钟一个点 (18个点)
      for (let i = 17; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 20 * 60 * 1000);
        const startTime = new Date(time.getTime() - 20 * 60 * 1000);
        const count = filteredLogs.filter(l => {
          const d = new Date(l.timestamp);
          return d > startTime && d <= time;
        }).length;
        data.push({ label: `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`, count });
      }
    } else if (granularity === '24h') {
      // 24小时，每小时一个点
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const startTime = new Date(time.getTime() - 60 * 60 * 1000);
        const count = filteredLogs.filter(l => {
          const d = new Date(l.timestamp);
          return d > startTime && d <= time;
        }).length;
        data.push({ label: `${time.getHours()}h`, count });
      }
    } else {
      // 7天，每天一个点
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toDateString();
        const count = filteredLogs.filter(l => new Date(l.timestamp).toDateString() === dateStr).length;
        data.push({ label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), count });
      }
    }
    return data;
  }, [logs, chartApp, granularity]);

  if (loading) return <LoadingSpinner />;

  const stats = [
    { label: '总应用', value: apps.length, accent: 'text-primary-600' },
    { label: '正常', value: apps.filter(a => a.status === 'active').length, accent: 'text-emerald-600' },
    { label: '暂停', value: apps.filter(a => a.status === 'suspended').length, accent: 'text-amber-600' },
    { label: '异常记录', value: logs.filter(l => l.result !== 'allowed').length, accent: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-dark tracking-tight">概览</h2>
        <RefreshButton onClick={loadData} disabled={loading} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5">
        {stats.map(s => (
          <div key={s.label} className="card px-6 py-5 bg-white/40 border border-neutral-100/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-300 group">
            <p className="text-[13px] font-medium text-dark/50 mb-1.5 uppercase tracking-wider group-hover:text-dark/70 transition-colors">{s.label}</p>
            <p className={`text-3xl font-display font-bold tracking-tight ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <div className="card bg-white/40 backdrop-blur-sm border border-neutral-100/60 shadow-glass overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 pb-2">
          <div>
            <h3 className="text-[16px] font-bold text-dark mb-1">访问趋势</h3>
            <p className="text-[12px] font-medium text-dark/40 uppercase tracking-widest">Verification Trend Analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <CustomDropdown
              value={chartApp}
              onChange={setChartApp}
              options={[
                { value: 'all', label: '所有应用' },
                ...apps.map(a => ({ value: a.id, label: a.name }))
              ]}
              className=""
            />
            <div className="flex bg-neutral-100/50 p-1 rounded-[14px] border border-neutral-200/50 h-[42px] items-center">
              {(['6h', '24h', 'date'] as Granularity[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-4 h-full text-[12px] font-bold rounded-[10px] transition-all ${granularity === g ? 'bg-white text-amber-600 shadow-sm' : 'text-dark/40 hover:text-dark/60'}`}
                >
                  {g === '6h' ? '6h' : g === '24h' ? '24h' : '7d'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative h-[260px] w-full px-6 pb-6 pt-2">
          <TrendChart data={chartData} />
        </div>
      </div>

      {/* Recent logs */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100/60 bg-white/40">
          <span className="text-[15px] font-bold text-dark/90 tracking-tight">最近日志</span>
          <Link to="/logs" className="text-[13px] font-semibold text-amber-600 hover:text-amber-700 transition-colors">查看全部 &rarr;</Link>
        </div>
        {logs.length === 0 ? (
          <p className="px-6 py-10 text-[14px] font-medium text-dark/40 text-center">暂无日志</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] text-dark/50 font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">应用</th>
                <th className="px-6 py-4">结果</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 8).map(l => (
                <tr key={l.id} className="border-b border-neutral-100/40 last:border-0 hover:bg-white/60 transition-all duration-200">
                  <td className="px-6 py-4 text-[14px] font-semibold text-dark/90">{l.appName || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.result} /></td>
                  <td className="px-6 py-4 text-dark/50 font-mono text-[13px] font-medium">{l.ip}</td>
                  <td className="px-6 py-4 text-dark/60 font-medium text-[13px]">{timeAgo(l.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// 内部折线图组件 (琥珀色平滑贝塞尔曲线版 - 极致优化版)
function TrendChart({ data }: { data: { label: string; count: number }[] }) {
  // 动态计算量程
  const maxVal = Math.max(...data.map(d => d.count), 5);
  const roundedMax = Math.ceil(maxVal / 5) * 5;
  const yTicks = [0, roundedMax * 0.2, roundedMax * 0.4, roundedMax * 0.6, roundedMax * 0.8, roundedMax];
  
  const width = 1000;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i * innerWidth) / (data.length - 1);
    const y = paddingTop + innerHeight - (d.count / roundedMax) * innerHeight;
    return { x, y };
  });

  // 平滑曲线生成逻辑
  const getBezierPath = (pts: {x: number, y: number}[]) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2.5;
        const cp2x = p1.x - (p1.x - p0.x) / 2.5;
        d += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const pathD = getBezierPath(points);
  const areaD = pathD + ` L ${points[points.length - 1]?.x} ${paddingTop + innerHeight} L ${points[0]?.x} ${paddingTop + innerHeight} Z`;

  return (
    <div className="w-full h-full relative group select-none">
      {/* Y-Axis Unit */}
      <div className="absolute top-2 left-2 text-[11px] font-bold text-dark/25 uppercase tracking-widest">单位: 次</div>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="amber-gradient-v2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid Lines & Y Labels */}
        <g>
          {yTicks.map(val => {
            const y = paddingTop + innerHeight - (val / roundedMax) * innerHeight;
            return (
              <React.Fragment key={val}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(0,0,0,0.03)" />
                <text x={paddingLeft - 12} y={y + 4} textAnchor="end" className="text-[12px] font-bold fill-dark/20">{Math.round(val)}</text>
              </React.Fragment>
            );
          })}
        </g>

        {/* Vertical Last Line */}
        {points.length > 0 && (
          <line 
            x1={points[points.length-1].x} 
            y1={paddingTop} 
            x2={points[points.length-1].x} 
            y2={paddingTop + innerHeight} 
            stroke="rgba(0,0,0,0.06)" 
            strokeDasharray="4 4" 
          />
        )}

        {/* Path Area */}
        {points.length > 0 && (
          <path d={areaD} fill="url(#amber-gradient-v2)" className="transition-all duration-700 ease-in-out" />
        )}
        
        {/* Path Line */}
        {points.length > 0 && (
          <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-700 ease-in-out opacity-80" />
        )}

        {/* X Axis Labels - Optimized distribution */}
        {points.map((p, i) => {
          const showLabel = i % Math.ceil(data.length / 6) === 0 || i === points.length - 1;
          if (!showLabel) return null;
          return (
            <text 
              key={i}
              x={p.x} 
              y={height - 10} 
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} 
              className="text-[12px] font-bold fill-dark/25"
            >
              {data[i].label}
            </text>
          );
        })}

        {/* Hover Points */}
        {points.map((p, i) => (
          <g key={`dot-${i}`} className="group/dot">
            <circle cx={p.x} cy={p.y} r="20" fill="transparent" className="cursor-pointer" />
            <circle 
              cx={p.x} 
              cy={p.y} 
              r="4" 
              className="fill-white stroke-amber-500 stroke-[2] opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none" 
            />
            <title>{`${data[i].label}: ${data[i].count} 次`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
