import { useEffect, useState } from 'react';
import { deleteLog, getApps, getLogs } from '@/lib/api';
import { useI18n } from '@/contexts/I18nContext';
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
  const { language } = useI18n();

  const text =
    language === 'zh'
      ? {
          title: '访问日志',
          allApps: '全部应用',
          allResults: '全部结果',
          loadFailed: '加载失败',
          deleteFailed: '删除失败',
          empty: '暂无日志',
          time: '时间',
          app: '应用',
          result: '结果',
          reason: '原因',
          location: '国家/地区',
          fingerprint: '指纹',
          loadMore: '加载更多日志 ↓',
          loadingMore: '加载中...',
          delete: '删 除',
          results: [
            { value: '', label: '全部结果' },
            { value: 'allowed', label: '通过' },
            { value: 'denied', label: '拒绝' },
            { value: 'expired', label: '过期' },
            { value: 'banned', label: '封禁' },
            { value: 'max_devices', label: '超限' },
          ],
        }
      : {
          title: 'Access logs',
          allApps: 'All apps',
          allResults: 'All results',
          loadFailed: 'Failed to load logs',
          deleteFailed: 'Failed to delete log',
          empty: 'No logs yet',
          time: 'Time',
          app: 'App',
          result: 'Result',
          reason: 'Reason',
          location: 'Country / Region',
          fingerprint: 'Fingerprint',
          loadMore: 'Load more logs ↓',
          loadingMore: 'Loading...',
          delete: 'Delete',
          results: [
            { value: '', label: 'All results' },
            { value: 'allowed', label: 'Allowed' },
            { value: 'denied', label: 'Denied' },
            { value: 'expired', label: 'Expired' },
            { value: 'banned', label: 'Banned' },
            { value: 'max_devices', label: 'Limit reached' },
          ],
        };

  useEffect(() => {
    getApps().then(setApps).catch(() => {});
  }, []);

  useEffect(() => {
    load(true);
  }, [fApp, fResult]);

  async function load(reset = false) {
    try {
      setLoading(true);
      const response = await getLogs({
        appId: fApp || undefined,
        result: fResult || undefined,
        limit: 50,
        cursor: reset ? undefined : cursor,
      });
      setLogs(reset ? response.logs : [...logs, ...response.logs]);
      setCursor(response.cursor);
      setHasMore(Boolean(response.cursor));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(logId: string) {
    try {
      setDeleting(logId);
      await deleteLog(logId);
      setLogs((prev) => prev.filter((log) => log.id !== logId));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.deleteFailed);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight text-dark">{text.title}</h2>
        <div className="flex gap-3">
          <CustomDropdown
            value={fApp}
            onChange={setFApp}
            options={[{ value: '', label: text.allApps }, ...apps.map((app) => ({ value: app.id, label: app.name }))]}
          />
          <CustomDropdown value={fResult} onChange={setFResult} options={text.results} className="min-w-[140px]" />
          <RefreshButton onClick={() => load(true)} disabled={loading} className="shrink-0" />
        </div>
      </div>

      {error && <p className="text-[13px] text-red-500">{error}</p>}

      {loading && logs.length === 0 ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState title={text.empty} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] font-semibold uppercase tracking-wider text-dark/50">
                <th className="px-6 py-4">{text.time}</th>
                <th className="px-6 py-4">{text.app}</th>
                <th className="px-6 py-4">{text.result}</th>
                <th className="px-6 py-4">{text.reason}</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">{text.location}</th>
                <th className="px-6 py-4">{text.fingerprint}</th>
                <th className="w-12 px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="group border-b border-neutral-100/40 transition-all duration-200 last:border-0 hover:bg-white/60">
                  <td className="whitespace-nowrap px-6 py-4 text-[13px] font-medium text-dark/60">{formatDate(log.timestamp, language)}</td>
                  <td className="px-6 py-4 text-[14px] font-semibold text-dark">{log.appName || '-'}</td>
                  <td className="px-6 py-4"><StatusBadge status={log.result} /></td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{log.reason || '-'}</td>
                  <td className="px-6 py-4 font-mono text-[13px] font-medium text-dark/50">{log.ip}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">
                    <div>{formatCountry(log)}</div>
                    <div className="text-[12px] text-dark/40">{formatRegion(log)}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[12px] font-medium text-dark/40">{log.deviceFingerprint.slice(0, 16)}...</td>
                  <td className="px-6 py-4 text-right">
                    <DeleteButton
                      onClick={() => handleDelete(log.id)}
                      disabled={deleting === log.id}
                      className="origin-right scale-[0.7] opacity-0 transition-all group-hover:opacity-100"
                      text={deleting === log.id ? '...' : text.delete}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div className="border-t border-neutral-100/60 bg-white/40 px-6 py-6 text-center">
              <ThemeButton onClick={() => load(false)} disabled={loading}>
                {loading ? text.loadingMore : text.loadMore}
              </ThemeButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
