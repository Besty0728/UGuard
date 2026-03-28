import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createApp, getApps, updateApp } from '@/lib/api';
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

  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setApps(await getApps());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
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
      );
      const geoRestriction = buildGeoRestrictionPayload(geoRestrictionEnabled, allowedCountries, allowedRegions);
      const result = await createApp(name.trim(), maxDevices, expiresAt || null, accessWindow, geoRestriction);

      setToken(result.token);
      setShowToken(true);
      setShowCreate(false);
      resetCreateForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
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
      setError(err instanceof Error ? err.message : '切换失败');
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
    <div className="space-y-5 animate-fade-in">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold tracking-tight text-dark">应用管理</h2>
        <div className="flex items-center gap-3">
          <RefreshButton onClick={load} disabled={loading} />
          <ThemeButton onClick={() => setShowCreate(true)}>
            <div className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              创建应用
            </div>
          </ThemeButton>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-500">{error}</p>}

      {apps.length === 0 ? (
        <EmptyState title="暂无应用" description="点击“创建应用”开始" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100 bg-white/40 text-[12px] font-semibold uppercase tracking-wider text-dark/60">
                <th className="px-5 py-4">名称</th>
                <th className="px-5 py-4">状态</th>
                <th className="px-5 py-4">启用</th>
                <th className="px-5 py-4">设备上限</th>
                <th className="px-5 py-4">到期时间</th>
                <th className="px-5 py-4 text-right">操作</th>
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
                      <span className="text-[14px] font-semibold text-dark transition-colors group-hover:text-amber-600">
                        {app.name}
                      </span>
                      <p className="text-[12px] font-medium text-dark/40">{formatAccessWindow(app.accessWindow)}</p>
                      <p className="text-[12px] font-medium text-dark/35">{formatGeoRestriction(app.geoRestriction)}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <StatusToggle
                        checked={app.status === 'active'}
                        onChange={() => handleToggleStatus(app)}
                        disabled={toggling === app.id}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[13px] font-medium text-dark/60">
                    {app.maxDevices === 0 ? '不限' : app.maxDevices}
                  </td>
                  <td className="px-5 py-4 text-[13px] font-medium text-dark/60">{formatDate(app.expiresAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200/50 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 shadow-sm transition-all group-hover:bg-amber-100">
                      进入
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-0 -ml-2 transition-all duration-200 group-hover:ml-0 group-hover:w-3.5 group-hover:opacity-100"
                      >
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
            <h3 className="mb-10 text-center text-lg font-display font-bold tracking-tight text-dark">创建新应用</h3>
            <form onSubmit={handleCreate} className="space-y-8">
              <WaveInput
                label="应用名称"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder=" "
                required
                autoFocus
              />

              <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                <WaveInput
                  label="设备上限 (0=不限)"
                  type="number"
                  min={0}
                  value={maxDevices}
                  onChange={(event) => setMaxDevices(Number(event.target.value))}
                />
                <WaveInput
                  label="到期时间 (可选)"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4">
                <label className="flex items-center gap-3 text-[13px] font-semibold text-dark/80">
                  <input
                    type="checkbox"
                    checked={accessWindowEnabled}
                    onChange={(event) => setAccessWindowEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400"
                  />
                  限制每日开放时段
                </label>
                <p className="mt-2 text-[12px] font-medium text-dark/45">
                  未开启时默认全天开放。按小时重复生效，支持跨天，例如 22:00 到 06:00。
                </p>

                {accessWindowEnabled && (
                  <div className="mt-5 grid grid-cols-3 gap-4">
                    <WaveInput
                      label="开始小时 (0-23)"
                      type="number"
                      min={0}
                      max={23}
                      value={accessWindowStartHour}
                      onChange={(event) => setAccessWindowStartHour(Number(event.target.value))}
                    />
                    <WaveInput
                      label="结束小时 (1-24)"
                      type="number"
                      min={1}
                      max={24}
                      value={accessWindowEndHour}
                      onChange={(event) => setAccessWindowEndHour(Number(event.target.value))}
                    />
                    <WaveInput
                      label="时区"
                      value={accessWindowTimezone}
                      onChange={(event) => setAccessWindowTimezone(event.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-neutral-200/70 bg-neutral-50/70 p-4">
                <label className="flex items-center gap-3 text-[13px] font-semibold text-dark/80">
                  <input
                    type="checkbox"
                    checked={geoRestrictionEnabled}
                    onChange={(event) => setGeoRestrictionEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-400"
                  />
                  限制国家 / 地区
                </label>
                <p className="mt-2 text-[12px] font-medium text-dark/45">
                  使用逗号分隔。国家建议填 ISO 两位码，例如 CN, US。地区可填平台返回的 regionCode 或 regionName。
                </p>

                <div className="mt-3 flex flex-wrap gap-3 text-[12px] font-semibold">
                  <a
                    href={COUNTRY_CODE_REFERENCE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 transition-colors hover:text-amber-800 hover:underline"
                  >
                    查看国家码
                  </a>
                  <a
                    href={EDGEONE_GEO_REFERENCE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 transition-colors hover:text-amber-800 hover:underline"
                  >
                    查看 EdgeOne 地区字段
                  </a>
                </div>

                {geoRestrictionEnabled && (
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <WaveInput
                      label="允许国家"
                      value={allowedCountries}
                      onChange={(event) => setAllowedCountries(event.target.value)}
                      placeholder="CN, US"
                    />
                    <WaveInput
                      label="允许地区"
                      value={allowedRegions}
                      onChange={(event) => setAllowedRegions(event.target.value)}
                      placeholder="SH, GUANGDONG"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <ThemeButton type="button" variant="gray" onClick={() => setShowCreate(false)}>
                  取消
                </ThemeButton>
                <ThemeButton type="submit" disabled={creating}>
                  {creating ? '创建中...' : '确认创建'}
                </ThemeButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {showToken && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setShowToken(false);
            setToken('');
          }}
        >
          <div className="modal-box max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-500"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-dark">创建成功</h3>
                <p className="text-[13px] font-medium text-dark/50">可在应用详情页随时查看</p>
              </div>
            </div>
            <div className="select-all break-all rounded-xl border border-neutral-200/50 bg-neutral-50/50 p-4 font-mono text-[13px] text-dark/70 shadow-inner">
              {token}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <ThemeButton onClick={copyToken}>{copied ? '已复制' : '复制 Token'}</ThemeButton>
              <ThemeButton
                variant="gray"
                onClick={() => {
                  setShowToken(false);
                  setToken('');
                }}
              >
                关闭
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
): AccessWindow {
  const normalizedTimezone = timezone.trim() || DEFAULT_ACCESS_WINDOW.timezone;

  if (!enabled) {
    return {
      ...DEFAULT_ACCESS_WINDOW,
      timezone: normalizedTimezone,
    };
  }

  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    throw new Error('开始小时必须在 0 到 23 之间');
  }

  if (!Number.isInteger(endHour) || endHour < 1 || endHour > 24) {
    throw new Error('结束小时必须在 1 到 24 之间');
  }

  if (startHour === endHour) {
    throw new Error('开始小时和结束小时不能相同');
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
