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
    Promise.all([getApps(), getLogs({ limit: 8 })])
      .then(([a, l]) => { setApps(a); setLogs(l.logs); })
      .catch(() => {})
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
      <h2 className="text-base font-display font-semibold text-neutral-800">概览</h2>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="card px-4 py-3.5">
            <p className="text-[11px] text-neutral-400 mb-0.5">{s.label}</p>
            <p className={`text-xl font-display font-bold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent logs */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <span className="text-[13px] font-medium text-neutral-700">最近日志</span>
          <Link to="/logs" className="text-[12px] text-primary-600 hover:text-primary-700">查看全部</Link>
        </div>
        {logs.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-neutral-300">暂无日志</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-neutral-50 text-[11px] text-neutral-400 uppercase tracking-wider">
                <th className="text-left font-medium px-5 py-2">应用</th>
                <th className="text-left font-medium px-5 py-2">结果</th>
                <th className="text-left font-medium px-5 py-2">IP</th>
                <th className="text-left font-medium px-5 py-2">时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-neutral-100/60 last:border-0 hover:bg-primary-50/30 transition-all duration-150">
                  <td className="px-5 py-2.5 text-neutral-700">{l.appName || '-'}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={l.result} /></td>
                  <td className="px-5 py-2.5 text-neutral-400 font-mono text-xs">{l.ip}</td>
                  <td className="px-5 py-2.5 text-neutral-400">{timeAgo(l.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
