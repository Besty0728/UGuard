import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';

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
    <div className="flex items-center justify-center min-h-screen bg-[#fdfbf7] relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-300/5 rounded-full blur-3xl pointer-events-none" />

      <div className="login-box z-10 animate-fade-in">
        <span className="neon-line"></span>
        <span className="neon-line"></span>
        <span className="neon-line"></span>
        <span className="neon-line"></span>
        
        <div className="text-center mb-10">
          <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <p className="text-dark font-display">UGuard LOGIN</p>
        </div>

        <form onSubmit={submit} className="space-y-8">
          <div className="user-box">
            <WaveInput 
              label="管理密钥" 
              type="password" 
              value={key} 
              onChange={(e) => setKey(e.target.value)} 
              required
            />
          </div>
          
          {error && <p className="text-[12px] text-red-500 font-semibold text-center">{error}</p>}
          
          <div className="flex flex-col items-center">
            <ThemeButton type="submit" disabled={loading || !key.trim()} className="w-full">
              {loading ? '验证中...' : '进 入 控 制 台'}
            </ThemeButton>
            <p className="mt-6 text-[11px] text-dark/30 font-bold uppercase tracking-widest">Authorized Personnel Only</p>
          </div>
        </form>
      </div>
    </div>
  );
}
