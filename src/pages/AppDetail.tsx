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
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  // 编辑弹窗
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMaxDevices, setEditMaxDevices] = useState(0);
  const [editLogRetention, setEditLogRetention] = useState(-1);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (appId) load(); }, [appId]);

  async function load() {
    try {
      setLoading(true);
      const [a, d] = await Promise.all([getApp(appId!), getDevices(appId!)]);
      setApp(a); if (a.token) setToken(a.token); setDevices(d);
    } catch (e) { setError(e instanceof Error ? e.message : '加载失败'); }
    finally { setLoading(false); }
  }

  function openEdit() {
    if (!app) return;
    setEditName(app.name);
    setEditMaxDevices(app.maxDevices);
    setEditLogRetention(app.logRetention ?? -1);
    setEditExpiresAt(app.expiresAt ? app.expiresAt.slice(0, 16) : '');
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!app) return;
    setSaving(true);
    try {
      const updated = await updateApp(app.id, {
        name: editName.trim(),
        maxDevices: editMaxDevices,
        logRetention: editLogRetention,
        expiresAt: editExpiresAt || null,
      });
      setApp(updated);
      setShowEdit(false);
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
    finally { setSaving(false); }
  }

  async function toggleStatus() {
    if (!app) return;
    try { setApp(await updateApp(app.id, { status: app.status === 'active' ? 'suspended' : 'active' })); } catch (e) { setError(e instanceof Error ? e.message : '失败'); }
    setConfirmToggle(false);
  }

  async function del() {
    if (!app) return;
    try { await deleteApp(app.id); navigate('/apps', { replace: true }); } catch (e) { setError(e instanceof Error ? e.message : '失败'); }
    setConfirmDel(false);
  }

  async function toggleBan(d: DeviceInfo) {
    try { const u = await updateDevice(appId!, d.deviceId, { banned: !d.banned }); setDevices(prev => prev.map(x => x.deviceId === u.deviceId ? u : x)); } catch (e) { setError(e instanceof Error ? e.message : '失败'); }
  }

  function copy() { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (loading) return <LoadingSpinner />;
  if (!app) return <p className="text-neutral-400">应用不存在</p>;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-display font-semibold text-neutral-800">{app.name}</h2>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-neutral-300 font-mono">{app.id}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={load} className="px-2.5 py-1 text-[12px] font-medium text-neutral-500 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">刷新</button>
          <button onClick={openEdit} className="px-2.5 py-1 text-[12px] font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">编辑</button>
          <button onClick={() => setShowToken(true)} className="px-2.5 py-1 text-[12px] font-medium text-neutral-500 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">Token</button>
          <button onClick={() => setConfirmToggle(true)} className="px-2.5 py-1 text-[12px] font-medium text-neutral-500 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">{app.status === 'active' ? '暂停' : '恢复'}</button>
          <button onClick={() => setConfirmDel(true)} className="px-2.5 py-1 text-[12px] font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">删除</button>
        </div>
      </div>

      {error && <p className="text-[13px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {/* Info */}
      <div className="card px-5 py-4">
        <div className="grid grid-cols-5 gap-5">
          {[
            ['设备上限', app.maxDevices === 0 ? '不限' : String(app.maxDevices)],
            ['已注册', String(devices.length)],
            ['日志保留', app.logRetention === 0 ? '不记录' : app.logRetention === -1 || app.logRetention == null ? '全部' : `最近 ${app.logRetention} 条`],
            ['创建时间', formatDate(app.createdAt)],
            ['到期时间', formatDate(app.expiresAt)],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-[11px] text-neutral-400 mb-0.5">{l}</p>
              <p className="text-[13px] font-medium text-neutral-700">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Devices */}
      <div className="card">
        <div className="px-5 py-3 border-b border-neutral-100">
          <span className="text-[13px] font-medium text-neutral-700">设备 <span className="text-neutral-300">({devices.length})</span></span>
        </div>
        {devices.length === 0 ? <EmptyState title="暂无设备" description="Unity 客户端首次验证时自动注册" /> : (
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-neutral-100 text-[11px] text-neutral-400 uppercase tracking-wider">
              <th className="text-left font-medium px-5 py-2">设备</th>
              <th className="text-left font-medium px-5 py-2">系统</th>
              <th className="text-left font-medium px-5 py-2">时区</th>
              <th className="text-left font-medium px-5 py-2">IP</th>
              <th className="text-left font-medium px-5 py-2">次数</th>
              <th className="text-left font-medium px-5 py-2">最近</th>
              <th className="text-left font-medium px-5 py-2">状态</th>
              <th className="text-left font-medium px-5 py-2">操作</th>
            </tr></thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.deviceId} className="border-b border-neutral-100/60 last:border-0 hover:bg-primary-50/30 transition-all duration-150 group">
                  <td className="px-5 py-2.5 font-medium text-neutral-700">{d.deviceModel || d.fingerprint.slice(0, 12)}</td>
                  <td className="px-5 py-2.5 text-neutral-400">{d.os}</td>
                  <td className="px-5 py-2.5 text-neutral-400">{d.timezone || '-'}</td>
                  <td className="px-5 py-2.5 text-neutral-400 font-mono text-xs">{d.lastIP}</td>
                  <td className="px-5 py-2.5 text-neutral-400">{d.accessCount}</td>
                  <td className="px-5 py-2.5 text-neutral-400">{timeAgo(d.lastSeen)}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={d.banned ? 'banned' : 'active'} /></td>
                  <td className="px-5 py-2.5">
                    <button onClick={() => toggleBan(d)} className={`text-[12px] font-medium px-2 py-0.5 rounded transition-colors ${d.banned ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-red-500 bg-red-50 hover:bg-red-100'}`}>
                      {d.banned ? '解封' : '封禁'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-display font-semibold text-neutral-800 mb-4">编辑应用</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">应用名称</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">设备上限</label>
                <input type="number" min={0} value={editMaxDevices} onChange={e => setEditMaxDevices(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50 transition-all" />
                <p className="mt-1 text-[11px] text-neutral-300">0 = 不限</p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">日志保留</label>
                <input type="number" value={editLogRetention} onChange={e => setEditLogRetention(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50 transition-all" />
                <p className="mt-1 text-[11px] text-neutral-300">-1 = 全部记录, 0 = 不记录, N = 保留最近 N 条</p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">到期时间</label>
                <input type="datetime-local" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50 transition-all" />
                <p className="mt-1 text-[11px] text-neutral-300">留空 = 永不过期</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowEdit(false)} className="px-3 py-1.5 text-[13px] font-medium text-neutral-500 rounded-lg hover:bg-neutral-50 transition-colors">取消</button>
                <button onClick={saveEdit} disabled={saving || !editName.trim()} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-30 transition-colors">{saving ? '保存中...' : '保存'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token modal */}
      {showToken && (
        <div className="modal-backdrop" onClick={() => setShowToken(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-display font-semibold text-neutral-800 mb-1">应用 Token</h3>
            <p className="text-[12px] text-neutral-400 mb-3">配置到 Unity 客户端中使用</p>
            <div className="bg-neutral-50 rounded-lg p-3 font-mono text-[12px] text-neutral-600 break-all select-all border border-neutral-100">{token || '无法获取'}</div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={copy} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">{copied ? '已复制' : '复制'}</button>
              <button onClick={() => setShowToken(false)} className="px-3 py-1.5 text-[13px] font-medium text-neutral-500 rounded-lg hover:bg-neutral-50 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmToggle} title={app.status === 'active' ? '暂停应用' : '恢复应用'} message={app.status === 'active' ? '暂停后客户端将无法通过验证。' : '恢复后客户端可正常验证。'} confirmText={app.status === 'active' ? '暂停' : '恢复'} danger={app.status === 'active'} onConfirm={toggleStatus} onCancel={() => setConfirmToggle(false)} />
      <ConfirmDialog open={confirmDel} title="删除应用" message="Token 同步吊销，设备记录清除，不可撤销。" confirmText="删除" danger onConfirm={del} onCancel={() => setConfirmDel(false)} />
    </div>
  );
}
