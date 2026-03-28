import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApps, getLogs } from '@/lib/api';
import { useI18n } from '@/contexts/I18nContext';
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
  const { language } = useI18n();

  const text =
    language === 'zh'
      ? {
          title: '概览',
          totalApps: '总应用',
          active: '正常',
          suspended: '暂停',
          abnormalLogs: '异常记录',
          trendTitle: '访问趋势',
          trendSubtitle: '验证请求变化',
          allApps: '所有应用',
          recentLogs: '最近日志',
          viewAll: '查看全部 →',
          noLogs: '暂无日志',
          app: '应用',
          result: '结果',
          time: '时间',
          unit: '单位: 次',
        }
      : {
          title: 'Overview',
          totalApps: 'Apps',
          active: 'Active',
          suspended: 'Suspended',
          abnormalLogs: 'Abnormal logs',
          trendTitle: 'Verification trend',
          trendSubtitle: 'Traffic over time',
          allApps: 'All apps',
          recentLogs: 'Recent logs',
          viewAll: 'View all →',
          noLogs: 'No logs yet',
          app: 'App',
          result: 'Result',
          time: 'Time',
          unit: 'Unit: hits',
        };

  async function loadData() {
    setLoading(true);
    try {
      const [appsResponse, logsResponse] = await Promise.all([getApps(), getLogs({ limit: 300 })]);
      setApps(appsResponse);
      setLogs(logsResponse.logs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const chartData = useMemo(() => {
    const now = new Date();
    const data: { label: string; count: number }[] = [];
    const filteredLogs = logs.filter((log) => chartApp === 'all' || log.appId === chartApp);

    if (granularity === '6h') {
      for (let index = 17; index >= 0; index -= 1) {
        const time = new Date(now.getTime() - index * 20 * 60 * 1000);
        const startTime = new Date(time.getTime() - 20 * 60 * 1000);
        const count = filteredLogs.filter((log) => {
          const date = new Date(log.timestamp);
          return date > startTime && date <= time;
        }).length;
        data.push({ label: `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`, count });
      }
    } else if (granularity === '24h') {
      for (let index = 23; index >= 0; index -= 1) {
        const time = new Date(now.getTime() - index * 60 * 60 * 1000);
        const startTime = new Date(time.getTime() - 60 * 60 * 1000);
        const count = filteredLogs.filter((log) => {
          const date = new Date(log.timestamp);
          return date > startTime && date <= time;
        }).length;
        data.push({ label: `${time.getHours()}h`, count });
      }
    } else {
      for (let index = 6; index >= 0; index -= 1) {
        const date = new Date(now.getTime() - index * 24 * 60 * 60 * 1000);
        const dateStr = date.toDateString();
        const count = filteredLogs.filter((log) => new Date(log.timestamp).toDateString() === dateStr).length;
        data.push({
          label: date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
            month: 'short',
            day: 'numeric',
          }),
          count,
        });
      }
    }

    return data;
  }, [chartApp, granularity, language, logs]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = [
    { label: text.totalApps, value: apps.length, accent: 'text-primary-600' },
    { label: text.active, value: apps.filter((app) => app.status === 'active').length, accent: 'text-emerald-600' },
    { label: text.suspended, value: apps.filter((app) => app.status === 'suspended').length, accent: 'text-amber-600' },
    { label: text.abnormalLogs, value: logs.filter((log) => log.result !== 'allowed').length, accent: 'text-red-500' },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight text-dark">{text.title}</h2>
        <RefreshButton onClick={loadData} disabled={loading} />
      </div>

      <div className="grid grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="card group border border-neutral-100/60 bg-white/40 px-6 py-5 shadow-glass transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glass-hover">
            <p className="mb-1.5 text-[13px] font-medium uppercase tracking-wider text-dark/50 transition-colors group-hover:text-dark/70">{stat.label}</p>
            <p className={`font-display text-3xl font-bold tracking-tight ${stat.accent}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden border border-neutral-100/60 bg-white/40 shadow-glass backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 pb-2">
          <div>
            <h3 className="mb-1 text-[16px] font-bold text-dark">{text.trendTitle}</h3>
            <p className="text-[12px] font-medium uppercase tracking-widest text-dark/40">{text.trendSubtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <CustomDropdown
              value={chartApp}
              onChange={setChartApp}
              options={[{ value: 'all', label: text.allApps }, ...apps.map((app) => ({ value: app.id, label: app.name }))]}
            />
            <div className="flex h-[42px] items-center rounded-[14px] border border-neutral-200/50 bg-neutral-100/50 p-1">
              {(['6h', '24h', 'date'] as Granularity[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setGranularity(item)}
                  className={`h-full rounded-[10px] px-4 text-[12px] font-bold transition-all ${granularity === item ? 'bg-white text-amber-600 shadow-sm' : 'text-dark/40 hover:text-dark/60'}`}
                >
                  {item === 'date' ? '7d' : item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative h-[260px] w-full px-6 pb-6 pt-2">
          <TrendChart data={chartData} unitLabel={text.unit} tooltipSuffix={language === 'zh' ? '次' : 'hits'} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100/60 bg-white/40 px-6 py-5">
          <span className="text-[15px] font-bold tracking-tight text-dark/90">{text.recentLogs}</span>
          <Link to="/logs" className="text-[13px] font-semibold text-amber-600 transition-colors hover:text-amber-700">
            {text.viewAll}
          </Link>
        </div>

        {logs.length === 0 ? (
          <p className="px-6 py-10 text-center text-[14px] font-medium text-dark/40">{text.noLogs}</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] font-semibold uppercase tracking-wider text-dark/50">
                <th className="px-6 py-4">{text.app}</th>
                <th className="px-6 py-4">{text.result}</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">{text.time}</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 8).map((log) => (
                <tr key={log.id} className="border-b border-neutral-100/40 transition-all duration-200 last:border-0 hover:bg-white/60">
                  <td className="px-6 py-4 text-[14px] font-semibold text-dark/90">{log.appName || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={log.result} /></td>
                  <td className="px-6 py-4 font-mono text-[13px] font-medium text-dark/50">{log.ip}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{timeAgo(log.timestamp, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TrendChart({
  data,
  unitLabel,
  tooltipSuffix,
}: {
  data: { label: string; count: number }[];
  unitLabel: string;
  tooltipSuffix: string;
}) {
  const maxVal = Math.max(...data.map((item) => item.count), 5);
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

  const points = data.map((item, index) => {
    const x = paddingLeft + (index * innerWidth) / Math.max(data.length - 1, 1);
    const y = paddingTop + innerHeight - (item.count / roundedMax) * innerHeight;
    return { x, y };
  });

  function getBezierPath(pathPoints: { x: number; y: number }[]) {
    if (pathPoints.length < 2) {
      return '';
    }

    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let index = 0; index < pathPoints.length - 1; index += 1) {
      const p0 = pathPoints[index];
      const p1 = pathPoints[index + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2.5;
      const cp2x = p1.x - (p1.x - p0.x) / 2.5;
      path += ` C ${cp1x} ${p0.y}, ${cp2x} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }

  const pathD = getBezierPath(points);
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`
    : '';

  return (
    <div className="group relative h-full w-full select-none">
      <div className="absolute left-2 top-2 text-[11px] font-bold uppercase tracking-widest text-dark/25">{unitLabel}</div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="amber-gradient-v2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g>
          {yTicks.map((value) => {
            const y = paddingTop + innerHeight - (value / roundedMax) * innerHeight;
            return (
              <React.Fragment key={value}>
                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(0,0,0,0.03)" />
                <text x={paddingLeft - 12} y={y + 4} textAnchor="end" className="fill-dark/20 text-[12px] font-bold">
                  {Math.round(value)}
                </text>
              </React.Fragment>
            );
          })}
        </g>

        {points.length > 0 && (
          <line x1={points[points.length - 1].x} y1={paddingTop} x2={points[points.length - 1].x} y2={paddingTop + innerHeight} stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />
        )}

        {points.length > 0 && <path d={areaD} fill="url(#amber-gradient-v2)" className="transition-all duration-700 ease-in-out" />}
        {points.length > 0 && <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 transition-all duration-700 ease-in-out" />}

        {points.map((point, index) => {
          const showLabel = index % Math.ceil(data.length / 6) === 0 || index === points.length - 1;
          if (!showLabel) {
            return null;
          }

          return (
            <text
              key={index}
              x={point.x}
              y={height - 10}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
              className="fill-dark/25 text-[12px] font-bold"
            >
              {data[index].label}
            </text>
          );
        })}

        {points.map((point, index) => (
          <g key={`dot-${index}`} className="group/dot">
            <circle cx={point.x} cy={point.y} r="20" fill="transparent" className="cursor-pointer" />
            <circle cx={point.x} cy={point.y} r="4" className="pointer-events-none fill-white stroke-amber-500 stroke-[2] opacity-0 transition-opacity group-hover/dot:opacity-100" />
            <title>{`${data[index].label}: ${data[index].count} ${tooltipSuffix}`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
