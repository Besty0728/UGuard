import { useState } from 'react';

const tabs = [
  { id: 'quickstart', label: '快速开始' },
  { id: 'api', label: 'API 说明' },
  { id: 'errors', label: '拒绝原因' },
] as const;

type TabId = (typeof tabs)[number]['id'];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative mb-4">
      <div className="overflow-hidden rounded-2xl border border-[#2a2623] bg-[#1c1917] shadow-xl">
        <div className="border-b border-dark/50 bg-[#2a2623]/80 px-4 py-3">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full border border-dark/20 bg-[#ff5f56]" />
            <div className="h-3 w-3 rounded-full border border-dark/20 bg-[#ffbd2e]" />
            <div className="h-3 w-3 rounded-full border border-dark/20 bg-[#27c93f]" />
          </div>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-[14px] leading-relaxed text-[#fdf8ed]">
          <code>{code}</code>
        </pre>
      </div>
      <button
        onClick={copy}
        className="absolute right-2 top-1.5 rounded-lg border border-white/20 px-3 py-1 text-[12px] font-bold text-white/50 opacity-0 transition-all hover:bg-white/10 hover:text-white group-hover:opacity-100"
      >
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[17px] font-display font-bold text-dark">{title}</h3>
      <div className="space-y-3 text-[14px] font-medium leading-relaxed text-dark/70">{children}</div>
    </div>
  );
}

function Inline({ children }: { children: React.ReactNode }) {
  return (
    <code className="mx-0.5 rounded-md border border-amber-500/10 bg-amber-50 px-1.5 py-0.5 font-mono text-[13px] font-medium text-amber-900 shadow-sm">
      {children}
    </code>
  );
}

export function Docs() {
  const [active, setActive] = useState<TabId>('quickstart');

  return (
    <div className="max-w-[920px] space-y-8 animate-fade-in">
      <h2 className="text-2xl font-display font-bold tracking-tight text-dark">接入文档</h2>

      <div className="mb-6 flex w-fit gap-2 rounded-xl border border-neutral-100/60 bg-white/40 p-1.5 shadow-sm backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`cursor-pointer rounded-lg border px-4 py-1.5 text-[14px] font-semibold transition-all ${
              active === tab.id
                ? 'border-amber-400 bg-amber-500 text-white shadow-sm'
                : 'border-transparent text-dark/60 hover:bg-white/50 hover:text-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'quickstart' && <Quickstart />}
      {active === 'api' && <ApiRef />}
      {active === 'errors' && <Errors />}
    </div>
  );
}

