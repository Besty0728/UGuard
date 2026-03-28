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
      <div className="flex items-start justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-display font-bold text-dark tracking-tight">{app.name}</h2>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-1.5 text-[12px] font-medium text-dark/40 font-mono">{app.id}</p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <button onClick={load} className="px-4 py-2 text-[13px] font-semibold text-dark/70 bg-white border border-neutral-200/60 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all outline-none">刷新</button>
          <button onClick={openEdit} className="px-4 py-2 text-[13px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/50 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-amber-100 transition-all outline-none">编辑</button>
          <button onClick={() => setShowToken(true)} className="px-4 py-2 text-[13px] font-semibold text-dark/70 bg-white border border-neutral-200/60 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all outline-none">Token</button>
          <button onClick={() => setConfirmToggle(true)} className="px-4 py-2 text-[13px] font-semibold text-dark/70 bg-white border border-neutral-200/60 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all outline-none">{app.status === 'active' ? '暂停' : '恢复'}</button>
          <button onClick={() => setConfirmDel(true)} className="px-4 py-2 text-[13px] font-semibold text-red-600 bg-red-50 border border-red-200/50 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-red-100 transition-all outline-none">删除</button>
        </div>
      </div>

      {error && <p className="text-[13px] text-red-500 bg-red-50/50 border border-red-100 px-4 py-2.5 rounded-xl">{error}</p>}

      {/* Info */}
      <div className="card px-7 py-6">
        <div className="grid grid-cols-5 gap-6">
          {[
            ['设备上限', app.maxDevices === 0 ? '不限' : String(app.maxDevices)],
            ['已注册', String(devices.length)],
            ['日志保留', app.logRetention === 0 ? '不记录' : app.logRetention === -1 || app.logRetention == null ? '全部' : `最近 ${app.logRetention} 条`],
            ['创建时间', formatDate(app.createdAt)],
            ['到期时间', formatDate(app.expiresAt)],
          ].map(([l, v]) => (
            <div key={l} className="flex flex-col gap-1.5">
              <p className="text-[12px] font-medium text-dark/50 uppercase tracking-wider">{l}</p>
              <p className="text-[15px] font-semibold text-dark/90">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Devices */}
      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100/60 bg-white/40">
          <span className="text-[16px] font-bold text-dark/90 tracking-tight">管理设备 <span className="text-dark/40 font-medium ml-1">({devices.length})</span></span>
        </div>
        {devices.length === 0 ? <EmptyState title="暂无设备" description="Unity 客户端首次验证时自动注册" /> : (
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] text-dark/50 font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">设备</th>
              <th className="px-6 py-4">系统</th>
              <th className="px-6 py-4">时区</th>
              <th className="px-6 py-4">IP</th>
              <th className="px-6 py-4">次数</th>
              <th className="px-6 py-4">最近</th>
              <th className="px-6 py-4">状态</th>
              <th className="px-6 py-4">操作</th>
            </tr></thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.deviceId} className="border-b border-neutral-100/40 last:border-0 hover:bg-white/60 transition-all duration-200 group">
                  <td className="px-6 py-4 font-semibold text-dark/90">{d.deviceModel || d.fingerprint.slice(0, 12)}</td>
                  <td className="px-6 py-4 font-medium text-dark/60 text-[13px]">{d.os}</td>
                  <td className="px-6 py-4 font-medium text-dark/60 text-[13px]">{d.timezone || '-'}</td>
                  <td className="px-6 py-4 font-medium text-dark/50 font-mono text-[12px]">{d.lastIP}</td>
                  <td className="px-6 py-4 font-medium text-dark/60 text-[13px]">{d.accessCount}</td>
                  <td className="px-6 py-4 font-medium text-dark/60 text-[13px]">{timeAgo(d.lastSeen)}</td>
                  <td className="px-6 py-4"><StatusBadge status={d.banned ? 'banned' : 'active'} /></td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleBan(d)} className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 border outline-none ${d.banned ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'text-red-600 bg-red-50 border-red-200/50 hover:bg-red-100'}`}>
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
            <h3 className="text-lg font-display font-bold text-dark mb-5">编辑应用</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-dark/80 mb-2">应用名称</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-dark bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-dark/80 mb-2">设备上限</label>
                <input type="number" min={0} value={editMaxDevices} onChange={e => setEditMaxDevices(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-dark bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all outline-none" />
                <p className="mt-1.5 text-[12px] font-medium text-dark/40">0 = 不限</p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-dark/80 mb-2">日志保留</label>
                <input type="number" value={editLogRetention} onChange={e => setEditLogRetention(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-dark bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all outline-none" />
                <p className="mt-1.5 text-[12px] font-medium text-dark/40">-1 = 全部记录, 0 = 不记录, N = 保留近 N 条</p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-dark/80 mb-2">到期时间</label>
                <input type="datetime-local" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-dark bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all outline-none" />
                <p className="mt-1.5 text-[12px] font-medium text-dark/40">留空 = 永不过期</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-[14px] font-semibold text-dark/70 border border-transparent hover:border-neutral-200 rounded-xl hover:bg-neutral-100 transition-all outline-none">取消</button>
                <button onClick={saveEdit} disabled={saving || !editName.trim()} className="px-4 py-2 text-[14px] font-semibold text-white bg-amber-500 border border-transparent rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 transition-all active:translate-y-0 active:shadow-sm outline-none">{saving ? '保存中...' : '保 存'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token modal */}
      {showToken && (
        <div className="modal-backdrop" onClick={() => setShowToken(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-dark">应用 Token</h3>
                <p className="text-[13px] text-dark/50 font-medium">配置到 Unity 客户端中使用</p>
              </div>
            </div>
            <div className="bg-neutral-50/50 rounded-xl p-4 font-mono text-[13px] text-dark/70 break-all select-all border border-neutral-200/50 shadow-inner">{token || '无法获取'}</div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={copy} className="px-4 py-2 text-[13px] font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm outline-none">{copied ? '已复制' : '复制'}</button>
              <button onClick={() => setShowToken(false)} className="px-4 py-2 text-[13px] font-semibold text-dark/70 rounded-xl hover:bg-neutral-100 transition-colors outline-none">关闭</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmToggle} title={app.status === 'active' ? '暂停应用' : '恢复应用'} message={app.status === 'active' ? '暂停后客户端将无法通过验证。' : '恢复后客户端可正常验证。'} confirmText={app.status === 'active' ? '暂停' : '恢复'} danger={app.status === 'active'} onConfirm={toggleStatus} onCancel={() => setConfirmToggle(false)} />
      <ConfirmDialog open={confirmDel} title="删除应用" message="Token 同步吊销，设备记录清除，不可撤销。" confirmText="删除" danger onConfirm={del} onCancel={() => setConfirmDel(false)} />
    </div>
  );
}
