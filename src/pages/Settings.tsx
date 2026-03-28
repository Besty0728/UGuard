import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '@/lib/api';
import { useI18n } from '@/contexts/I18nContext';
import { ThemeButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';

export function Settings() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { language } = useI18n();
  const navigate = useNavigate();

  const text =
    language === 'zh'
      ? {
          title: '系统设置',
          cardTitle: '修改密码',
          cardDesc: '修改系统管理后台的访问密码。修改成功后需使用新密码重新登录。',
          oldLabel: '原密码',
          newLabel: '新密码（至少 6 位）',
          confirmLabel: '确认新密码',
          submitIdle: '提交修改',
          submitBusy: '提交中...',
          needOld: '请输入原密码',
          shortPassword: '新密码长度不能少于 6 位',
          mismatch: '两次输入的新密码不一致',
          failed: '密码修改失败',
          success: '修改成功，请重新登录。正在跳转...',
        }
      : {
          title: 'Settings',
          cardTitle: 'Change password',
          cardDesc: 'Update the admin password for this console. You will be redirected to log in again after success.',
          oldLabel: 'Current password',
          newLabel: 'New password (min 6 chars)',
          confirmLabel: 'Confirm new password',
          submitIdle: 'Save password',
          submitBusy: 'Saving...',
          needOld: 'Please enter the current password',
          shortPassword: 'The new password must be at least 6 characters',
          mismatch: 'The new passwords do not match',
          failed: 'Failed to change password',
          success: 'Password updated. Redirecting to login...',
        };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!oldPassword) {
      setError(text.needOld);
      return;
    }

    if (newPassword.length < 6) {
      setError(text.shortPassword);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(text.mismatch);
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess(true);

      setTimeout(() => {
        sessionStorage.removeItem('adminKey');
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight text-dark">{text.title}</h2>
      </div>

      <div className="card rounded-2xl border border-neutral-100/60 bg-white/40 p-8 shadow-glass backdrop-blur-sm">
        <h3 className="mb-1 text-[17px] font-semibold text-dark">{text.cardTitle}</h3>
        <p className="mb-6 text-[13px] text-neutral-500">{text.cardDesc}</p>

        <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
          {error && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {success && <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-700">{text.success}</div>}

          <div className="space-y-10 pt-4">
            <WaveInput label={text.oldLabel} type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required />
            <WaveInput label={text.newLabel} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required />
            <WaveInput label={text.confirmLabel} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required />
          </div>

          <ThemeButton type="submit" disabled={loading || success} className="mt-2 w-full">
            {loading ? text.submitBusy : text.submitIdle}
          </ThemeButton>
        </form>
      </div>
    </div>
  );
}