function Quickstart() {
  return (
    <div className="space-y-5">
      <Section title="整体流程">
        <p>
          Unity 客户端调用 <Inline>POST /api/verify</Inline> 完成授权校验。服务端会依次校验
          Token、应用状态、到期时间、国家/地区限制、每日开放时段、设备封禁和设备上限。
        </p>
        <p>
          接口始终走同一个端点，客户端可以从响应里的 <Inline>reason</Inline>、<Inline>message</Inline> 和{' '}
          <Inline>detail</Inline> 拿到拒绝原因；网络超时则由客户端本地归类为 <Inline>network_timeout</Inline>。
        </p>
      </Section>

      <Section title="Unity 示例">
        <p>下面的脚本示例已经兼容新的结构化返回信息，并加入了网络超时识别。</p>
        <CodeBlock
          code={`using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;
using System.Text;

public class UGuardAuth : MonoBehaviour
{
    [Header("服务地址")]
    public string serverUrl = "https://your-domain.com";

    [Header("应用 Token")]
    public string token = "sk_your_token_here";

    public bool IsVerified { get; private set; }
    public bool IsBusy { get; private set; }
    public string LastReason { get; private set; }
    public string LastMessage { get; private set; }
    public VerifyDetail LastDetail { get; private set; }
    public string[] Permissions { get; private set; } = Array.Empty<string>();

    public void Verify()
    {
        if (!IsBusy)
        {
            StartCoroutine(VerifyCoroutine());
        }
    }

    private IEnumerator VerifyCoroutine()
    {
        IsBusy = true;
        IsVerified = false;
        LastReason = null;
        LastMessage = null;
        LastDetail = null;

        string json = JsonUtility.ToJson(new VerifyRequest
        {
            token = token,
            fingerprint = GenerateFingerprint(),
            os = SystemInfo.operatingSystem,
            unityVersion = Application.unityVersion,
            deviceModel = SystemInfo.deviceModel,
            timezone = TimeZoneInfo.Local.Id,
        });

        using var req = new UnityWebRequest($"{serverUrl}/api/verify", "POST");
        req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        req.timeout = 15;

        yield return req.SendWebRequest();

        if (req.result == UnityWebRequest.Result.Success)
        {
            var res = JsonUtility.FromJson<VerifyResponse>(req.downloadHandler.text);
            IsVerified = res.valid;

            if (res.valid)
            {
                Permissions = res.permissions != null && res.permissions.features != null
                    ? res.permissions.features
                    : Array.Empty<string>();
                Debug.Log("[UGuard] 验证通过");
            }
            else
            {
                LastReason = string.IsNullOrEmpty(res.reason) ? "unknown" : res.reason;
                LastMessage = string.IsNullOrEmpty(res.message) ? "未提供描述" : res.message;
                LastDetail = res.detail;
                Debug.LogWarning($"[UGuard] 验证失败: {LastReason} / {LastMessage}");
            }
        }
        else
        {
            LastReason = IsTimeout(req) ? "network_timeout" : "network_error";
            LastMessage = req.error;
            Debug.LogError($"[UGuard] 请求失败: {LastReason} / {req.error} / HTTP {req.responseCode}");
        }

        IsBusy = false;
    }

    private bool IsTimeout(UnityWebRequest req)
    {
        if (req == null) return false;
        string error = req.error ?? string.Empty;
        return error.IndexOf("timed out", StringComparison.OrdinalIgnoreCase) >= 0
            || error.IndexOf("timeout", StringComparison.OrdinalIgnoreCase) >= 0;
    }

    private string GenerateFingerprint()
    {
        return string.Join("|",
            SystemInfo.deviceUniqueIdentifier,
            SystemInfo.deviceName,
            SystemInfo.processorType,
            SystemInfo.graphicsDeviceName
        );
    }

    [Serializable]
    private class VerifyRequest
    {
        public string token;
        public string fingerprint;
        public string os;
        public string unityVersion;
        public string deviceModel;
        public string timezone;
    }

    [Serializable]
    public class VerifyResponse
    {
        public bool valid;
        public string reason;
        public string message;
        public VerifyDetail detail;
        public PermissionsData permissions;
    }

    [Serializable]
    public class VerifyDetail
    {
        public string status;
        public string expiresAt;
        public int limit;
        public string timezone;
        public int startHour;
        public int endHour;
        public int currentHour;
        public string countryCode;
        public string countryName;
        public string regionCode;
        public string regionName;
        public string[] allowedCountries;
        public string[] allowedRegions;
        public string[] missingFields;
    }

    [Serializable]
    public class PermissionsData
    {
        public string[] features;
    }
}`}
        />
      </Section>

      <Section title="管理后台能力">
        <ul className="list-inside list-disc space-y-1.5 text-[13px] text-neutral-600">
          <li>可以设置绝对到期时间 <Inline>expiresAt</Inline></li>
          <li>可以设置每日开放时段 <Inline>accessWindow</Inline>，按小时重复生效，支持跨天</li>
          <li>可以设置国家 / 地区限制 <Inline>geoRestriction</Inline></li>
          <li>删除应用时会同时清理 Token、设备记录和该应用的访问日志</li>
        </ul>
      </Section>
    </div>
  );
}

