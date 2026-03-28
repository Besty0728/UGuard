import { useEffect, useState } from 'react';
import { getApps, getLogs, deleteLog } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ThemeButton, RefreshButton, DeleteButton } from '@/components/common/Buttons';
import { CustomDropdown } from '@/components/common/Dropdowns';
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
          <CustomDropdown 
            value={fApp} 
            onChange={setFApp} 
            options={[
              { value: '', label: '全部应用' },
              ...apps.map(a => ({ value: a.id, label: a.name }))
            ]}
            className=""
          />
          <CustomDropdown 
            value={fResult} 
            onChange={setFResult} 
            options={[
              { value: '', label: '全部结果' },
              { value: 'allowed', label: '通过' },
              { value: 'denied', label: '拒绝' },
              { value: 'expired', label: '过期' },
              { value: 'banned', label: '封禁' },
              { value: 'max_devices', label: '超限' }
            ]}
            className="min-w-[140px]"
          />
          <RefreshButton onClick={() => load(true)} disabled={loading} className="shrink-0" />
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
                    <DeleteButton
                      onClick={() => handleDelete(l.id)}
                      disabled={deleting === l.id}
                      className="scale-[0.7] origin-right opacity-0 group-hover:opacity-100 transition-all"
                      text={deleting === l.id ? '...' : '删 除'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="px-6 py-6 border-t border-neutral-100/60 bg-white/40 text-center">
              <ThemeButton onClick={() => load(false)} disabled={loading}>
                {loading ? '加载中...' : '加载更多日志 ↓'}
              </ThemeButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
