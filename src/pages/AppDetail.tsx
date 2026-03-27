import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApp, updateApp, deleteApp, getDevices, updateDevice } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { formatDate, timeAgo } from '@/lib/utils';
import type { AppInfo, DeviceInfo } from '@/types';

export function AppDetail() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();

  const [app, setApp] = useState<AppInfo | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  useEffect(() => {
    if (!appId) return;
    loadData();
  }, [appId]);

  async function loadData() {
    try {
      setLoading(true);
      const [appData, deviceData] = await Promise.all([
        getApp(appId!),
        getDevices(appId!),
      ]);
      setApp(appData);
      setDevices(deviceData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!app) return;
    const newStatus = app.status === 'active' ? 'suspended' : 'active';
    try {
      const updated = await updateApp(app.id, { status: newStatus });
      setApp(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
    setConfirmToggle(false);
  }

  async function handleDelete() {
    if (!app) return;
    try {
      await deleteApp(app.id);
      navigate('/apps', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
    setConfirmDelete(false);
  }

  async function handleToggleBan(device: DeviceInfo) {
    try {
      const updated = await updateDevice(appId!, device.deviceId, { banned: !device.banned });
      setDevices((prev) => prev.map((d) => (d.deviceId === updated.deviceId ? updated : d)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error && !app) return <p className="text-red-600">{error}</p>;
  if (!app) return <p className="text-gray-500">应用不存在</p>;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">{app.name}</h2>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">ID: {app.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmToggle(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {app.status === 'active' ? '暂停应用' : '恢复应用'}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            删除应用
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 应用信息 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">应用信息</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">设备上限</p>
            <p className="font-medium">{app.maxDevices === 0 ? '不限' : app.maxDevices}</p>
          </div>
          <div>
            <p className="text-gray-500">已注册设备</p>
            <p className="font-medium">{devices.length}</p>
          </div>
          <div>
            <p className="text-gray-500">创建时间</p>
            <p className="font-medium">{formatDate(app.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">到期时间</p>
            <p className="font-medium">{formatDate(app.expiresAt)}</p>
          </div>
        </div>
      </div>

      {/* 设备列表 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">设备列表 ({devices.length})</h3>
        </div>
        {devices.length === 0 ? (
          <EmptyState title="暂无设备" description="当 Unity 客户端首次验证时，设备将自动注册" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">设备</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">系统</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">最后IP</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">访问次数</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">最近访问</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">状态</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.deviceId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium">{d.deviceModel || d.fingerprint.slice(0, 12)}</td>
                    <td className="px-5 py-3 text-gray-500">{d.os}</td>
                    <td className="px-5 py-3 text-gray-500">{d.lastIP}</td>
                    <td className="px-5 py-3 text-gray-500">{d.accessCount}</td>
                    <td className="px-5 py-3 text-gray-500">{timeAgo(d.lastSeen)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={d.banned ? 'banned' : 'active'} />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggleBan(d)}
                        className={`text-sm font-medium ${d.banned ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                      >
                        {d.banned ? '解封' : '封禁'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmToggle}
        title={app.status === 'active' ? '暂停应用' : '恢复应用'}
        message={app.status === 'active' ? '暂停后所有使用该应用 Token 的 Unity 客户端将无法通过验证。' : '恢复后 Unity 客户端可正常验证。'}
        confirmText={app.status === 'active' ? '暂停' : '恢复'}
        danger={app.status === 'active'}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmToggle(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="删除应用"
        message="删除后 Token 将同步吊销，所有关联设备记录也将被清除。此操作不可撤销。"
        confirmText="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
