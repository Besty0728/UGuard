import { useEffect, useState } from 'react';
import { getApps, getLogs } from '@/lib/api';
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

  // 筛选
  const [filterAppId, setFilterAppId] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    getApps().then(setApps).catch(() => {});
  }, []);

  useEffect(() => {
    loadLogs(true);
  }, [filterAppId, filterResult]);

  async function loadLogs(reset = false) {
    try {
      setLoading(true);
      const result = await getLogs({
        appId: filterAppId || undefined,
        result: filterResult || undefined,
        limit: 50,
        cursor: reset ? undefined : cursor,
      });
      setLogs(reset ? result.logs : [...logs, ...result.logs]);
      setCursor(result.cursor);
      setHasMore(!!result.cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">访问日志</h2>

      {/* 筛选栏 */}
      <div className="flex gap-4">
        <select
          value={filterAppId}
          onChange={(e) => setFilterAppId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">所有应用</option>
          {apps.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">所有结果</option>
          <option value="allowed">通过</option>
          <option value="denied">拒绝</option>
          <option value="expired">已过期</option>
          <option value="suspended">已暂停</option>
          <option value="banned">已封禁</option>
          <option value="max_devices">设备超限</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && logs.length === 0 ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState title="暂无日志" description="当 Unity 客户端发起验证请求时，日志将自动记录" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">时间</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">应用</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">结果</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">原因</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">IP</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">设备指纹</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="px-5 py-3">{log.appName}</td>
                    <td className="px-5 py-3"><StatusBadge status={log.result} /></td>
                    <td className="px-5 py-3 text-gray-500">{log.reason || '-'}</td>
                    <td className="px-5 py-3 text-gray-500">{log.ip}</td>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{log.deviceFingerprint.slice(0, 16)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="px-5 py-3 border-t border-gray-200 text-center">
              <button
                onClick={() => loadLogs(false)}
                disabled={loading}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
              >
                {loading ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
