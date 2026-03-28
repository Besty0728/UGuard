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
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="w-full max-w-[340px] animate-fade-in">
        <div className="text-center mb-8">
          <div className="mx-auto w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="text-lg font-display font-semibold text-neutral-800">UGuard</h1>
          <p className="mt-0.5 text-[13px] text-neutral-400">Unity 应用授权管理平台</p>
        </div>

        <form onSubmit={submit} className="card p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">管理密钥</label>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin Key" autoFocus required
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50 transition-all" />
          </div>
          {error && <p className="text-[13px] text-red-500">{error}</p>}
          <button type="submit" disabled={loading || !key.trim()} className="w-full py-2 text-[13px] font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-30 transition-all">
            {loading ? '验证中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
