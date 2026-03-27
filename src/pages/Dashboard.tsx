import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApps, getLogs } from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/lib/utils';
import type { AppInfo, AccessLog } from '@/types';

export function Dashboard() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [appsData, logsData] = await Promise.all([
          getApps(),
          getLogs({ limit: 10 }),
        ]);
        setApps(appsData);
        setRecentLogs(logsData.logs);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="text-red-600">{error}</p>;

  const activeApps = apps.filter((a) => a.status === 'active').length;
  const suspendedApps = apps.filter((a) => a.status === 'suspended').length;
  const deniedLogs = recentLogs.filter((l) => l.result !== 'allowed').length;

  const stats = [
    { label: '总应用数', value: apps.length, color: 'text-primary-600' },
    { label: '正常运行', value: activeApps, color: 'text-green-600' },
    { label: '已暂停', value: suspendedApps, color: 'text-yellow-600' },
    { label: '近期异常', value: deniedLogs, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">仪表盘</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 最近访问日志 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">最近访问日志</h3>
          <Link to="/logs" className="text-sm text-primary-600 hover:text-primary-700">
            查看全部
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">暂无日志</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">应用</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">结果</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">IP</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">{log.appName}</td>
                    <td className="px-5 py-3"><StatusBadge status={log.result} /></td>
                    <td className="px-5 py-3 text-gray-500">{log.ip}</td>
                    <td className="px-5 py-3 text-gray-500">{timeAgo(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
