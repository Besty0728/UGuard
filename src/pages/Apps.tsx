import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApps, createApp } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { formatDate } from '@/lib/utils';
import type { AppInfo } from '@/types';

export function Apps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 创建应用对话框状态
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaxDevices, setNewMaxDevices] = useState(5);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  // 创建成功后展示 Token
  const [showToken, setShowToken] = useState(false);
  const [generatedToken, setGeneratedToken] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadApps();
  }, []);

  async function loadApps() {
    try {
      setLoading(true);
      setApps(await getApps());
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await createApp(
        newName.trim(),
        newMaxDevices,
        newExpiresAt || null,
      );
      setGeneratedToken(result.token);
      setShowToken(true);
      setShowCreate(false);
      setNewName('');
      setNewMaxDevices(5);
      setNewExpiresAt('');
      await loadApps();
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreating(false);
    }
  }

  function handleCopyToken() {
    navigator.clipboard.writeText(generatedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">应用管理</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
        >
          创建应用
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {apps.length === 0 ? (
        <EmptyState title="暂无应用" description="点击「创建应用」添加第一个应用" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-gray-500 font-medium">名称</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">状态</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">设备上限</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">到期时间</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link to={`/apps/${app.id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                      {app.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={app.status} /></td>
                  <td className="px-5 py-3 text-gray-500">{app.maxDevices === 0 ? '不限' : app.maxDevices}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(app.expiresAt)}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(app.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 创建应用对话框 */}
      {showCreate && (
        <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 w-full h-full m-0 max-w-none max-h-none border-none p-0">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">创建应用</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">应用名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="如：我的Unity项目A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设备数量上限</label>
                <input
                  type="number"
                  min={0}
                  value={newMaxDevices}
                  onChange={(e) => setNewMaxDevices(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-400">0 表示不限制</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">到期时间（可选）</label>
                <input
                  type="datetime-local"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                  取消
                </button>
                <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {creating ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

      {/* Token 展示对话框 */}
      {showToken && (
        <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 w-full h-full m-0 max-w-none max-h-none border-none p-0">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">应用创建成功</h3>
            <p className="text-sm text-red-600 mb-4">请立即复制 Token，此为唯一一次展示机会！</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 break-all font-mono text-sm">
              {generatedToken}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={handleCopyToken} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">
                {copied ? '已复制!' : '复制 Token'}
              </button>
              <button onClick={() => { setShowToken(false); setGeneratedToken(''); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                关闭
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
