import { useState } from 'react';
import { changePassword } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

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

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-dark/70">
              原密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className="w-full px-4 py-2.5 bg-white/50 border border-neutral-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-mono shadow-sm"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="请输入当前凭证"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-dark/70">
              新密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className="w-full px-4 py-2.5 bg-white/50 border border-neutral-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-mono shadow-sm"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="至少 6 位字符"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-1.5 mb-2">
            <label className="text-[13px] font-medium text-dark/70">
              确认新密码 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              className="w-full px-4 py-2.5 bg-white/50 border border-neutral-200/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-mono shadow-sm"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="重复输入新密码"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[14px] font-semibold rounded-xl transition-all disabled:opacity-50 shadow-glass disabled:hover:shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 active:translate-y-0 disabled:active:translate-y-0 mt-2"
          >
            {loading ? '提交中...' : '提交修改'}
          </button>
        </form>
      </div>
    </div>
  );
}
