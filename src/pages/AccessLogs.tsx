import { useEffect, useState } from 'react';
import { getApps, getLogs, deleteLog } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/lib/utils';
import type { AppInfo, AccessLog } from '@/types';

export function AccessLogs() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fApp, setFApp] = useState('');
  const [fResult, setFResult] = useState('');
  const [cursor, setCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { getApps().then(setApps).catch(() => {}); }, []);
  useEffect(() => { load(true); }, [fApp, fResult]);

  async function load(reset = false) {
    try {
      setLoading(true);
      const r = await getLogs({ appId: fApp || undefined, result: fResult || undefined, limit: 50, cursor: reset ? undefined : cursor });
      setLogs(reset ? r.logs : [...logs, ...r.logs]);
      setCursor(r.cursor); setHasMore(!!r.cursor);
    } catch (e) { setError(e instanceof Error ? e.message : '失败'); }
    finally { setLoading(false); }
  }

  async function handleDelete(logId: string) {
    try {
      setDeleting(logId);
      await deleteLog(logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-display font-bold text-dark tracking-tight">访问日志</h2>
        <div className="flex gap-3">
          <select value={fApp} onChange={e => setFApp(e.target.value)} className="px-4 py-2 text-[13px] font-semibold border border-neutral-200/60 rounded-xl text-dark bg-white/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all backdrop-blur-sm cursor-pointer outline-none">
            <option value="">全部应用</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={fResult} onChange={e => setFResult(e.target.value)} className="px-4 py-2 text-[13px] font-semibold border border-neutral-200/60 rounded-xl text-dark bg-white/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all backdrop-blur-sm cursor-pointer outline-none">
            <option value="">全部结果</option>
            <option value="allowed">通过</option><option value="denied">拒绝</option><option value="expired">过期</option><option value="banned">封禁</option><option value="max_devices">超限</option>
          </select>
        </div>
      </div>

      {error && <p className="text-[13px] text-red-500">{error}</p>}

      {loading && logs.length === 0 ? <LoadingSpinner />
      : logs.length === 0 ? <EmptyState title="暂无日志" />
      : (
        <div className="card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] text-dark/50 font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">时间</th>
              <th className="px-6 py-4">应用</th>
              <th className="px-6 py-4">结果</th>
              <th className="px-6 py-4">原因</th>
              <th className="px-6 py-4">IP</th>
              <th className="px-6 py-4">指纹</th>
              <th className="px-6 py-4 w-12"></th>
            </tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-neutral-100/40 last:border-0 hover:bg-white/60 transition-all duration-200 group">
                  <td className="px-6 py-4 text-dark/60 font-medium text-[13px] whitespace-nowrap">{formatDate(l.timestamp)}</td>
                  <td className="px-6 py-4 text-[14px] text-dark font-semibold">{l.appName || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={l.result} /></td>
                  <td className="px-6 py-4 text-dark/60 font-medium text-[13px]">{l.reason || '-'}</td>
                  <td className="px-6 py-4 text-dark/50 font-mono text-[13px] font-medium">{l.ip}</td>
                  <td className="px-6 py-4 text-dark/40 font-mono text-[12px] font-medium">{l.deviceFingerprint.slice(0, 16)}...</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(l.id)}
                      disabled={deleting === l.id}
                      className="text-[12px] text-red-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30 outline-none"
                    >
                      {deleting === l.id ? '...' : '删除'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="px-6 py-5 border-t border-neutral-100/60 bg-white/40 text-center">
              <button onClick={() => load(false)} disabled={loading} className="text-[13px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/50 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-30 shadow-sm outline-none">{loading ? '加载中...' : '加载更多日志 ↓'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
