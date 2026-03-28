import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { BackButton, DeleteButton, RefreshButton, StatusToggle, ThemeButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';
import { deleteApp, getApp, getDevices, updateApp, updateDevice } from '@/lib/api';
import { formatAccessWindow, formatDate, timeAgo } from '@/lib/utils';
import type { AccessWindow, AppInfo, DeviceInfo } from '@/types';

const DEFAULT_ACCESS_WINDOW: AccessWindow = {
  enabled: false,
  startHour: 9,
  endHour: 18,
  timezone: 'Asia/Shanghai',
};

export function AppDetail() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<AppInfo | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMaxDevices, setEditMaxDevices] = useState(0);
  const [editLogRetention, setEditLogRetention] = useState(-1);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editAccessWindowEnabled, setEditAccessWindowEnabled] = useState(false);
  const [editAccessWindowStartHour, setEditAccessWindowStartHour] = useState(9);
  const [editAccessWindowEndHour, setEditAccessWindowEndHour] = useState(18);
  const [editAccessWindowTimezone, setEditAccessWindowTimezone] = useState('Asia/Shanghai');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (appId) {
      load();
    }
  }, [appId]);

  async function load() {
    try {
      setLoading(true);
      const [appResponse, devicesResponse] = await Promise.all([getApp(appId!), getDevices(appId!)]);
      setApp(appResponse);
      setDevices(devicesResponse);
      if (appResponse.token) {
        setToken(appResponse.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  function openEdit() {
    if (!app) {
      return;
    }

    const accessWindow = app.accessWindow ?? DEFAULT_ACCESS_WINDOW;
    setEditName(app.name);
    setEditMaxDevices(app.maxDevices);
    setEditLogRetention(app.logRetention ?? -1);
    setEditExpiresAt(app.expiresAt ? app.expiresAt.slice(0, 16) : '');
    setEditAccessWindowEnabled(accessWindow.enabled);
    setEditAccessWindowStartHour(accessWindow.startHour);
    setEditAccessWindowEndHour(accessWindow.endHour);
    setEditAccessWindowTimezone(accessWindow.timezone);
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!app) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await updateApp(app.id, {
        name: editName.trim(),
        maxDevices: editMaxDevices,
        logRetention: editLogRetention,
        expiresAt: editExpiresAt || null,
        accessWindow: buildAccessWindowPayload(
          editAccessWindowEnabled,
          editAccessWindowStartHour,
          editAccessWindowEndHour,
          editAccessWindowTimezone,
        ),
      });
      setApp(updated);
      setShowEdit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!app) {
      return;
    }

    try {
      setApp(await updateApp(app.id, { status: app.status === 'active' ? 'suspended' : 'active' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }

    setConfirmToggle(false);
  }

  async function removeApp() {
    if (!app) {
      return;
    }

    try {
      await deleteApp(app.id);
      navigate('/apps', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }

    setConfirmDelete(false);
  }

  async function toggleBan(device: DeviceInfo) {
    try {
      const updated = await updateDevice(appId!, device.deviceId, { banned: !device.banned });
      setDevices((prev) => prev.map((item) => (item.deviceId === updated.deviceId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!app) {
    return <p className="text-neutral-400">应用不存在</p>;
  }

  const summaryItems: [string, string][] = [
    ['设备上限', app.maxDevices === 0 ? '不限' : String(app.maxDevices)],
    ['已注册设备', String(devices.length)],
    ['日志保留', app.logRetention === 0 ? '不记录' : app.logRetention === -1 || app.logRetention == null ? '全部' : `最近 ${app.logRetention} 条`],
    ['开放时段', formatAccessWindow(app.accessWindow)],
    ['创建时间', formatDate(app.createdAt)],
    ['到期时间', formatDate(app.expiresAt)],
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-4">
        <BackButton onClick={() => navigate('/apps')} />

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-display font-bold tracking-tight text-dark">{app.name}</h2>
              <StatusBadge status={app.status} />
            </div>
            <p className="mt-1.5 font-mono text-[12px] font-medium text-dark/40">{app.id}</p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <RefreshButton onClick={load} className="shadow-md" />
            <ThemeButton onClick={openEdit}>编辑</ThemeButton>
            <ThemeButton onClick={() => setShowToken(true)} variant="gray">
              Token
            </ThemeButton>
            <div className="group relative flex flex-col items-center gap-1">
              <StatusToggle checked={app.status === 'active'} onChange={() => setConfirmToggle(true)} />
              <span className="text-[10px] font-bold uppercase text-dark/30 transition-colors group-hover:text-amber-600">
                {app.status === 'active' ? '运行中' : '已暂停'}
              </span>
            </div>
            <div className="mx-1 h-8 w-px bg-neutral-100" />
            <DeleteButton onClick={() => setConfirmDelete(true)} />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-2.5 text-[13px] text-red-500">{error}</p>}

      <div className="card px-7 py-6">
        <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
          {summaryItems.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <p className="text-[12px] font-medium uppercase tracking-wider text-dark/50">{label}</p>
              <p className="text-[15px] font-semibold text-dark/90">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-neutral-100/60 bg-white/40 px-6 py-5">
          <span className="text-[16px] font-bold tracking-tight text-dark/90">
            管理设备 <span className="ml-1 font-medium text-dark/40">({devices.length})</span>
          </span>
        </div>
        {devices.length === 0 ? (
          <EmptyState title="暂无设备" description="Unity 客户端首次验证时自动注册" />
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] font-semibold uppercase tracking-wider text-dark/50">
                <th className="px-6 py-4">设备</th>
                <th className="px-6 py-4">系统</th>
                <th className="px-6 py-4">时区</th>
                <th className="px-6 py-4">IP</th>
                <th className="px-6 py-4">次数</th>
                <th className="px-6 py-4">最近访问</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.deviceId}
                  className="group border-b border-neutral-100/40 transition-all duration-200 last:border-0 hover:bg-white/60"
                >
                  <td className="px-6 py-4 font-semibold text-dark/90">
                    {device.deviceModel || device.fingerprint.slice(0, 12)}
                  </td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{device.os}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{device.timezone || '-'}</td>
                  <td className="px-6 py-4 font-mono text-[12px] font-medium text-dark/50">{device.lastIP}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{device.accessCount}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{timeAgo(device.lastSeen)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={device.banned ? 'banned' : 'active'} />
                  </td>
                  <td className="px-6 py-4">
                    <ThemeButton
                      onClick={() => toggleBan(device)}
                      variant={device.banned ? 'amber' : 'red'}
                      className="origin-left scale-90"
                    >
                      {device.banned ? '解除封禁' : '封禁'}
                    </ThemeButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-8 text-lg font-display font-bold text-dark">编辑应用</h3>
            <div className="space-y-8">
              <WaveInput label="应用名称" value={editName} onChange={(event) => setEditName(event.target.value)} />

              <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                <WaveInput
                  label="设备上限 (0=不限)"
                  type="number"
                  min={0}
                  value={editMaxDevices}
                  onChange={(event) => setEditMaxDevices(Number(event.target.value))}
                />
                <WaveInput
                  label="日志保留 (-1=全部)"
                  type="number"
                  value={editLogRetention}
                  onChange={(event) => setEditLogRetention(Number(event.target.value))}
                />
                <WaveInput
                  label="到期时间 (留空=永久)"
                  type="datetime-local"
                  value={editExpiresAt}
                  onChange={(event) => setEditExpiresAt(event.target.value)}
                  className="col-span-2"
                />
              </div>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4">
                <label className="flex items-center gap-3 text-[13px] font-semibold text-dark/80">
                  <input
                    type="checkbox"
                    checked={editAccessWindowEnabled}
                    onChange={(event) => setEditAccessWindowEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400"
                  />
                  限制每日开放时段
                </label>
                <p className="mt-2 text-[12px] font-medium text-dark/45">
                  未开启时默认全天开放。按小时重复生效，支持跨天，例如 22:00 到 06:00。
                </p>

                {editAccessWindowEnabled && (
                  <div className="mt-5 grid grid-cols-3 gap-4">
                    <WaveInput
                      label="开始小时 (0-23)"
                      type="number"
                      min={0}
                      max={23}
                      value={editAccessWindowStartHour}
                      onChange={(event) => setEditAccessWindowStartHour(Number(event.target.value))}
                    />
                    <WaveInput
                      label="结束小时 (1-24)"
                      type="number"
                      min={1}
                      max={24}
                      value={editAccessWindowEndHour}
                      onChange={(event) => setEditAccessWindowEndHour(Number(event.target.value))}
                    />
                    <WaveInput
                      label="时区"
                      value={editAccessWindowTimezone}
                      onChange={(event) => setEditAccessWindowTimezone(event.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <ThemeButton variant="gray" onClick={() => setShowEdit(false)}>
                  取消
                </ThemeButton>
                <ThemeButton onClick={saveEdit} disabled={saving || !editName.trim()}>
                  {saving ? '保存中...' : '保存修改'}
                </ThemeButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {showToken && (
        <div className="modal-backdrop" onClick={() => setShowToken(false)}>
          <div className="modal-box max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-500"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-dark">应用 Token</h3>
                <p className="text-[13px] font-medium text-dark/50">配置到 Unity 客户端中使用</p>
              </div>
            </div>
            <div className="select-all break-all rounded-xl border border-neutral-200/50 bg-neutral-50/50 p-4 font-mono text-[13px] text-dark/70 shadow-inner">
              {token || '无法获取'}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <ThemeButton onClick={copyToken}>{copied ? '已复制' : '复制'}</ThemeButton>
              <ThemeButton variant="gray" onClick={() => setShowToken(false)}>
                关闭
              </ThemeButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmToggle}
        title={app.status === 'active' ? '暂停应用' : '恢复应用'}
        message={app.status === 'active' ? '暂停后客户端将无法通过验证。' : '恢复后客户端可正常验证。'}
        confirmText={app.status === 'active' ? '暂停' : '恢复'}
        danger={app.status === 'active'}
        onConfirm={toggleStatus}
        onCancel={() => setConfirmToggle(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="删除应用"
        message="Token 会同步吊销，设备记录清除，不可撤销。"
        confirmText="删除"
        danger
        onConfirm={removeApp}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function buildAccessWindowPayload(
  enabled: boolean,
  startHour: number,
  endHour: number,
  timezone: string,
): AccessWindow {
  const normalizedTimezone = timezone.trim() || DEFAULT_ACCESS_WINDOW.timezone;

  if (!enabled) {
    return {
      ...DEFAULT_ACCESS_WINDOW,
      timezone: normalizedTimezone,
    };
  }

  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    throw new Error('开始小时必须在 0 到 23 之间');
  }

  if (!Number.isInteger(endHour) || endHour < 1 || endHour > 24) {
    throw new Error('结束小时必须在 1 到 24 之间');
  }

  if (startHour === endHour) {
    throw new Error('开始小时和结束小时不能相同');
  }

  return {
    enabled: true,
    startHour,
    endHour,
    timezone: normalizedTimezone,
  };
}
