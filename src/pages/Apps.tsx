import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [maxDevices, setMaxDevices] = useState(5);
  const [expiresAt, setExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

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

  function copy() { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-display font-bold text-dark tracking-tight">应用管理</h2>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold text-white bg-amber-500 border border-transparent rounded-xl shadow-sm hover:shadow-glass-hover hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-sm hover:bg-amber-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          创建应用
        </button>
      </div>

      {error && <p className="text-[13px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {apps.length === 0 ? <EmptyState title="暂无应用" description="点击「创建应用」开始" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-neutral-100 bg-white/40 text-[12px] text-dark/60 font-semibold uppercase tracking-wider">
              <th className="px-5 py-4">名称</th>
              <th className="px-5 py-4">状态</th>
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
            <h3 className="text-lg font-display font-bold text-dark mb-5">创建应用</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-dark/80 mb-2">应用名称</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="如：我的Unity项目" required autoFocus className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-dark bg-white/50 backdrop-blur-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-dark/80 mb-2">设备上限</label>
                <input type="number" min={0} value={maxDevices} onChange={e => setMaxDevices(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-dark bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all" />
                <p className="mt-1.5 text-[12px] font-medium text-dark/40">0 = 不限</p>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-dark/80 mb-2">到期时间 (可选)</label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-dark bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-[14px] font-semibold text-dark/70 border border-transparent hover:border-neutral-200 rounded-xl hover:bg-neutral-100 transition-all">取消</button>
                <button type="submit" disabled={creating} className="px-4 py-2 text-[14px] font-semibold text-white bg-amber-500 border border-transparent rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 transition-all active:translate-y-0 active:shadow-sm">{creating ? '...' : '创 建'}</button>
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
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={copy} className="px-4 py-2 text-[13px] font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-sm">{copied ? '已复制' : '复制 Token'}</button>
              <button onClick={() => { setShowToken(false); setToken(''); }} className="px-4 py-2 text-[13px] font-semibold text-dark/70 rounded-xl hover:bg-neutral-100 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
