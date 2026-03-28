import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function Login() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setError(''); setLoading(true);
    try {
      const ok = await login(key.trim());
      ok ? navigate('/', { replace: true }) : setError('密钥无效');
    } catch { setError('连接失败'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50 via-beige-200 to-beige-200 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-300/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[340px] animate-fade-in z-10">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm flex items-center justify-center mb-5 backdrop-blur-sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-dark tracking-tight">UGuard</h1>
          <p className="mt-2 text-[14px] font-medium text-dark/60">Unity 应用授权管理平台</p>
        </div>

        <form onSubmit={submit} className="card p-7 space-y-5">
          <div>
            <label className="block text-[13px] font-semibold text-dark/80 mb-2">管理密钥</label>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="••••••••" autoFocus required
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm font-medium text-dark bg-white/50 backdrop-blur-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-mono shadow-sm" />
          </div>
          {error && <p className="text-[13px] text-red-500 font-medium px-1">{error}</p>}
          <button type="submit" disabled={loading || !key.trim()} className="w-full py-3 mt-2 text-[15px] font-semibold text-white bg-amber-500 border border-amber-400 rounded-xl shadow-glass-hover hover:scale-[1.02] hover:bg-amber-600 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-amber-500 transition-all">
            {loading ? '验证中...' : '进 入 控 制 台'}
          </button>
        </form>
      </div>
    </div>
  );
}
