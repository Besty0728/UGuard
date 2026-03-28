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
      <div className="flex items-center justify-between">
        <h2 className="text-base font-display font-semibold text-neutral-800">应用管理</h2>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          创建应用
        </button>
      </div>

      {error && <p className="text-[13px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {apps.length === 0 ? <EmptyState title="暂无应用" description="点击「创建应用」开始" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b border-neutral-100 text-[11px] text-neutral-400 uppercase tracking-wider">
              <th className="text-left font-medium px-5 py-2.5">名称</th>
              <th className="text-left font-medium px-5 py-2.5">状态</th>
              <th className="text-left font-medium px-5 py-2.5">设备上限</th>
              <th className="text-left font-medium px-5 py-2.5">到期</th>
              <th className="text-right font-medium px-5 py-2.5">操作</th>
            </tr></thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id} onClick={() => navigate(`/apps/${app.id}`)} className="border-b border-neutral-100/60 last:border-0 transition-all duration-150 hover:bg-primary-50/40 cursor-pointer group">
                  <td className="px-5 py-3.5">
                    <span className="text-neutral-800 font-medium group-hover:text-primary-700 transition-colors">{app.name}</span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={app.status} /></td>
                  <td className="px-5 py-3.5 text-neutral-400">{app.maxDevices === 0 ? '不限' : app.maxDevices}</td>
                  <td className="px-5 py-3.5 text-neutral-400">{formatDate(app.expiresAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-primary-600 rounded-md group-hover:bg-primary-50 transition-all">
                      进入
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200"><polyline points="9 18 15 12 9 6"/></svg>
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
            <h3 className="text-sm font-display font-semibold text-neutral-800 mb-4">创建应用</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">应用名称</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="如：我的Unity项目" required autoFocus className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">设备上限</label>
                <input type="number" min={0} value={maxDevices} onChange={e => setMaxDevices(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50 transition-all" />
                <p className="mt-1 text-[11px] text-neutral-300">0 = 不限</p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">到期时间</label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50 transition-all" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-[13px] font-medium text-neutral-500 rounded-lg hover:bg-neutral-50 transition-colors">取消</button>
                <button type="submit" disabled={creating} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-30 transition-colors">{creating ? '...' : '创建'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Token modal */}
      {showToken && (
        <div className="modal-backdrop" onClick={() => { setShowToken(false); setToken(''); }}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h3 className="text-sm font-display font-semibold text-neutral-800">创建成功</h3>
                <p className="text-[11px] text-neutral-400">可在应用详情页随时查看</p>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3 font-mono text-[12px] text-neutral-600 break-all select-all border border-neutral-100">{token}</div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={copy} className="px-3 py-1.5 text-[13px] font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">{copied ? '已复制' : '复制 Token'}</button>
              <button onClick={() => { setShowToken(false); setToken(''); }} className="px-3 py-1.5 text-[13px] font-medium text-neutral-500 rounded-lg hover:bg-neutral-50 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
