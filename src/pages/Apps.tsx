import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createApp, getApps, updateApp } from '@/lib/api';
import { useI18n } from '@/contexts/I18nContext';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { RefreshButton, StatusToggle, ThemeButton } from '@/components/common/Buttons';
import { WaveInput } from '@/components/common/Inputs';
import { formatAccessWindow, formatDate, formatGeoRestriction } from '@/lib/utils';
import type { AccessWindow, AppInfo, GeoRestriction } from '@/types';

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

export function Apps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [maxDevices, setMaxDevices] = useState(5);
  const [expiresAt, setExpiresAt] = useState('');
  const [accessWindowEnabled, setAccessWindowEnabled] = useState(false);
  const [accessWindowStartHour, setAccessWindowStartHour] = useState(9);
  const [accessWindowEndHour, setAccessWindowEndHour] = useState(18);
  const [accessWindowTimezone, setAccessWindowTimezone] = useState('Asia/Shanghai');
  const [geoRestrictionEnabled, setGeoRestrictionEnabled] = useState(false);
  const [allowedCountries, setAllowedCountries] = useState('');
  const [allowedRegions, setAllowedRegions] = useState('');
  const [creating, setCreating] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const { language } = useI18n();
  const navigate = useNavigate();

  const text =
    language === 'zh'
      ? {
          title: '应用管理',
          createApp: '创建应用',
          emptyTitle: '暂无应用',
          emptyDesc: '点击“创建应用”开始',
          name: '应用名称',
          maxDevices: '设备上限 (0=不限)',
          expiresAt: '到期时间（可选）',
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
          createConfirm: '确认创建',
          creating: '创建中...',
          createSuccess: '创建成功',
          tokenHint: '可在应用详情页随时查看',
          copied: '已复制',
          copyToken: '复制 Token',
          close: '关闭',
          loadFailed: '加载失败',
          createFailed: '创建失败',
          toggleFailed: '切换失败',
          unlimited: '不限',
          enter: '进入',
          columns: ['名称', '状态', '启用', '设备上限', '到期时间', '操作'],
        }
      : {
          title: 'Apps',
          createApp: 'Create app',
          emptyTitle: 'No apps yet',
          emptyDesc: 'Create your first app to get started',
          name: 'App name',
          maxDevices: 'Device limit (0 = unlimited)',
          expiresAt: 'Expires at (optional)',
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
          createConfirm: 'Create app',
          creating: 'Creating...',
          createSuccess: 'App created',
          tokenHint: 'You can also view it later on the app detail page',
          copied: 'Copied',
          copyToken: 'Copy token',
          close: 'Close',
          loadFailed: 'Failed to load apps',
          createFailed: 'Failed to create app',
          toggleFailed: 'Failed to change status',
          unlimited: 'Unlimited',
          enter: 'Open',
          columns: ['Name', 'Status', 'Enabled', 'Device limit', 'Expires at', 'Action'],
        };

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setApps(await getApps());
    } catch (err) {
      setError(err instanceof Error ? err.message : text.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setCreating(true);
    setError('');

    try {
      const accessWindow = buildAccessWindowPayload(
        accessWindowEnabled,
        accessWindowStartHour,
        accessWindowEndHour,
        accessWindowTimezone,
        language,
      );
      const geoRestriction = buildGeoRestrictionPayload(geoRestrictionEnabled, allowedCountries, allowedRegions);
      const result = await createApp(name.trim(), maxDevices, expiresAt || null, accessWindow, geoRestriction);

      setToken(result.token);
      setShowToken(true);
      setShowCreate(false);
      resetCreateForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : text.createFailed);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(app: AppInfo) {
    if (toggling) {
      return;
    }

    setToggling(app.id);
    setError('');

    try {
      const updated = await updateApp(app.id, {
        status: app.status === 'active' ? 'suspended' : 'active',
      });
      setApps((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.toggleFailed);
    } finally {
      setToggling(null);
    }
  }

  function resetCreateForm() {
    setName('');
    setMaxDevices(5);
    setExpiresAt('');
    setAccessWindowEnabled(false);
    setAccessWindowStartHour(DEFAULT_ACCESS_WINDOW.startHour);
    setAccessWindowEndHour(DEFAULT_ACCESS_WINDOW.endHour);
    setAccessWindowTimezone(DEFAULT_ACCESS_WINDOW.timezone);
    setGeoRestrictionEnabled(false);
    setAllowedCountries('');
    setAllowedRegions('');
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight text-dark">{text.title}</h2>
        <div className="flex items-center gap-3">
          <RefreshButton onClick={load} disabled={loading} />
          <ThemeButton onClick={() => setShowCreate(true)}>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {text.createApp}
            </div>
          </ThemeButton>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-500">{error}</p>}

      {apps.length === 0 ? (
        <EmptyState title={text.emptyTitle} description={text.emptyDesc} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100 bg-white/40 text-[12px] font-semibold uppercase tracking-wider text-dark/60">
                {text.columns.map((column, index) => (
                  <th key={column} className={`px-5 py-4 ${index === text.columns.length - 1 ? 'text-right' : ''}`}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => navigate(`/apps/${app.id}`)}
                  className="group cursor-pointer border-b border-neutral-100/50 transition-all duration-200 last:border-0 hover:bg-white/60"
                >
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <span className="text-[14px] font-semibold text-dark transition-colors group-hover:text-amber-600">{app.name}</span>
                      <p className="text-[12px] font-medium text-dark/40">{formatAccessWindow(app.accessWindow, language)}</p>
                      <p className="text-[12px] font-medium text-dark/35">{formatGeoRestriction(app.geoRestriction, language)}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={app.status} /></td>
                  <td className="px-5 py-4">
                    <div onClick={(event) => event.stopPropagation()}>
                      <StatusToggle checked={app.status === 'active'} onChange={() => handleToggleStatus(app)} disabled={toggling === app.id} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[13px] font-medium text-dark/60">{app.maxDevices === 0 ? text.unlimited : app.maxDevices}</td>
                  <td className="px-5 py-4 text-[13px] font-medium text-dark/60">{formatDate(app.expiresAt, language)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200/50 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 shadow-sm transition-all group-hover:bg-amber-100">
                      {text.enter}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="-ml-2 opacity-0 transition-all duration-200 group-hover:ml-0 group-hover:w-3.5 group-hover:opacity-100">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-10 text-center font-display text-lg font-bold tracking-tight text-dark">{text.createApp}</h3>
            <form onSubmit={handleCreate} className="space-y-8">
              <WaveInput label={text.name} value={name} onChange={(event) => setName(event.target.value)} placeholder=" " required autoFocus />

              <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                <WaveInput label={text.maxDevices} type="number" min={0} value={maxDevices} onChange={(event) => setMaxDevices(Number(event.target.value))} />
                <WaveInput label={text.expiresAt} type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
              </div>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4">
                <label className="flex items-center gap-3 text-[13px] font-semibold text-dark/80">
                  <input type="checkbox" checked={accessWindowEnabled} onChange={(event) => setAccessWindowEnabled(event.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400" />
                  {text.limitAccessWindow}
                </label>
                <p className="mt-2 text-[12px] font-medium text-dark/45">{text.accessWindowDesc}</p>

                {accessWindowEnabled && (
                  <div className="mt-5 grid grid-cols-3 gap-4">
                    <WaveInput label={text.startHour} type="number" min={0} max={23} value={accessWindowStartHour} onChange={(event) => setAccessWindowStartHour(Number(event.target.value))} />
                    <WaveInput label={text.endHour} type="number" min={1} max={24} value={accessWindowEndHour} onChange={(event) => setAccessWindowEndHour(Number(event.target.value))} />
                    <WaveInput label={text.timezone} value={accessWindowTimezone} onChange={(event) => setAccessWindowTimezone(event.target.value)} />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4">
                <label className="flex items-center gap-3 text-[13px] font-semibold text-dark/80">
                  <input type="checkbox" checked={geoRestrictionEnabled} onChange={(event) => setGeoRestrictionEnabled(event.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400" />
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

                {geoRestrictionEnabled && (
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <WaveInput label={text.allowedCountries} value={allowedCountries} onChange={(event) => setAllowedCountries(event.target.value)} placeholder="CN, US" />
                    <WaveInput label={text.allowedRegions} value={allowedRegions} onChange={(event) => setAllowedRegions(event.target.value)} placeholder="CN-SD, SHANDONG" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <ThemeButton type="button" variant="gray" onClick={() => setShowCreate(false)}>
                  {text.cancel}
                </ThemeButton>
                <ThemeButton type="submit" disabled={creating}>
                  {creating ? text.creating : text.createConfirm}
                </ThemeButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {showToken && (
        <div className="modal-backdrop" onClick={() => {
          setShowToken(false);
          setToken('');
        }}>
          <div className="modal-box max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-dark">{text.createSuccess}</h3>
                <p className="text-[13px] font-medium text-dark/50">{text.tokenHint}</p>
              </div>
            </div>
            <div className="select-all break-all rounded-xl border border-neutral-200/50 bg-neutral-50/50 p-4 font-mono text-[13px] text-dark/70 shadow-inner">
              {token}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <ThemeButton onClick={copyToken}>{copied ? text.copied : text.copyToken}</ThemeButton>
              <ThemeButton variant="gray" onClick={() => {
                setShowToken(false);
                setToken('');
              }}>
                {text.close}
              </ThemeButton>
            </div>
          </div>
        </div>
      )}
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
