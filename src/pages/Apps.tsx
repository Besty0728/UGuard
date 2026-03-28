import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApps, createApp, updateApp } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { ThemeButton, StatusToggle, RefreshButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';
import { formatDate } from '@/lib/utils';
import type { AppInfo } from '@/types';

export function Apps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [maxDevices, setMaxDevices] = useState(5);
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setLoading(true); setApps(await getApps()); }
    catch (e) { setError(e instanceof Error ? e.message : '加载失败'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const r = await createApp(name.trim(), maxDevices, expiresAt || null);
      setToken(r.token); setShowToken(true); setShowCreate(false);
      setName(''); setMaxDevices(5); setExpiresAt('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : '创建失败'); }
    finally { setCreating(false); }
  }

  async function handleToggleStatus(app: AppInfo) {
    if (toggling) return;
    
    setToggling(app.id);
    try {
      const newStatus = app.status === 'active' ? 'suspended' : 'active';
      const updated = await updateApp(app.id, { status: newStatus });
      setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
    } catch (e) {
      setError(e instanceof Error ? e.message : '切换失败');
    } finally {
      setToggling(null);
    }
  }

  function copy() { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-display font-bold text-dark tracking-tight">应用管理</h2>
        <div className="flex gap-3 items-center">
          <RefreshButton onClick={load} disabled={loading} />
          <ThemeButton onClick={() => setShowCreate(true)}>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              创建应用
            </div>
          </ThemeButton>
        </div>
      </div>

      {error && <p className="text-[13px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {apps.length === 0 ? <EmptyState title="暂无应用" description="点击「创建应用」开始" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-neutral-100 bg-white/40 text-[12px] text-dark/60 font-semibold uppercase tracking-wider">
              <th className="px-5 py-4">名称</th>
              <th className="px-5 py-4">结果</th>
              <th className="px-5 py-4">启用</th>
              <th className="px-5 py-4">设备上限</th>
              <th className="px-5 py-4">到期</th>
              <th className="px-5 py-4 text-right">操作</th>
            </tr></thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id} onClick={() => navigate(`/apps/${app.id}`)} className="border-b border-neutral-100/50 last:border-0 transition-all duration-200 hover:bg-white/60 cursor-pointer group">
                  <td className="px-5 py-4">
                    <span className="text-dark font-semibold text-[14px] group-hover:text-amber-600 transition-colors">{app.name}</span>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={app.status} /></td>
                  <td className="px-5 py-4">
                    <div onClick={e => e.stopPropagation()}>
                      <StatusToggle 
                        checked={app.status === 'active'} 
                        onChange={() => handleToggleStatus(app)} 
                        disabled={toggling === app.id}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-dark/60 font-medium text-[13px]">{app.maxDevices === 0 ? '不限' : app.maxDevices}</td>
                  <td className="px-5 py-4 text-dark/60 font-medium text-[13px]">{formatDate(app.expiresAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/50 rounded-xl shadow-sm group-hover:bg-amber-100 transition-all">
                      进入
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 -ml-2 group-hover:ml-0 group-hover:w-3.5 group-hover:opacity-100 transition-all duration-200"><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-display font-bold text-dark mb-10 text-center tracking-tight">创建新应用</h3>
            <form onSubmit={handleCreate} className="space-y-10">
              <WaveInput label="应用名称" value={name} onChange={e => setName(e.target.value)} placeholder=" " required autoFocus />
              
              <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                <WaveInput label="设备上限 (0=不限)" type="number" min={0} value={maxDevices} onChange={e => setMaxDevices(Number(e.target.value))} />
                <WaveInput label="到期时间 (可选)" type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <ThemeButton type="button" variant="gray" onClick={() => setShowCreate(false)}>取消</ThemeButton>
                <ThemeButton type="submit" disabled={creating}>{creating ? '正在创建...' : '确 认 创 建'}</ThemeButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Token modal */}
      {showToken && (
        <div className="modal-backdrop" onClick={() => { setShowToken(false); setToken(''); }}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-dark">创建成功</h3>
                <p className="text-[13px] text-dark/50 font-medium">可在应用详情页随时查看</p>
              </div>
            </div>
            <div className="bg-neutral-50/50 rounded-xl p-4 font-mono text-[13px] text-dark/70 break-all select-all border border-neutral-200/50 shadow-inner">{token}</div>
            <div className="flex justify-end gap-3 mt-5">
              <ThemeButton onClick={copy}>{copied ? '已复制' : '复制 Token'}</ThemeButton>
              <ThemeButton variant="gray" onClick={() => { setShowToken(false); setToken(''); }}>关闭</ThemeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
