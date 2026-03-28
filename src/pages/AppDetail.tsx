import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { BackButton, DeleteButton, RefreshButton, StatusToggle, ThemeButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';
import { useI18n } from '@/contexts/I18nContext';
import { deleteApp, getApp, getDevices, updateApp, updateDevice } from '@/lib/api';
import { formatAccessWindow, formatDate, formatGeoRestriction, timeAgo } from '@/lib/utils';
import type { AccessWindow, AppInfo, DeviceInfo, GeoRestriction } from '@/types';

const DEFAULT_ACCESS_WINDOW: AccessWindow = {
  enabled: false,
  startHour: 9,
  endHour: 18,
  timezone: 'Asia/Shanghai',
};

const DEFAULT_GEO_RESTRICTION: GeoRestriction = {
  enabled: false,
  allowedCountries: [],
  allowedRegions: [],
};

const COUNTRY_CODE_REFERENCE_URL = 'https://www.ditig.com/iso-3166-country-codes';
const EDGEONE_GEO_REFERENCE_URL = 'https://edgeone.ai/document/52690';

export function AppDetail() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { language } = useI18n();

  const [app, setApp] = useState<AppInfo | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMaxDevices, setEditMaxDevices] = useState(0);
  const [editLogRetention, setEditLogRetention] = useState(-1);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editAccessWindowEnabled, setEditAccessWindowEnabled] = useState(false);
  const [editAccessWindowStartHour, setEditAccessWindowStartHour] = useState(9);
  const [editAccessWindowEndHour, setEditAccessWindowEndHour] = useState(18);
  const [editAccessWindowTimezone, setEditAccessWindowTimezone] = useState('Asia/Shanghai');
  const [editGeoRestrictionEnabled, setEditGeoRestrictionEnabled] = useState(false);
  const [editAllowedCountries, setEditAllowedCountries] = useState('');
  const [editAllowedRegions, setEditAllowedRegions] = useState('');
  const [saving, setSaving] = useState(false);

  const text =
    language === 'zh'
      ? {
          loadFailed: '加载失败',
          saveFailed: '保存失败',
          actionFailed: '操作失败',
          deleteFailed: '删除失败',
          notFound: '应用不存在',
          edit: '编辑',
          running: '运行中',
          paused: '已暂停',
          summary: ['设备上限', '已注册设备', '日志保留', '开放时段', '地域限制', '创建时间', '到期时间'],
          noLogRetention: '不记录',
          allLogs: '全部',
          devicesTitle: '管理设备',
          noDevices: '暂无设备',
          noDevicesDesc: 'Unity 客户端首次验证时自动注册',
          deviceColumns: ['设备', '系统', '时区', 'IP', '次数', '最近访问', '状态', '操作'],
          ban: '封禁',
          unban: '解除封禁',
          editTitle: '编辑应用',
          name: '应用名称',
          maxDevices: '设备上限 (0=不限)',
          logRetention: '日志保留 (-1=全部)',
          expiresAt: '到期时间 (留空=永久)',
          limitAccessWindow: '限制每日开放时段',
          accessWindowDesc: '未开启时默认全天开放。按小时重复生效，支持跨天，例如 22:00 到 06:00。',
          startHour: '开始小时 (0-23)',
          endHour: '结束小时 (1-24)',
          timezone: '时区',
          limitGeo: '限制国家 / 地区',
          geoDesc: '使用逗号分隔。国家建议填 ISO 两位码，例如 CN, US。地区可填平台返回的 regionCode 或 regionName。结合日志限定较好。',
          countryCodeLink: '查看国家码',
          edgeOneLink: '查看 EdgeOne 地区字段',
          allowedCountries: '允许国家',
          allowedRegions: '允许地区',
          cancel: '取消',
          save: '保存修改',
          saving: '保存中...',
          tokenTitle: '应用 Token',
          tokenDesc: '配置到 Unity 客户端中使用',
          noToken: '无法获取',
          copied: '已复制',
          copy: '复制',
          close: '关闭',
          suspendTitle: '暂停应用',
          resumeTitle: '恢复应用',
          suspendMessage: '暂停后客户端将无法通过验证。',
          resumeMessage: '恢复后客户端可正常验证。',
          suspendConfirm: '暂停',
          resumeConfirm: '恢复',
          deleteTitle: '删除应用',
          deleteMessage: 'Token 会同步吊销，设备记录和访问日志也会一并清理，此操作不可撤销。',
          deleteConfirm: '删除',
          unlimited: '不限',
        }
      : {
          loadFailed: 'Failed to load app',
          saveFailed: 'Failed to save changes',
          actionFailed: 'Action failed',
          deleteFailed: 'Failed to delete app',
          notFound: 'App not found',
          edit: 'Edit',
          running: 'Running',
          paused: 'Paused',
          summary: ['Device limit', 'Registered devices', 'Log retention', 'Access window', 'Geo restriction', 'Created at', 'Expires at'],
          noLogRetention: 'Disabled',
          allLogs: 'All',
          devicesTitle: 'Devices',
          noDevices: 'No devices yet',
          noDevicesDesc: 'Unity clients are registered on their first successful verification',
          deviceColumns: ['Device', 'System', 'Timezone', 'IP', 'Count', 'Last seen', 'Status', 'Action'],
          ban: 'Ban',
          unban: 'Unban',
          editTitle: 'Edit app',
          name: 'App name',
          maxDevices: 'Device limit (0 = unlimited)',
          logRetention: 'Log retention (-1 = all)',
          expiresAt: 'Expires at (blank = never)',
          limitAccessWindow: 'Limit daily access window',
          accessWindowDesc: 'When disabled, access stays open all day. The window repeats every day by hour and supports crossing midnight, for example 22:00 to 06:00.',
          startHour: 'Start hour (0-23)',
          endHour: 'End hour (1-24)',
          timezone: 'Timezone',
          limitGeo: 'Limit country / region',
          geoDesc: 'Separate entries with commas. Countries should use ISO alpha-2 codes such as CN or US. Regions can use the regionCode or regionName returned by the platform. It is best to confirm values against logs before enforcing them.',
          countryCodeLink: 'Country code reference',
          edgeOneLink: 'EdgeOne geo fields',
          allowedCountries: 'Allowed countries',
          allowedRegions: 'Allowed regions',
          cancel: 'Cancel',
          save: 'Save changes',
          saving: 'Saving...',
          tokenTitle: 'App token',
          tokenDesc: 'Use this in the Unity client configuration',
          noToken: 'Unavailable',
          copied: 'Copied',
          copy: 'Copy',
          close: 'Close',
          suspendTitle: 'Suspend app',
          resumeTitle: 'Resume app',
          suspendMessage: 'Clients will no longer pass verification while the app is suspended.',
          resumeMessage: 'Clients can verify again after the app is resumed.',
          suspendConfirm: 'Suspend',
          resumeConfirm: 'Resume',
          deleteTitle: 'Delete app',
          deleteMessage: 'The token will be revoked and all device records and access logs will be removed. This action cannot be undone.',
          deleteConfirm: 'Delete',
          unlimited: 'Unlimited',
        };

  useEffect(() => {
    if (appId) {
      load();
    }
  }, [appId]);

  async function load() {
    try {
      setLoading(true);
      const [appResponse, devicesResponse] = await Promise.all([getApp(appId!), getDevices(appId!)]);
      setApp(appResponse);
      setDevices(devicesResponse);
      if (appResponse.token) {
        setToken(appResponse.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : text.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  function openEdit() {
    if (!app) {
      return;
    }

    const accessWindow = app.accessWindow ?? DEFAULT_ACCESS_WINDOW;
    const geoRestriction = app.geoRestriction ?? DEFAULT_GEO_RESTRICTION;

    setEditName(app.name);
    setEditMaxDevices(app.maxDevices);
    setEditLogRetention(app.logRetention ?? -1);
    setEditExpiresAt(app.expiresAt ? app.expiresAt.slice(0, 16) : '');
    setEditAccessWindowEnabled(accessWindow.enabled);
    setEditAccessWindowStartHour(accessWindow.startHour);
    setEditAccessWindowEndHour(accessWindow.endHour);
    setEditAccessWindowTimezone(accessWindow.timezone);
    setEditGeoRestrictionEnabled(geoRestriction.enabled);
    setEditAllowedCountries(geoRestriction.allowedCountries.join(', '));
    setEditAllowedRegions(geoRestriction.allowedRegions.join(', '));
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!app) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await updateApp(app.id, {
        name: editName.trim(),
        maxDevices: editMaxDevices,
        logRetention: editLogRetention,
        expiresAt: editExpiresAt || null,
        accessWindow: buildAccessWindowPayload(
          editAccessWindowEnabled,
          editAccessWindowStartHour,
          editAccessWindowEndHour,
          editAccessWindowTimezone,
          language,
        ),
        geoRestriction: buildGeoRestrictionPayload(editGeoRestrictionEnabled, editAllowedCountries, editAllowedRegions),
      });
      setApp(updated);
      setShowEdit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!app) {
      return;
    }

    try {
      setApp(await updateApp(app.id, { status: app.status === 'active' ? 'suspended' : 'active' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.actionFailed);
    }

    setConfirmToggle(false);
  }

  async function removeApp() {
    if (!app) {
      return;
    }

    try {
      await deleteApp(app.id);
      navigate('/apps', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : text.deleteFailed);
    }

    setConfirmDelete(false);
  }

  async function toggleBan(device: DeviceInfo) {
    try {
      const updated = await updateDevice(appId!, device.deviceId, { banned: !device.banned });
      setDevices((prev) => prev.map((item) => (item.deviceId === updated.deviceId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.actionFailed);
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!app) {
    return <p className="text-neutral-400">{text.notFound}</p>;
  }

  const summaryItems: [string, string][] = [
    [text.summary[0], app.maxDevices === 0 ? text.unlimited : String(app.maxDevices)],
    [text.summary[1], String(devices.length)],
    [text.summary[2], app.logRetention === 0 ? text.noLogRetention : app.logRetention === -1 || app.logRetention == null ? text.allLogs : String(app.logRetention)],
    [text.summary[3], formatAccessWindow(app.accessWindow, language)],
    [text.summary[4], formatGeoRestriction(app.geoRestriction, language)],
    [text.summary[5], formatDate(app.createdAt, language)],
    [text.summary[6], formatDate(app.expiresAt, language)],
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <div className="space-y-4">
        <BackButton onClick={() => navigate('/apps')} />

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold tracking-tight text-dark">{app.name}</h2>
              <StatusBadge status={app.status} />
            </div>
            <p className="mt-1.5 font-mono text-[12px] font-medium text-dark/40">{app.id}</p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <RefreshButton onClick={load} className="shadow-md" />
            <ThemeButton onClick={openEdit}>{text.edit}</ThemeButton>
            <ThemeButton onClick={() => setShowToken(true)} variant="gray">Token</ThemeButton>
            <div className="group relative flex flex-col items-center gap-1">
              <StatusToggle checked={app.status === 'active'} onChange={() => setConfirmToggle(true)} />
              <span className="text-[10px] font-bold uppercase text-dark/30 transition-colors group-hover:text-amber-600">
                {app.status === 'active' ? text.running : text.paused}
              </span>
            </div>
            <div className="mx-1 h-8 w-px bg-neutral-100" />
            <DeleteButton onClick={() => setConfirmDelete(true)} />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-2.5 text-[13px] text-red-500">{error}</p>}

      <div className="card px-7 py-6">
        <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
          {summaryItems.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <p className="text-[12px] font-medium uppercase tracking-wider text-dark/50">{label}</p>
              <p className="text-[15px] font-semibold text-dark/90">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-neutral-100/60 bg-white/40 px-6 py-5">
          <span className="text-[16px] font-bold tracking-tight text-dark/90">
            {text.devicesTitle} <span className="ml-1 font-medium text-dark/40">({devices.length})</span>
          </span>
        </div>

        {devices.length === 0 ? (
          <EmptyState title={text.noDevices} description={text.noDevicesDesc} />
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] font-semibold uppercase tracking-wider text-dark/50">
                {text.deviceColumns.map((column) => (
                  <th key={column} className="px-6 py-4">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.deviceId} className="group border-b border-neutral-100/40 transition-all duration-200 last:border-0 hover:bg-white/60">
                  <td className="px-6 py-4 font-semibold text-dark/90">{device.deviceModel || device.fingerprint.slice(0, 12)}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{device.os}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{device.timezone || '-'}</td>
                  <td className="px-6 py-4 font-mono text-[12px] font-medium text-dark/50">{device.lastIP}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{device.accessCount}</td>
                  <td className="px-6 py-4 text-[13px] font-medium text-dark/60">{timeAgo(device.lastSeen, language)}</td>
                  <td className="px-6 py-4"><StatusBadge status={device.banned ? 'banned' : 'active'} /></td>
                  <td className="px-6 py-4">
                    <ThemeButton onClick={() => toggleBan(device)} variant={device.banned ? 'amber' : 'red'} className="origin-left scale-90">
                      {device.banned ? text.unban : text.ban}
                    </ThemeButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-8 font-display text-lg font-bold text-dark">{text.editTitle}</h3>
            <div className="space-y-8">
              <WaveInput label={text.name} value={editName} onChange={(event) => setEditName(event.target.value)} />

              <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                <WaveInput label={text.maxDevices} type="number" min={0} value={editMaxDevices} onChange={(event) => setEditMaxDevices(Number(event.target.value))} />
                <WaveInput label={text.logRetention} type="number" value={editLogRetention} onChange={(event) => setEditLogRetention(Number(event.target.value))} />
                <WaveInput label={text.expiresAt} type="datetime-local" value={editExpiresAt} onChange={(event) => setEditExpiresAt(event.target.value)} className="col-span-2" />
              </div>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4">
                <label className="flex items-center gap-3 text-[13px] font-semibold text-dark/80">
                  <input type="checkbox" checked={editAccessWindowEnabled} onChange={(event) => setEditAccessWindowEnabled(event.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400" />
                  {text.limitAccessWindow}
                </label>
                <p className="mt-2 text-[12px] font-medium text-dark/45">{text.accessWindowDesc}</p>

                {editAccessWindowEnabled && (
                  <div className="mt-5 grid grid-cols-3 gap-4">
                    <WaveInput label={text.startHour} type="number" min={0} max={23} value={editAccessWindowStartHour} onChange={(event) => setEditAccessWindowStartHour(Number(event.target.value))} />
                    <WaveInput label={text.endHour} type="number" min={1} max={24} value={editAccessWindowEndHour} onChange={(event) => setEditAccessWindowEndHour(Number(event.target.value))} />
                    <WaveInput label={text.timezone} value={editAccessWindowTimezone} onChange={(event) => setEditAccessWindowTimezone(event.target.value)} />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4">
                <label className="flex items-center gap-3 text-[13px] font-semibold text-dark/80">
                  <input type="checkbox" checked={editGeoRestrictionEnabled} onChange={(event) => setEditGeoRestrictionEnabled(event.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400" />
                  {text.limitGeo}
                </label>
                <p className="mt-2 text-[12px] font-medium text-dark/45">{text.geoDesc}</p>

                <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-semibold">
                  <a href={COUNTRY_CODE_REFERENCE_URL} target="_blank" rel="noreferrer" className="text-amber-700 transition-colors hover:text-amber-800 hover:underline">
                    {text.countryCodeLink}
                  </a>
                  <a href={EDGEONE_GEO_REFERENCE_URL} target="_blank" rel="noreferrer" className="text-amber-700 transition-colors hover:text-amber-800 hover:underline">
                    {text.edgeOneLink}
                  </a>
                </div>

                {editGeoRestrictionEnabled && (
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <WaveInput label={text.allowedCountries} value={editAllowedCountries} onChange={(event) => setEditAllowedCountries(event.target.value)} />
                    <WaveInput label={text.allowedRegions} value={editAllowedRegions} onChange={(event) => setEditAllowedRegions(event.target.value)} />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <ThemeButton variant="gray" onClick={() => setShowEdit(false)}>{text.cancel}</ThemeButton>
                <ThemeButton onClick={saveEdit} disabled={saving || !editName.trim()}>{saving ? text.saving : text.save}</ThemeButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {showToken && (
        <div className="modal-backdrop" onClick={() => setShowToken(false)}>
          <div className="modal-box max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-dark">{text.tokenTitle}</h3>
                <p className="text-[13px] font-medium text-dark/50">{text.tokenDesc}</p>
              </div>
            </div>
            <div className="select-all break-all rounded-xl border border-neutral-200/50 bg-neutral-50/50 p-4 font-mono text-[13px] text-dark/70 shadow-inner">
              {token || text.noToken}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <ThemeButton onClick={copyToken}>{copied ? text.copied : text.copy}</ThemeButton>
              <ThemeButton variant="gray" onClick={() => setShowToken(false)}>{text.close}</ThemeButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmToggle}
        title={app.status === 'active' ? text.suspendTitle : text.resumeTitle}
        message={app.status === 'active' ? text.suspendMessage : text.resumeMessage}
        confirmText={app.status === 'active' ? text.suspendConfirm : text.resumeConfirm}
        danger={app.status === 'active'}
        onConfirm={toggleStatus}
        onCancel={() => setConfirmToggle(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={text.deleteTitle}
        message={text.deleteMessage}
        confirmText={text.deleteConfirm}
        danger
        onConfirm={removeApp}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function buildAccessWindowPayload(
  enabled: boolean,
  startHour: number,
  endHour: number,
  timezone: string,
  language: 'zh' | 'en',
): AccessWindow {
  const normalizedTimezone = timezone.trim() || DEFAULT_ACCESS_WINDOW.timezone;

  if (!enabled) {
    return {
      ...DEFAULT_ACCESS_WINDOW,
      timezone: normalizedTimezone,
    };
  }

  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    throw new Error(language === 'zh' ? '开始小时必须在 0 到 23 之间' : 'Start hour must be between 0 and 23');
  }

  if (!Number.isInteger(endHour) || endHour < 1 || endHour > 24) {
    throw new Error(language === 'zh' ? '结束小时必须在 1 到 24 之间' : 'End hour must be between 1 and 24');
  }

  if (startHour === endHour) {
    throw new Error(language === 'zh' ? '开始小时和结束小时不能相同' : 'Start hour and end hour cannot be the same');
  }

  return {
    enabled: true,
    startHour,
    endHour,
    timezone: normalizedTimezone,
  };
}

function buildGeoRestrictionPayload(enabled: boolean, countriesInput: string, regionsInput: string): GeoRestriction {
  if (!enabled) {
    return DEFAULT_GEO_RESTRICTION;
  }

  return {
    enabled: true,
    allowedCountries: splitCsv(countriesInput).map((item) => item.toUpperCase()),
    allowedRegions: splitCsv(regionsInput).map((item) => item.toUpperCase()),
  };
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
