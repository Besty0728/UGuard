import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';

const unitySample = `using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;
using System.Text;

public class UGuardAuth : MonoBehaviour
{
    public string serverUrl = "https://your-domain.com";
    public string token = "sk_your_token_here";

    public bool IsVerified { get; private set; }
    public bool IsBusy { get; private set; }
    public string LastReason { get; private set; }
    public string LastMessage { get; private set; }
    public VerifyDetail LastDetail { get; private set; }

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
            LastReason = res.reason;
            LastMessage = res.message;
            LastDetail = res.detail;
        }
        else
        {
            LastReason = "network_error";
            LastMessage = req.error;
        }

        IsBusy = false;
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
}`;

const requestSample = `{
  "token": "sk_xxx",
  "fingerprint": "device fingerprint",
  "os": "Windows 11",
  "unityVersion": "2022.3.10f1",
  "deviceModel": "DESKTOP_XXX",
  "timezone": "Asia/Shanghai"
}`;

const successSample = `{
  "valid": true,
  "permissions": {
    "features": ["full"]
  }
}`;

const failedSample = `{
  "valid": false,
  "reason": "outside_access_hours",
  "message": "Current request is outside the allowed access window",
  "detail": {
    "timezone": "Asia/Shanghai",
    "startHour": 9,
    "endHour": 18,
    "currentHour": 22
  }
}`;

const appFieldsSample = `{
  "accessWindow": {
    "enabled": true,
    "startHour": 9,
    "endHour": 18,
    "timezone": "Asia/Shanghai"
  },
  "geoRestriction": {
    "enabled": true,
    "allowedCountries": ["CN", "US"],
    "allowedRegions": ["CN-SD", "GUANGDONG"]
  }
}`;

