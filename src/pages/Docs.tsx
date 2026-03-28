import { useState } from 'react';

const tabs = [
  { id: 'quickstart', label: '快速开始' },
  { id: 'api', label: 'API 参考' },
  { id: 'errors', label: '错误码' },
] as const;

type TabId = (typeof tabs)[number]['id'];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-[#1e2536] text-[#e2e8f0] rounded-lg p-4 text-[13px] leading-relaxed overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-[11px] text-white/40 rounded hover:text-white/80 hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[14px] font-display font-semibold text-neutral-800">{title}</h3>
      <div className="text-[13px] text-neutral-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Inline({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded text-[12px] font-mono">{children}</code>;
}

export function Docs() {
  const [active, setActive] = useState<TabId>('quickstart');

  return (
    <div className="space-y-6 animate-fade-in max-w-[800px]">
      <h2 className="text-base font-display font-semibold text-neutral-800">接入文档</h2>

      <div className="flex gap-1 p-1 bg-white rounded-lg shadow-card w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-md transition-all ${
              active === t.id ? 'bg-primary-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label}
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
          Unity 客户端在启动时将 <Inline>token</Inline> 和设备指纹发送到{' '}
          <Inline>POST /api/verify</Inline>，服务端依次校验 Token → 应用状态 →
          过期时间 → 设备封禁 → 设备上限，最终返回验证结果。
        </p>
        <p>
          整个过程无需 SDK，仅使用 Unity 内置的 <Inline>UnityWebRequest</Inline>。
        </p>
      </Section>

      <Section title="第一步：获取 Token">
        <p>
          在管理后台「应用管理」中创建应用，系统生成 <Inline>sk_</Inline>{' '}
          前缀的 Token（64 位十六进制）。将此 Token 硬编码到 Unity 项目中。
        </p>
        <p className="text-[12px] text-neutral-400">建议配合 IL2CPP + 代码混淆保护 Token 安全。</p>
      </Section>

      <Section title="第二步：创建鉴权脚本">
        <p>
          在 Unity 项目中创建 <Inline>UGuardAuth.cs</Inline>，完整代码如下：
        </p>
        <CodeBlock
          code={`using UnityEngine;
using UnityEngine.Networking;
using System;
using System.Collections;
using System.Text;

/// <summary>
/// UGuard 鉴权模块
/// 在游戏启动时调用 Verify()，通过 IsVerified 判断授权状态。
/// </summary>
public class UGuardAuth : MonoBehaviour
{
    #region 配置

    [Header("服务器地址")]
    [Tooltip("UGuard 服务地址，不带尾部斜杠")]
    public string serverUrl = "https://your-domain.com";

    [Header("应用 Token")]
    [Tooltip("在管理后台创建应用后获取的 sk_xxx Token")]
    public string token = "sk_your_token_here";

    #endregion

    #region 公开状态

    /// <summary> 上一次验证是否通过 </summary>
    public bool IsVerified { get; private set; }

    /// <summary> 验证失败的 reason（见文档错误码章节） </summary>
    public string LastReason { get; private set; }

    /// <summary> 是否正在请求中 </summary>
    public bool IsBusy { get; private set; }

    /// <summary> 应用被授予的权限（验证成功时有值） </summary>
    public string[] Permissions { get; private set; } = new string[0];

    #endregion

    private string _cachedFingerprint;

    /// <summary>
    /// 调用此方法发起一次验证。可在 Start 或合适时机调用。
    /// </summary>
    public void Verify()
    {
        if (IsBusy) return;
        StartCoroutine(VerifyCoroutine());
    }

    private IEnumerator VerifyCoroutine()
    {
        IsBusy = true;
        IsVerified = false;
        LastReason = null;

        // --- 采集设备指纹 ---
        // 服务端会对指纹做 SHA-256 后作为 KV Key，客户端传原始字符串即可。
        string fp = GenerateFingerprint();
        _cachedFingerprint = fp;

        // --- 构建请求体 ---
        // 字段与后端 verify.js 解构一一对应：
        //   const { token, fingerprint, os, unityVersion, deviceModel, timezone } = body;
        string json = JsonUtility.ToJson(new VerifyRequest
        {
            token = this.token,
            fingerprint = fp,
            os = SystemInfo.operatingSystem,
            unityVersion = Application.unityVersion,
            deviceModel = SystemInfo.deviceModel,
            timezone = TimeZoneInfo.Local.Id,
        });

        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);
        string url = $"{serverUrl}/api/verify";

        using var req = new UnityWebRequest(url, "POST");
        req.uploadHandler = new UploadHandlerRaw(bodyRaw);
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");
        req.timeout = 15;

        yield return req.SendWebRequest();

        // --- 处理响应 ---
        // 后端响应格式: { "valid": bool, "reason"?: string, "permissions"?: {...} }
        if (req.result == UnityWebRequest.Result.Success)
        {
            var res = JsonUtility.FromJson<VerifyResponse>(req.downloadHandler.text);
            IsVerified = res.valid;

            if (res.valid)
            {
                Permissions = res.permissions != null
                    ? res.permissions.features ?? new string[0]
                    : new string[0];
                Debug.Log("[UGuard] 验证通过");
            }
            else
            {
                LastReason = string.IsNullOrEmpty(res.reason) ? "unknown" : res.reason;
                Debug.LogWarning($"[UGuard] 验证失败: {LastReason}");
            }
        }
        else
        {
            LastReason = "network_error";
            Debug.LogError($"[UGuard] 请求失败: {req.error} (HTTP {req.responseCode})");
        }

        IsBusy = false;
    }

    /// <summary>
    /// 生成设备指纹（四项硬件标识组合，跨平台稳定性最优）。
    /// 组合: deviceUniqueIdentifier + deviceName + processorType + graphicsDeviceName
    /// 服务端会对此值做 SHA-256，客户端发原始拼接字符串即可。
    /// </summary>
    private string GenerateFingerprint()
    {
        string uid = SystemInfo.deviceUniqueIdentifier;
        string name = SystemInfo.deviceName;
        string cpu = SystemInfo.processorType;
        string gpu = SystemInfo.graphicsDeviceName;

        return string.Join("|", uid, name, cpu, gpu);
    }

    #region 请求/响应结构体

    // 字段名必须与后端 verify.js 解构的变量名完全一致

    [Serializable]
    private class VerifyRequest
    {
        public string token;         // 必填 - 应用 Token
        public string fingerprint;   // 必填 - 设备指纹
        public string os;            // 可选 - SystemInfo.operatingSystem
        public string unityVersion;  // 可选 - Application.unityVersion
        public string deviceModel;   // 可选 - SystemInfo.deviceModel
        public string timezone;      // 可选 - TimeZoneInfo.Local.Id
    }

    [Serializable]
    private class VerifyResponse
    {
        public bool valid;
        public string reason;
        public PermissionsData permissions;
    }

    [Serializable]
    private class PermissionsData
    {
        public string[] features;
    }

    #endregion
}`}
        />
      </Section>

      <Section title="第三步：挂载并使用">
        <p>
          将 <Inline>UGuardAuth</Inline> 挂载到一个不销毁的 GameObject 上（或在首个场景的根对象上），在游戏启动时调用验证：
        </p>
        <CodeBlock
          code={`// 方式一：在 UGuardAuth 所在对象的 Start 中自动调用
void Start()
{
    Verify();
}

// 方式二：由外部控制器控制验证时机
// 适合需要先展示启动画面/加载资源的场景
public class GameBootstrap : MonoBehaviour
{
    public UGuardAuth auth;

    IEnumerator Start()
    {
        auth.Verify();

        // 等待验证完成
        while (auth.IsBusy)
            yield return null;

        if (!auth.IsVerified)
        {
            switch (auth.LastReason)
            {
                case "app_expired":
                    ShowMessage("授权已过期，请联系管理员续期");
                    break;
                case "app_suspended":
                    ShowMessage("应用已被暂停");
                    break;
                case "device_banned":
                    ShowMessage("此设备已被封禁");
                    break;
                case "max_devices_reached":
                    ShowMessage("设备数量已达上限");
                    break;
                case "invalid_token":
                case "token_revoked":
                    ShowMessage("授权无效");
                    break;
                default:
                    ShowMessage($"验证失败: {auth.LastReason}");
                    break;
            }
            // Application.Quit();
            yield break;
        }

        // 验证通过，加载主场景
        Debug.Log("授权验证通过，加载主场景");
        UnityEngine.SceneManagement.SceneManager.LoadScene("MainScene");
    }

    void ShowMessage(string msg) => Debug.LogWarning(msg);
}`}
        />
      </Section>

      <Section title="建议">
        <ul className="list-disc list-inside text-[13px] text-neutral-600 space-y-1.5">
          <li>游戏启动时验证一次，将结果缓存到本地，避免每次场景切换都请求</li>
          <li>设置合理的超时（建议 10-15 秒），避免网络异常导致无限卡住</li>
          <li>配合 IL2CPP + 代码混淆保护 Token 不被逆向</li>
          <li>
            在 Editor 中测试时可使用 <Inline>http://localhost:8088</Inline> 作为本地服务器地址
          </li>
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
          Unity 客户端调用此接口完成鉴权。<strong>不需要</strong> Admin Key。
        </p>
        <p className="text-[12px] text-neutral-400">
          请求头必须设置 <Inline>Content-Type: application/json</Inline>。
        </p>
      </Section>

      <div className="card p-4 space-y-3">
        <p className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">请求体 (JSON)</p>
        <CodeBlock
          code={`{
  "token":          "sk_a1b2c3...",  // string  必填  应用 Token
  "fingerprint":    "设备指纹",       // string  必填  设备唯一标识（原始字符串）
  "os":             "Windows 11",    // string  可选  操作系统
  "unityVersion":   "2022.3.10f1",   // string  可选  Unity 版本
  "deviceModel":    "DESKTOP_XXX",   // string  可选  设备型号
  "timezone":       "China Standard Time"  // string  可选  时区（TimeZoneInfo.Local.Id）
}`}
        />
        <p className="text-[12px] text-neutral-400">
          <Inline>token</Inline> 对应管理后台创建应用时生成的 <Inline>sk_xxx</Inline>。
          <Inline>fingerprint</Inline> 客户端发原始字符串，服务端会做 SHA-256 后存入 KV。
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">成功响应 (200)</p>
        <CodeBlock
          code={`{
  "valid": true,
  "permissions": {
    "features": ["full"]
  }
}`}
        />
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">失败响应 (200)</p>
        <CodeBlock
          code={`{
  "valid": false,
  "reason": "app_expired"
}`}
        />
        <p className="text-[12px] text-neutral-400">
          HTTP 状态码始终为 200（除非请求格式错误返回 400 或服务端异常返回 500）。
          业务层面的失败通过 <Inline>valid: false</Inline> + <Inline>reason</Inline> 判断。
        </p>
      </div>

      <Section title="服务端验证链路（按顺序）">
        <div className="card p-4">
          <ol className="text-[13px] text-neutral-600 space-y-2 list-decimal list-inside">
            <li>
              检查 <Inline>token</Inline> 和 <Inline>fingerprint</Inline> 是否存在 → 缺失返回{' '}
              <Inline>400</Inline>
            </li>
            <li>
              对 <Inline>token</Inline> 做 SHA-256 → 查找 <Inline>token_</Inline> 索引 → 不存在则返回{' '}
              <Inline>invalid_token</Inline>
            </li>
            <li>
              检查 Token 索引的 <Inline>status</Inline> → 非 active 则返回{' '}
              <Inline>token_revoked</Inline>
            </li>
            <li>
              查找应用数据 → 不存在则返回 <Inline>app_not_found</Inline>
            </li>
            <li>
              检查应用 <Inline>status</Inline> → 非 active 则返回 <Inline>app_suspended</Inline>
            </li>
            <li>
              检查 <Inline>expiresAt</Inline> → 已过期则返回 <Inline>app_expired</Inline>
            </li>
            <li>
              对 <Inline>fingerprint</Inline> 做 SHA-256 → 查找设备记录 → 已封禁则返回{' '}
              <Inline>device_banned</Inline>
            </li>
            <li>
              新设备检查 <Inline>maxDevices</Inline> 上限（0 表示无限制）→ 超限则返回{' '}
              <Inline>max_devices_reached</Inline>
            </li>
            <li>
              全部通过 → 返回 <Inline>{"{ valid: true, permissions: ... }"}</Inline>
            </li>
          </ol>
        </div>
      </Section>

      <Section title="补充说明">
        <ul className="list-disc list-inside text-[13px] text-neutral-600 space-y-1.5">
          <li>
            <Inline>maxDevices</Inline> 设为 <Inline>0</Inline> 表示不限制设备数量（后端仅在{' '}
            <Inline>maxDevices &gt; 0</Inline> 时检查上限）
          </li>
          <li>
            生产环境成功日志仅 <Inline>10%</Inline> 采样记录，失败日志 100% 记录（本地开发环境全部记录）
          </li>
          <li>
            设备指纹在服务端做 SHA-256 哈希后作为 KV Key 存储，客户端发送原始字符串即可
          </li>
        </ul>
      </Section>
    </div>
  );
}

