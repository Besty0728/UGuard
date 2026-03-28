import { useEffect, useState } from 'react';
import { getApps, getLogs, deleteLog } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ThemeButton, RefreshButton, DeleteButton } from '@/components/common/Buttons';
import { CustomDropdown } from '@/components/common/Dropdowns';
import { formatDate } from '@/lib/utils';
import type { AppInfo, AccessLog } from '@/types';

function formatCountry(log: AccessLog) {
  const parts = [log.countryName, log.countryCode].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : '-';
}

function formatRegion(log: AccessLog) {
  const parts = [log.regionName, log.regionCode].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : '-';
}

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
    } catch (e) { setError(e instanceof Error ? e.message : '\u5931\u8d25'); }
    finally { setLoading(false); }
  }

  async function handleDelete(logId: string) {
    try {
      setDeleting(logId);
      await deleteLog(logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '\u5220\u9664\u5931\u8d25');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-display font-bold text-dark tracking-tight">{'\u8bbf\u95ee\u65e5\u5fd7'}</h2>
        <div className="flex gap-3">
          <CustomDropdown 
            value={fApp} 
            onChange={setFApp} 
            options={[
              { value: '', label: '\u5168\u90e8\u5e94\u7528' },
              ...apps.map(a => ({ value: a.id, label: a.name }))
            ]}
            className=""
          />
          <CustomDropdown 
            value={fResult} 
            onChange={setFResult} 
            options={[
              { value: '', label: '\u5168\u90e8\u7ed3\u679c' },
              { value: 'allowed', label: '\u901a\u8fc7' },
              { value: 'denied', label: '\u62d2\u7edd' },
              { value: 'expired', label: '\u8fc7\u671f' },
              { value: 'banned', label: '\u5c01\u7981' },
              { value: 'max_devices', label: '\u8d85\u9650' }
            ]}
            className="min-w-[140px]"
          />
          <RefreshButton onClick={() => load(true)} disabled={loading} className="shrink-0" />
        </div>
      </div>

      {error && <p className="text-[13px] text-red-500">{error}</p>}

      {loading && logs.length === 0 ? <LoadingSpinner />
      : logs.length === 0 ? <EmptyState title={'\u6682\u65e0\u65e5\u5fd7'} />
      : (
        <div className="card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] text-dark/50 font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">{'\u65f6\u95f4'}</th>
              <th className="px-6 py-4">{'\u5e94\u7528'}</th>
              <th className="px-6 py-4">{'\u7ed3\u679c'}</th>
              <th className="px-6 py-4">{'\u539f\u56e0'}</th>
              <th className="px-6 py-4">IP</th>
              <th className="px-6 py-4">{'\u56fd\u5bb6/\u5730\u533a'}</th>
              <th className="px-6 py-4">{'\u6307\u7eb9'}</th>
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
                  <td className="px-6 py-4 text-[13px] text-dark/60 font-medium">
                    <div>{formatCountry(l)}</div>
                    <div className="text-[12px] text-dark/40">{formatRegion(l)}</div>
                  </td>
                  <td className="px-6 py-4 text-dark/40 font-mono text-[12px] font-medium">{l.deviceFingerprint.slice(0, 16)}...</td>
                  <td className="px-6 py-4 text-right">
                    <DeleteButton
                      onClick={() => handleDelete(l.id)}
                      disabled={deleting === l.id}
                      className="scale-[0.7] origin-right opacity-0 group-hover:opacity-100 transition-all"
                      text={deleting === l.id ? '...' : '\u5220 \u9664'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="px-6 py-6 border-t border-neutral-100/60 bg-white/40 text-center">
              <ThemeButton onClick={() => load(false)} disabled={loading}>
                {loading ? '\u52a0\u8f7d\u4e2d...' : '\u52a0\u8f7d\u66f4\u591a\u65e5\u5fd7 \u2193'}
              </ThemeButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