type TabId = 'quickstart' | 'api' | 'errors';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const { language } = useI18n();
  const copyText = language === 'zh' ? { idle: '复制', done: '已复制' } : { idle: 'Copy', done: 'Copied' };

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
      <button onClick={copy} className="absolute right-2 top-1.5 rounded-lg border border-white/20 px-3 py-1 text-[12px] font-bold text-white/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-white">
        {copied ? copyText.done : copyText.idle}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-display text-[17px] font-bold text-dark">{title}</h3>
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
  const { language } = useI18n();

  const text =
    language === 'zh'
      ? {
          title: '接入文档',
          tabs: [
            { id: 'quickstart' as const, label: '快速开始' },
            { id: 'api' as const, label: 'API 说明' },
            { id: 'errors' as const, label: '拒绝原因' },
          ],
          flowTitle: '整体流程',
          flowText1: 'Unity 客户端调用 ',
          flowText2: ' 完成授权校验。服务端会依次校验 Token、应用状态、到期时间、国家/地区限制、开放时段、设备封禁和设备上限。',
          flowText3: '拒绝时可以从 ',
          flowText4: '、',
          flowText5: ' 和 ',
          flowText6: ' 中获得结构化信息；网络超时则由客户端本地归类。',
          unityTitle: 'Unity 示例',
          unityDesc: '下面脚本演示了如何读取 valid / reason / message / detail。',
          adminTitle: '后台能力',
          adminItems: [
            '支持绝对到期时间 expiresAt',
            '支持按小时循环的每日开放时段 accessWindow',
            '支持国家 / 地区限制 geoRestriction',
            '删除应用时会一起清理 Token、设备记录和访问日志',
          ],
          apiTitle: 'POST /api/verify',
          apiDesc: 'Unity 客户端通过该接口完成鉴权。此接口不需要 X-Admin-Key。',
          requestBody: '请求体',
          successBody: '成功响应',
          failedBody: '失败响应',
          fieldsTitle: '应用对象中的扩展字段',
          chainTitle: '验证链路',
          chainItems: [
            '检查 token 和 fingerprint 是否存在',
            '校验 Token 是否有效、是否已吊销',
            '检查应用是否存在、是否暂停、是否过期',
            '检查当前地区是否命中允许范围',
            '检查当前时间是否在开放时段内',
            '检查设备是否被封禁、是否超过上限',
            '成功时返回 valid=true 与 permissions',
          ],
          errorsIntro: '以下是 Unity 客户端可能消费到的拒绝原因。前面的原因来自 /api/verify，网络类原因由客户端本地归类。',
          meaning: '含义',
          action: '建议处理',
          errorRows: [
            ['missing_required_fields', '缺少 token 或 fingerprint', '补齐请求字段'],
            ['invalid_token', 'Token 无效', '检查后台里对应 Token 是否正确'],
            ['token_revoked', 'Token 已吊销', '重新生成或恢复 Token'],
            ['app_not_found', '应用不存在', '确认应用未被删除'],
            ['app_suspended', '应用已暂停', '后台恢复应用'],
            ['app_expired', '应用已过期', '续期后重新验证'],
            ['geo_restricted', '当前国家或地区不允许访问', '调整后台地理限制'],
            ['outside_access_hours', '当前不在开放时段内', '在开放时段内再次验证'],
            ['device_banned', '设备已封禁', '后台解除设备封禁'],
            ['max_devices_reached', '设备数已达上限', '清理设备或提高上限'],
            ['internal_error', '服务端内部错误', '检查服务端日志'],
            ['network_timeout', '客户端请求超时', '检查客户端网络与超时设置'],
            ['network_error', '客户端网络错误', '检查客户端网络环境'],
          ],
        }
      : {
          title: 'Integration docs',
          tabs: [
            { id: 'quickstart' as const, label: 'Quick start' },
            { id: 'api' as const, label: 'API reference' },
            { id: 'errors' as const, label: 'Failure reasons' },
          ],
          flowTitle: 'Flow overview',
          flowText1: 'The Unity client sends ',
          flowText2: ' to complete verification. The server checks the token, app status, expiration, geo restriction, access window, device ban state, and device limit in order.',
          flowText3: 'When verification is denied, read structured data from ',
          flowText4: ', ',
          flowText5: ' and ',
          flowText6: '; network timeout categories are decided by the client.',
          unityTitle: 'Unity example',
          unityDesc: 'The sample below shows how to consume valid / reason / message / detail.',
          adminTitle: 'Admin console capabilities',
          adminItems: [
            'Absolute expiration via expiresAt',
            'Daily hour-based access windows via accessWindow',
            'Country / region restriction via geoRestriction',
            'Deleting an app also removes its token, devices, and logs',
          ],
          apiTitle: 'POST /api/verify',
          apiDesc: 'Unity clients call this endpoint to verify access. This endpoint does not require X-Admin-Key.',
          requestBody: 'Request body',
          successBody: 'Success response',
          failedBody: 'Failed response',
          fieldsTitle: 'Extended app fields',
          chainTitle: 'Verification chain',
          chainItems: [
            'Check whether token and fingerprint are present',
            'Validate the token and confirm it is not revoked',
            'Confirm the app exists, is active, and is not expired',
            'Check whether the current geo matches the allowed range',
            'Check whether the current time is within the access window',
            'Check whether the device is banned or above the device limit',
            'Return valid=true together with permissions on success',
          ],
          errorsIntro: 'These are the denial reasons that Unity may consume. Server-side reasons come from /api/verify, while network reasons are assigned by the client.',
          meaning: 'Meaning',
          action: 'Suggested action',
          errorRows: [
            ['missing_required_fields', 'Missing token or fingerprint', 'Send the required fields'],
            ['invalid_token', 'Token is invalid', 'Check the token in the admin console'],
            ['token_revoked', 'Token has been revoked', 'Generate a new token or restore it'],
            ['app_not_found', 'App was not found', 'Confirm the app still exists'],
            ['app_suspended', 'App is suspended', 'Resume the app in the admin console'],
            ['app_expired', 'App has expired', 'Extend the expiration and retry'],
            ['geo_restricted', 'Country or region is blocked', 'Adjust the geo restriction'],
            ['outside_access_hours', 'Outside the allowed hours', 'Retry within the access window'],
            ['device_banned', 'Device is banned', 'Unban the device in the console'],
            ['max_devices_reached', 'Device limit reached', 'Remove devices or raise the limit'],
            ['internal_error', 'Server-side internal error', 'Check server logs'],
            ['network_timeout', 'Client-side request timeout', 'Check network and timeout settings'],
            ['network_error', 'Client-side network error', 'Check the client network environment'],
          ],
        };

  return (
    <div className="max-w-[920px] animate-fade-in space-y-8">
      <h2 className="font-display text-2xl font-bold tracking-tight text-dark">{text.title}</h2>

      <div className="mb-6 flex w-fit gap-2 rounded-xl border border-neutral-100/60 bg-white/40 p-1.5 shadow-sm backdrop-blur-sm">
        {text.tabs.map((tab) => (
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

      {active === 'quickstart' && (
        <div className="space-y-5">
          <Section title={text.flowTitle}>
            <p>
              {text.flowText1}
              <Inline>POST /api/verify</Inline>
              {text.flowText2}
            </p>
            <p>
              {text.flowText3}
              <Inline>reason</Inline>
              {text.flowText4}
              <Inline>message</Inline>
              {text.flowText5}
              <Inline>detail</Inline>
              {text.flowText6}
            </p>
          </Section>

          <Section title={text.unityTitle}>
            <p>{text.unityDesc}</p>
            <CodeBlock code={unitySample} />
          </Section>

          <Section title={text.adminTitle}>
            <ul className="list-inside list-disc space-y-1.5 text-[13px] text-neutral-600">
              {text.adminItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Section>
        </div>
      )}

      {active === 'api' && (
        <div className="space-y-5">
          <Section title={text.apiTitle}>
            <p>{text.apiDesc}</p>
          </Section>

          <div className="card space-y-3 p-4">
            <p className="text-[12px] font-medium uppercase tracking-wider text-neutral-500">{text.requestBody}</p>
            <CodeBlock code={requestSample} />
          </div>

          <div className="card space-y-3 p-4">
            <p className="text-[12px] font-medium uppercase tracking-wider text-neutral-500">{text.successBody}</p>
            <CodeBlock code={successSample} />
          </div>

          <div className="card space-y-3 p-4">
            <p className="text-[12px] font-medium uppercase tracking-wider text-neutral-500">{text.failedBody}</p>
            <CodeBlock code={failedSample} />
          </div>

          <Section title={text.fieldsTitle}>
            <CodeBlock code={appFieldsSample} />
          </Section>

          <Section title={text.chainTitle}>
            <ol className="list-inside list-decimal space-y-2 text-[13px] text-neutral-600">
              {text.chainItems.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </Section>
        </div>
      )}

      {active === 'errors' && (
        <div className="space-y-4">
          <p className="text-[13px] text-neutral-500">{text.errorsIntro}</p>

          <div className="card overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-100/60 bg-white/20 text-[12px] font-semibold uppercase tracking-wider text-dark/50">
                  <th className="px-6 py-4">reason</th>
                  <th className="px-6 py-4">{text.meaning}</th>
                  <th className="px-6 py-4">{text.action}</th>
                </tr>
              </thead>
              <tbody>
                {text.errorRows.map(([reason, meaning, action]) => (
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
      )}
    </div>
  );
}
