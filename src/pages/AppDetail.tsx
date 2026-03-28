import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApp, updateApp, deleteApp, getDevices, updateDevice } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ThemeButton, DeleteButton, BackButton, StatusToggle, RefreshButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';
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
      <div className="space-y-4">
        <BackButton onClick={() => navigate('/apps')} />
        
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-display font-bold text-dark tracking-tight">{app.name}</h2>
              <StatusBadge status={app.status} />
            </div>
            <p className="mt-1.5 text-[12px] font-medium text-dark/40 font-mono">{app.id}</p>
          </div>
          <div className="flex gap-4 shrink-0 items-center">
            <RefreshButton onClick={load} className="shadow-md" />
            <ThemeButton onClick={openEdit}>编辑</ThemeButton>
            <ThemeButton onClick={() => setShowToken(true)} variant="gray">Token</ThemeButton>
            <div className="flex flex-col items-center gap-1 group relative">
              <StatusToggle 
                checked={app.status === 'active'} 
                onChange={() => setConfirmToggle(true)} 
              />
              <span className="text-[10px] font-bold text-dark/30 group-hover:text-amber-600 transition-colors uppercase">
                {app.status === 'active' ? '运行中' : '已暂停'}
              </span>
            </div>
            <div className="w-px h-8 bg-neutral-100 mx-1" />
            <DeleteButton onClick={() => setConfirmDel(true)} />
          </div>
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
                    <ThemeButton 
                      onClick={() => toggleBan(d)} 
                      variant={d.banned ? 'amber' : 'red'}
                      className="scale-90 origin-left"
                    >
                      {d.banned ? '解 封' : '封 禁'}
                    </ThemeButton>
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
            <h3 className="text-lg font-display font-bold text-dark mb-8">编辑应用</h3>
            <div className="space-y-10">
              <WaveInput label="应用名称" value={editName} onChange={e => setEditName(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                <WaveInput label="设备上限 (0=不限)" type="number" min={0} value={editMaxDevices} onChange={e => setEditMaxDevices(Number(e.target.value))} />
                <WaveInput label="日志保留 (-1=全部)" type="number" value={editLogRetention} onChange={e => setEditLogRetention(Number(e.target.value))} />
                <WaveInput label="到期时间 (留空=永久)" type="datetime-local" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)} className="col-span-2" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <ThemeButton variant="gray" onClick={() => setShowEdit(false)}>取消</ThemeButton>
                <ThemeButton onClick={saveEdit} disabled={saving || !editName.trim()}>
                  {saving ? '保存中...' : '保 存 修 改'}
                </ThemeButton>
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
            <div className="flex justify-end gap-3 mt-5">
              <ThemeButton onClick={copy}>{copied ? '已复制' : '复制'}</ThemeButton>
              <ThemeButton variant="gray" onClick={() => setShowToken(false)}>关闭</ThemeButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmToggle} title={app.status === 'active' ? '暂停应用' : '恢复应用'} message={app.status === 'active' ? '暂停后客户端将无法通过验证。' : '恢复后客户端可正常验证。'} confirmText={app.status === 'active' ? '暂停' : '恢复'} danger={app.status === 'active'} onConfirm={toggleStatus} onCancel={() => setConfirmToggle(false)} />
      <ConfirmDialog open={confirmDel} title="删除应用" message="Token 同步吊销，设备记录清除，不可撤销。" confirmText="删除" danger onConfirm={del} onCancel={() => setConfirmDel(false)} />
    </div>
  );
}
