import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApps, getLogs } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/lib/utils';
import type { AppInfo, AccessLog } from '@/types';

export function Dashboard() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getApps(), getLogs({ limit: 8 })])
      .then(([appsResult, logsResult]) => {
        if (appsResult.status === 'fulfilled') setApps(appsResult.value);
        if (logsResult.status === 'fulfilled') setLogs(logsResult.value.logs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const stats = [
    { label: '总应用', value: apps.length, accent: 'text-primary-600' },
    { label: '正常', value: apps.filter(a => a.status === 'active').length, accent: 'text-emerald-600' },
    { label: '暂停', value: apps.filter(a => a.status === 'suspended').length, accent: 'text-amber-600' },
    { label: '异常', value: logs.filter(l => l.result !== 'allowed').length, accent: 'text-red-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-display font-bold text-dark tracking-tight mb-2">概览</h2>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5">
        {stats.map(s => (
          <div key={s.label} className="card px-6 py-5 bg-white/40 border border-neutral-100/60 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-300 group">
            <p className="text-[13px] font-medium text-dark/50 mb-1.5 uppercase tracking-wider group-hover:text-dark/70 transition-colors">{s.label}</p>
            <p className={`text-3xl font-display font-bold tracking-tight ${s.accent}`}>{s.value}</p>
          </div>
        ))}
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
              {logs.map(l => (
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
