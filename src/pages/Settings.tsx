import { useState } from 'react';
import { changePassword } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { ThemeButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';

export function Settings() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 基础防呆校验
    if (!oldPassword) {
      setError('请输入原密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码长度不能少于 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess(true);
      
      // 修改成功后登出并跳转回登录页
      setTimeout(() => {
        sessionStorage.removeItem('adminKey');
        navigate('/login');
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || '密码修改失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-dark tracking-tight">系统设置</h2>
      </div>

      <div className="card p-8 bg-white/40 backdrop-blur-sm border border-neutral-100/60 shadow-glass rounded-2xl">
        <h3 className="text-[17px] font-semibold text-dark mb-1">修改密码</h3>
        <p className="text-[13px] text-neutral-500 mb-6">修改系统管理后台的访问密码。修改成功后需使用新密码重新登录。</p>
        
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">
              修改成功，请重新登录。正在转跳...
            </div>
          )}

          <div className="space-y-10 pt-4">
            <WaveInput
              label="原密码"
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              required
            />

            <WaveInput
              label="新密码 (至少6位)"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <WaveInput
              label="确认新密码"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <ThemeButton
            type="submit"
            disabled={loading || success}
            className="w-full mt-2"
          >
            {loading ? '提交中...' : '提交修改'}
          </ThemeButton>
        </form>
      </div>
    </div>
  );
}
