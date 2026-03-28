import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { ThemeButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';

export function Login() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { language, toggleLanguage } = useI18n();
  const navigate = useNavigate();

  const text =
    language === 'zh'
      ? {
          title: 'UGuard LOGIN',
          label: '管理密钥',
          invalid: '密钥无效',
          network: '连接失败',
          submitIdle: '进入控制台',
          submitBusy: '验证中...',
          footer: '仅限授权人员',
          language: 'ENGLISH',
        }
      : {
          title: 'UGuard LOGIN',
          label: 'Admin key',
          invalid: 'Invalid key',
          network: 'Connection failed',
          submitIdle: 'Enter console',
          submitBusy: 'Verifying...',
          footer: 'Authorized Personnel Only',
          language: '中文',
        };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!key.trim()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const ok = await login(key.trim());
      if (ok) {
        navigate('/', { replace: true });
      } else {
        setError(text.invalid);
      }
    } catch {
      setError(text.network);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fdfbf7]">
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-amber-300/5 blur-3xl" />

      <div className="absolute right-8 top-8 z-20">
        <ThemeButton variant="gray" onClick={toggleLanguage}>
          <span className="text-[12px] font-bold uppercase tracking-[0.16em]">{text.language}</span>
        </ThemeButton>
      </div>

      <div className="login-box z-10 animate-fade-in">
        <span className="neon-line"></span>
        <span className="neon-line"></span>
        <span className="neon-line"></span>
        <span className="neon-line"></span>

        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </div>
          <p className="font-display text-dark">{text.title}</p>
        </div>

        <form onSubmit={submit} className="space-y-8">
          <div className="user-box">
            <WaveInput label={text.label} type="password" value={key} onChange={(event) => setKey(event.target.value)} required />
          </div>

          {error && <p className="text-center text-[12px] font-semibold text-red-500">{error}</p>}

          <div className="flex flex-col items-center">
            <ThemeButton type="submit" disabled={loading || !key.trim()} className="w-full">
              {loading ? text.submitBusy : text.submitIdle}
            </ThemeButton>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-dark/30">{text.footer}</p>
          </div>
        </form>
      </div>
    </div>
  );
}
