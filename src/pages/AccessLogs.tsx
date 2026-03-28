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
      <div className="flex items-center justify-between">
        <h2 className="text-base font-display font-semibold text-neutral-800">访问日志</h2>
        <div className="flex gap-2">
          <select value={fApp} onChange={e => setFApp(e.target.value)} className="px-2.5 py-1 text-[13px] border border-neutral-200 rounded-lg text-neutral-600 focus:outline-none focus:border-primary-400">
            <option value="">全部应用</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={fResult} onChange={e => setFResult(e.target.value)} className="px-2.5 py-1 text-[13px] border border-neutral-200 rounded-lg text-neutral-600 focus:outline-none focus:border-primary-400">
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
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-neutral-100 text-[11px] text-neutral-400 uppercase tracking-wider">
              <th className="text-left font-medium px-5 py-2">时间</th>
              <th className="text-left font-medium px-5 py-2">应用</th>
              <th className="text-left font-medium px-5 py-2">结果</th>
              <th className="text-left font-medium px-5 py-2">原因</th>
              <th className="text-left font-medium px-5 py-2">IP</th>
              <th className="text-left font-medium px-5 py-2">指纹</th>
              <th className="text-left font-medium px-5 py-2 w-12"></th>
            </tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-neutral-100/60 last:border-0 hover:bg-primary-50/30 transition-all duration-150 group">
                  <td className="px-5 py-2.5 text-neutral-400 whitespace-nowrap">{formatDate(l.timestamp)}</td>
                  <td className="px-5 py-2.5 text-neutral-700">{l.appName || '-'}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={l.result} /></td>
                  <td className="px-5 py-2.5 text-neutral-400">{l.reason || '-'}</td>
                  <td className="px-5 py-2.5 text-neutral-400 font-mono text-xs">{l.ip}</td>
                  <td className="px-5 py-2.5 text-neutral-300 font-mono text-xs">{l.deviceFingerprint.slice(0, 16)}...</td>
                  <td className="px-5 py-2.5">
                    <button
                      onClick={() => handleDelete(l.id)}
                      disabled={deleting === l.id}
                      className="text-[12px] text-neutral-300 hover:text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30"
                    >
                      {deleting === l.id ? '...' : '删除'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="px-5 py-2.5 border-t border-neutral-50 text-center">
              <button onClick={() => load(false)} disabled={loading} className="text-[12px] text-primary-600 hover:text-primary-700 font-medium disabled:opacity-30">{loading ? '...' : '加载更多'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