function Errors() {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-neutral-500">
        以下为 <Inline>POST /api/verify</Inline> 返回的 <Inline>reason</Inline>{' '}
        字段，与后端 verify.js 中的实际返回值一一对应：
      </p>
      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-neutral-100 text-[11px] text-neutral-400 uppercase tracking-wider">
              <th className="text-left font-medium px-5 py-2.5">reason</th>
              <th className="text-left font-medium px-5 py-2.5">触发条件</th>
              <th className="text-left font-medium px-5 py-2.5">客户端建议</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['invalid_token', 'Token 哈希在 KV 中无对应索引', '检查 Token 是否拼写正确'],
                ['token_revoked', 'Token 索引 status !== "active"', '管理员已吊销，需重新获取'],
                ['app_not_found', 'Token 索引指向的应用不存在', '应用已被删除，联系管理员'],
                ['app_suspended', '应用 status === "suspended"', '管理员已暂停，联系管理员恢复'],
                ['app_expired', '应用 expiresAt < 当前时间', '授权已过期，联系管理员续期'],
                ['device_banned', '设备记录 banned === true', '该设备被封禁，联系管理员解封'],
                ['max_devices_reached', '新设备数 >= maxDevices 且 maxDevices > 0', '设备数达上限，清理或提升额度'],
                ['internal_error', '服务端异常（try-catch 兜底）', '稍后重试，或联系管理员查看日志'],
              ] as const
            ).map(([code, cond, action]) => (
              <tr
                key={code}
                className="border-b border-neutral-50/80 last:border-0 hover:bg-primary-50/20 transition-colors"
              >
                <td className="px-5 py-3 font-mono text-[12px] text-primary-700 whitespace-nowrap">{code}</td>
                <td className="px-5 py-3 text-neutral-600">{cond}</td>
                <td className="px-5 py-3 text-neutral-400">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