function ApiRef() {
  return (
    <div className="space-y-5">
      <Section title="POST /api/verify">
        <p>
          Unity 客户端调用此接口完成鉴权。该接口不需要 <Inline>X-Admin-Key</Inline>。
        </p>
      </Section>

      <div className="card space-y-3 p-4">
        <p className="text-[12px] font-medium uppercase tracking-wider text-neutral-500">请求体</p>
        <CodeBlock
          code={`{
  "token": "sk_xxx",
  "fingerprint": "device fingerprint",
  "os": "Windows 11",
  "unityVersion": "2022.3.10f1",
  "deviceModel": "DESKTOP_XXX",
  "timezone": "Asia/Shanghai"
}`}
        />
      </div>

      <div className="card space-y-3 p-4">
        <p className="text-[12px] font-medium uppercase tracking-wider text-neutral-500">成功响应</p>
        <CodeBlock
          code={`{
  "valid": true,
  "permissions": {
    "features": ["full"]
  }
}`}
        />
      </div>

      <div className="card space-y-3 p-4">
        <p className="text-[12px] font-medium uppercase tracking-wider text-neutral-500">失败响应</p>
        <CodeBlock
          code={`{
  "valid": false,
  "reason": "outside_access_hours",
  "message": "当前不在开放时段内",
  "detail": {
    "timezone": "Asia/Shanghai",
    "startHour": 9,
    "endHour": 18,
    "currentHour": 22
  }
}`}
        />
      </div>

      <Section title="应用对象中的新增字段">
        <CodeBlock
          code={`{
  "accessWindow": {
    "enabled": true,
    "startHour": 9,
    "endHour": 18,
    "timezone": "Asia/Shanghai"
  },
  "geoRestriction": {
    "enabled": true,
    "allowedCountries": ["CN", "US"],
    "allowedRegions": ["SH", "GUANGDONG"]
  }
}`}
        />
      </Section>

      <Section title="验证链路">
        <ol className="list-inside list-decimal space-y-2 text-[13px] text-neutral-600">
          <li>检查 <Inline>token</Inline> 和 <Inline>fingerprint</Inline> 是否存在</li>
          <li>校验 Token 是否有效、是否已吊销</li>
          <li>检查应用是否存在、是否暂停、是否过期</li>
          <li>检查国家 / 地区是否在允许范围内</li>
          <li>检查当前时间是否命中每日开放时段</li>
          <li>检查设备是否被封禁、是否超过设备上限</li>
          <li>通过后返回 <Inline>{'{ valid: true, permissions: ... }'}</Inline></li>
        </ol>
      </Section>
    </div>
  );
}

function Errors() {
  const rows = [
    ['missing_required_fields', '缺少 token 或 fingerprint', '补齐请求字段'],
    ['invalid_token', 'Token 无效', '检查后台中的 Token 是否正确'],
    ['token_revoked', 'Token 已吊销', '重新生成或恢复 Token'],
    ['app_not_found', '应用不存在', '确认应用未被删除'],
    ['app_suspended', '应用已暂停', '后台恢复应用'],
    ['app_expired', '应用已过期', '续期后再验证'],
    ['geo_restricted', '国家或地区不允许访问', '调整后台地区白名单'],
    ['outside_access_hours', '当前不在开放时段内', '在开放时段内再次验证'],
    ['device_banned', '设备已封禁', '后台解除封禁'],
    ['max_devices_reached', '设备数已达上限', '清理设备或提高上限'],
    ['internal_error', '服务端内部错误', '查看服务端日志'],
    ['network_timeout', '客户端请求超时', '客户端本地判断，不是服务端响应'],
    ['network_error', '客户端网络错误', '客户端本地判断，不是服务端响应'],
  ] as const;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-neutral-500">
        以下是 Unity 端会消费的拒绝原因。其中前 11 个来自 <Inline>/api/verify</Inline>，后 2 个来自客户端本地网络异常判断。
      </p>

      <div className="card overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] font-semibold uppercase tracking-wider text-dark/50">
              <th className="px-6 py-4">reason</th>
              <th className="px-6 py-4">含义</th>
              <th className="px-6 py-4">建议处理</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([reason, meaning, action]) => (
              <tr key={reason} className="border-b border-neutral-100/40 transition-all duration-200 last:border-0 hover:bg-white/60">
                <td className="whitespace-nowrap px-6 py-4 font-mono text-[13px] font-medium text-amber-700">{reason}</td>
                <td className="px-6 py-4 text-[13px] font-medium text-dark/70">{meaning}</td>
                <td className="px-6 py-4 text-[13px] font-medium text-dark/50">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
