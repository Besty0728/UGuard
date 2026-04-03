using System;
using System.Collections;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
#if TMP_PRESENT
using TMPro;
#endif

/// <summary>
/// UGuard 客户端防护脚本 / UGuard client-side protection script.
///
/// 功能概述 / Feature overview:
///   - 平台验证：调用 UGuard 后端 /api/verify 接口校验 Token、设备、地理和时段限制
///     Platform verify: calls UGuard backend /api/verify to check token, device, geo & time window.
///   - 时间戳验证：优先使用网络时间，回退到本地双存储（文件 + PlayerPrefs）防篡改证据
///     Timestamp verify: prefers network time, falls back to dual-storage (file + PlayerPrefs) tamper evidence.
///   - 三种防护模式：黑屏 / 强制退出 / 先显示原因再黑屏
///     Three protection modes: black screen / force quit / message then black screen.
///   - 可选 TMP_Text 输出：在 Unity 工程中定义 TMP_PRESENT 脚本符号即可启用
///     Optional TMP_Text output: define TMP_PRESENT scripting symbol in your Unity project to enable.
///
/// 使用方式 / Usage:
///   1. 将此脚本挂载到场景中任意 GameObject 上
///      Attach this script to any GameObject in your scene.
///   2. 在 Inspector 中填写 serverUrl 和 token
///      Fill in serverUrl and token in the Inspector.
///   3. 根据需要选择验证策略和防护模式
///      Choose your validation strategy and protection mode as needed.
///
/// 安全提示 / Security notice:
///   - 请务必修改 AesKey 和 AesIv 为你自己的随机值！
///     You MUST change AesKey and AesIv to your own random values!
///   - 这些密钥用于加密本地时间戳缓存，硬编码默认值不安全。
///     These keys encrypt the local timestamp cache; the hardcoded defaults are NOT secure.
/// </summary>
[DefaultExecutionOrder(-300)]
public sealed class UGuardShield : MonoBehaviour
{
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 枚举定义 / Enum definitions
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /// <summary>
    /// 验证策略 / Validation strategy.
    /// PlatformAndTimestamp: 同时校验平台和时间戳 / Both platform and timestamp.
    /// PlatformOnly: 仅校验平台 / Platform only.
    /// TimestampOnly: 仅校验时间戳（离线可用）/ Timestamp only (works offline).
    /// </summary>
    public enum ValidationStrategy
    {
        PlatformAndTimestamp = 0,
        PlatformOnly = 1,
        TimestampOnly = 2,
    }

    /// <summary>
    /// 防护模式 / Protection mode.
    /// BlackScreen: 直接黑屏并静音 / Black overlay with audio muted.
    /// ForceQuit: 强制退出应用 / Force quit the application.
    /// MessageThenBlackScreen: 先显示拒绝原因，再黑屏 / Show denial reason, then black screen.
    /// </summary>
    public enum ProtectionMode
    {
        BlackScreen = 0,
        ForceQuit = 1,
        MessageThenBlackScreen = 2,
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Inspector 配置字段 / Inspector fields
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    [Header("Runtime / 运行时")]
    [Tooltip("启动时自动验证 / Auto verify on Start")]
    [SerializeField] private bool autoVerifyOnStart = true;

    [Tooltip("验证策略 / Validation strategy")]
    [SerializeField] private ValidationStrategy validationStrategy = ValidationStrategy.PlatformAndTimestamp;

    [Tooltip("防护模式 / Protection mode")]
    [SerializeField] private ProtectionMode protectionMode = ProtectionMode.MessageThenBlackScreen;

    [Header("UGuard Platform / 平台配置")]
    [Tooltip("UGuard 后端地址 / UGuard backend URL")]
    [SerializeField] private string serverUrl = "https://your-domain.com";

    [Tooltip("应用 Token（sk_ 开头）/ App token (starts with sk_)")]
    [SerializeField] private string token = "sk_your_token_here";

    [Tooltip("请求超时秒数 / Request timeout in seconds")]
    [SerializeField] private int requestTimeoutSeconds = 15;

    [Header("Timestamp / 时间戳配置")]
    [Tooltip("过期时间，ISO-8601 UTC 格式，例如 2026-06-01T00:00:00Z / Expiry in UTC ISO-8601")]
    [SerializeField] private string expireAtUtc = "2026-06-01T00:00:00Z";

    [Tooltip("网络时间源 URL（留空则使用 serverUrl）/ Network time URL (empty = use serverUrl)")]
    [SerializeField] private string networkTimeUrl = "";

    [Tooltip("网络时间请求超时秒数 / Network time request timeout in seconds")]
    [SerializeField] private int networkTimeTimeoutSeconds = 10;

    [Tooltip("允许的时间回拨容差分钟数 / Allowed clock rollback tolerance in minutes")]
    [SerializeField] private int rollbackToleranceMinutes = 5;

#if TMP_PRESENT
    [Header("Optional Output / 可选输出")]
    [Tooltip("状态文本组件（需定义 TMP_PRESENT）/ Status text (requires TMP_PRESENT)")]
    [SerializeField] private TMP_Text statusText;
#endif

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 公开属性 / Public properties
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /// <summary>是否正在验证 / Whether verification is in progress.</summary>
    public bool IsBusy { get; private set; }

    /// <summary>验证是否通过 / Whether verification passed.</summary>
    public bool IsVerified { get; private set; }

    /// <summary>最近一次拒绝原因代码 / Last denial reason code.</summary>
    public string LastReason { get; private set; }

    /// <summary>最近一次拒绝消息 / Last denial message.</summary>
    public string LastMessage { get; private set; }

    /// <summary>
    /// 平台返回的权限列表（验证通过后可用）/ Permissions from platform (available after successful verify).
    /// 对应后端 appData.permissions 字段 / Maps to backend appData.permissions field.
    /// </summary>
    public string[] Permissions { get; private set; }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 本地时间戳存储常量 / Local timestamp storage constants
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // 加密缓存文件名 / Encrypted cache filename
    private const string CacheFileName = ".uguard_time_cache";

    // PlayerPrefs 键名 / PlayerPrefs key names
    private const string FirstRunKey = "uguard_first_ticks";
    private const string LastRunKey = "uguard_last_ticks";

    // !!!! 安全警告 / SECURITY WARNING !!!!
    // 你必须将以下密钥替换为自己的随机 32 字节 Key 和 16 字节 IV！
    // You MUST replace these with your own random 32-byte Key and 16-byte IV!
    // 可使用任意密码生成器生成 / Use any password generator to create them.
    private static readonly byte[] AesKey = Encoding.UTF8.GetBytes("tL8#mQ2$vR5nW9xZ!pK4jY7cA0fH3eB6");
    private static readonly byte[] AesIv = Encoding.UTF8.GetBytes("xN3$kF8mQ1wZ6rT0");

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 私有状态 / Private state
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private GameObject overlayRoot;
    private bool protectionTriggered;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 生命周期 / Lifecycle
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private void Start()
    {
        if (autoVerifyOnStart)
        {
            Verify();
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 公开方法 / Public methods
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /// <summary>
    /// 触发验证流程。可在外部手动调用（例如重试按钮）。
    /// Trigger the verification flow. Can be called externally (e.g. retry button).
    /// </summary>
    public void Verify()
    {
        if (IsBusy)
        {
            Report("Verification is already running. / 验证正在进行中。", false, true);
            return;
        }

        StartCoroutine(VerifyCoroutine());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 验证主流程 / Main verification flow
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private IEnumerator VerifyCoroutine()
    {
        IsBusy = true;
        IsVerified = false;
        LastReason = string.Empty;
        LastMessage = string.Empty;
        Permissions = null;
        protectionTriggered = false;

        Report("UGuard verification started. / UGuard 验证已启动。");

        // 默认通过结果，后续各阶段可能覆盖
        // Default pass result; subsequent stages may override.
        ValidationOutcome outcome = ValidationOutcome.Allow("verification_passed", "All checks passed.");

        // 阶段一：平台验证 / Stage 1: Platform verification
        if (validationStrategy == ValidationStrategy.PlatformOnly ||
            validationStrategy == ValidationStrategy.PlatformAndTimestamp)
        {
            ValidationOutcome platformOutcome = null;
            yield return StartCoroutine(PlatformVerifyCoroutine((result) => platformOutcome = result));
            outcome = platformOutcome;

            if (!outcome.Allowed)
            {
                HandleFailedVerification(outcome);
                yield break;
            }
        }

        // 阶段二：时间戳验证 / Stage 2: Timestamp verification
        if (validationStrategy == ValidationStrategy.TimestampOnly ||
            validationStrategy == ValidationStrategy.PlatformAndTimestamp)
        {
            ValidationOutcome timestampOutcome = null;
            yield return StartCoroutine(TimestampVerifyCoroutine((result) => timestampOutcome = result));
            outcome = timestampOutcome;

            if (!outcome.Allowed)
            {
                HandleFailedVerification(outcome);
                yield break;
            }
        }

        // 全部通过 / All checks passed
        IsVerified = true;
        LastReason = outcome.Reason;
        LastMessage = outcome.Message;
        Report("Verification passed. / 验证通过。", false, true);
        IsBusy = false;
    }

    /// <summary>
    /// 处理验证失败：记录状态并触发防护 / Handle failed verification: record state and trigger protection.
    /// </summary>
    private void HandleFailedVerification(ValidationOutcome outcome)
    {
        IsVerified = false;
        LastReason = outcome.Reason;
        LastMessage = outcome.Message;

        string combinedMessage = string.Format("[{0}] {1}", outcome.Reason, outcome.Message);
        Report("Verification denied / 验证被拒绝: " + combinedMessage, true, true);
        ExecuteProtection(combinedMessage);
        IsBusy = false;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 平台验证 / Platform verification
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /// <summary>
    /// 调用 UGuard 后端 POST /api/verify 接口
    /// Calls UGuard backend POST /api/verify endpoint.
    ///
    /// 请求体 / Request body: { token, fingerprint, os, unityVersion, deviceModel, timezone }
    /// 成功响应 / Success response: { valid: true, permissions: [...] }
    /// 失败响应 / Denial response: { valid: false, reason, message, detail }
    /// </summary>
    private IEnumerator PlatformVerifyCoroutine(Action<ValidationOutcome> callback)
    {
        // 校验配置 / Validate configuration
        string trimmedServerUrl = (serverUrl ?? string.Empty).Trim().TrimEnd('/');
        if (string.IsNullOrEmpty(trimmedServerUrl))
        {
            callback(ValidationOutcome.Deny("platform_config_invalid", "serverUrl is empty. / serverUrl 为空。"));
            yield break;
        }

        if (string.IsNullOrEmpty(token))
        {
            callback(ValidationOutcome.Deny("platform_config_invalid", "token is empty. / token 为空。"));
            yield break;
        }

        // 构建请求体 / Build request body
        VerifyRequest requestBody = new VerifyRequest();
        requestBody.token = token;
        requestBody.fingerprint = GenerateFingerprint();
        requestBody.os = SystemInfo.operatingSystem;
        requestBody.unityVersion = Application.unityVersion;
        requestBody.deviceModel = SystemInfo.deviceModel;
        requestBody.timezone = TimeZoneInfo.Local.Id;

        byte[] body = Encoding.UTF8.GetBytes(JsonUtility.ToJson(requestBody));

        using (UnityWebRequest request = new UnityWebRequest(trimmedServerUrl + "/api/verify", UnityWebRequest.kHttpVerbPOST))
        {
            request.uploadHandler = new UploadHandlerRaw(body);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.timeout = Mathf.Max(3, requestTimeoutSeconds);
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            string responseText = request.downloadHandler != null ? request.downloadHandler.text : string.Empty;
            VerifyResponse parsedResponse = TryParseVerifyResponse(responseText);

            // 优先使用解析结果 / Prefer parsed response if available
            if (parsedResponse != null)
            {
                if (parsedResponse.valid)
                {
                    // 保存权限列表 / Store permissions
                    Permissions = parsedResponse.permissions;
                    callback(ValidationOutcome.Allow("platform_valid", "UGuard platform verification passed. / 平台验证通过。"));
                }
                else
                {
                    string reason = string.IsNullOrEmpty(parsedResponse.reason) ? "platform_denied" : parsedResponse.reason;
                    string message = string.IsNullOrEmpty(parsedResponse.message) ? "Denied." : parsedResponse.message;
                    callback(ValidationOutcome.Deny(reason, message));
                }

                yield break;
            }

            // 无法解析响应时，根据错误类型分类处理
            // When response is unparseable, classify by error type.
            if (request.result == UnityWebRequest.Result.ConnectionError)
            {
                callback(ValidationOutcome.Deny("network_error",
                    string.IsNullOrEmpty(request.error)
                        ? "Network unavailable. / 网络不可用。"
                        : request.error));
                yield break;
            }

            if (request.result == UnityWebRequest.Result.DataProcessingError)
            {
                callback(ValidationOutcome.Deny("platform_response_invalid",
                    "Unreadable response. / 响应数据无法解析。"));
                yield break;
            }

            if (request.result == UnityWebRequest.Result.ProtocolError)
            {
                callback(ValidationOutcome.Deny("platform_protocol_error",
                    string.IsNullOrEmpty(responseText)
                        ? "HTTP error. / HTTP 错误。"
                        : responseText));
                yield break;
            }

            // 兜底超时 / Fallback: timeout
            callback(ValidationOutcome.Deny("network_timeout",
                string.IsNullOrEmpty(request.error)
                    ? "Request timed out. / 请求超时。"
                    : request.error));
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 时间戳验证 / Timestamp verification
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /// <summary>
    /// 时间戳验证流程 / Timestamp verification flow.
    /// 1. 尝试获取网络时间 / Try to fetch network time.
    /// 2. 读取本地双存储证据（文件 + PlayerPrefs）/ Load dual-storage evidence.
    /// 3. 检测时间回拨 / Detect clock rollback.
    /// 4. 判断是否过期 / Check expiry.
    /// </summary>
    private IEnumerator TimestampVerifyCoroutine(Action<ValidationOutcome> callback)
    {
        // 解析过期时间 / Parse expiry timestamp
        DateTime expireUtc;
        if (!TryParseExpireAtUtc(out expireUtc))
        {
            callback(ValidationOutcome.Deny("timestamp_config_invalid",
                "expireAtUtc is not a valid UTC ISO-8601 timestamp. / expireAtUtc 不是有效的 UTC ISO-8601 时间戳。"));
            yield break;
        }

        // 获取可信 UTC 时间（优先网络）/ Obtain trusted UTC (prefer network)
        DateTime trustedUtc = DateTime.UtcNow;
        bool networkTimeUsed = false;
        string networkTimeError = null;

        yield return StartCoroutine(FetchTrustedUtcCoroutine(
            (networkUtc) =>
            {
                trustedUtc = networkUtc;
                networkTimeUsed = true;
            },
            (error) => networkTimeError = error
        ));

        // 读取本地时间证据 / Load local time evidence
        LocalTimeState state;
        LocalStateResult stateResult = LoadLocalTimeState(out state);

        // 篡改检测：文件与 PlayerPrefs 不一致
        // Tamper detection: file and PlayerPrefs mismatch.
        if (stateResult == LocalStateResult.Tampered)
        {
            callback(ValidationOutcome.Deny("timestamp_storage_tampered",
                "Local timestamp evidence tampered. / 本地时间戳证据已被篡改。"));
            yield break;
        }

        // 数据损坏 / Data corrupted
        if (stateResult == LocalStateResult.Corrupted)
        {
            callback(ValidationOutcome.Deny("timestamp_storage_invalid",
                "Local timestamp evidence unreadable. / 本地时间戳证据无法读取。"));
            yield break;
        }

        // 首次运行：初始化本地证据 / First run: initialize local evidence
        if (stateResult == LocalStateResult.FirstRun)
        {
            state = new LocalTimeState();
            state.firstUtcTicks = trustedUtc.Ticks;
            state.lastUtcTicks = trustedUtc.Ticks;
            PersistLocalTimeState(state);
            Report("Timestamp evidence initialized. / 时间戳证据已初始化。", false, true);
        }
        else
        {
            // 时间回拨检测 / Clock rollback detection
            DateTime previousUtc = new DateTime(state.lastUtcTicks, DateTimeKind.Utc);
            if (trustedUtc < previousUtc.AddMinutes(-Mathf.Max(0, rollbackToleranceMinutes)))
            {
                callback(ValidationOutcome.Deny("timestamp_rollback_detected",
                    "Clock rollback detected. / 检测到时间回拨。"));
                yield break;
            }
        }

        // 过期检查 / Expiry check
        if (trustedUtc >= expireUtc)
        {
            callback(ValidationOutcome.Deny("timestamp_expired",
                "Timestamp has expired. / 时间戳已过期。"));
            yield break;
        }

        // 更新本地证据 / Update local evidence
        state.lastUtcTicks = trustedUtc.Ticks;
        PersistLocalTimeState(state);

        string timeSource = networkTimeUsed ? "network" : "local";
        if (!networkTimeUsed && !string.IsNullOrEmpty(networkTimeError))
        {
            Report("Network time unavailable, using local UTC. / 网络时间不可用，使用本地 UTC。 " + networkTimeError, false, true);
        }

        callback(ValidationOutcome.Allow("timestamp_valid",
            "Timestamp valid via " + timeSource + ". / 时间戳验证通过（" + timeSource + "）。"));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 网络时间 / Network time
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /// <summary>
    /// 通过 HTTP HEAD 请求获取服务器 Date 头作为可信 UTC 时间
    /// Fetches trusted UTC from server Date header via HTTP HEAD request.
    /// </summary>
    private IEnumerator FetchTrustedUtcCoroutine(Action<DateTime> onSuccess, Action<string> onFailure)
    {
        string url = ResolveNetworkTimeUrl();
        if (string.IsNullOrEmpty(url))
        {
            onFailure("networkTimeUrl and serverUrl are both empty. / networkTimeUrl 和 serverUrl 均为空。");
            yield break;
        }

        using (UnityWebRequest request = UnityWebRequest.Head(url))
        {
            request.timeout = Mathf.Max(2, networkTimeTimeoutSeconds);
            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                onFailure(string.IsNullOrEmpty(request.error) ? "Unable to fetch network time." : request.error);
                yield break;
            }

            // 读取 HTTP Date 头 / Read HTTP Date header
            string dateHeader = request.GetResponseHeader("Date");
            if (string.IsNullOrEmpty(dateHeader))
            {
                dateHeader = request.GetResponseHeader("date");
            }

            DateTime networkUtc;
            if (!TryParseHttpDate(dateHeader, out networkUtc))
            {
                onFailure("HTTP Date header missing or invalid. / HTTP Date 头缺失或无效。");
                yield break;
            }

            onSuccess(networkUtc);
        }
    }

    /// <summary>
    /// 网络时间 URL 优先级：networkTimeUrl > serverUrl
    /// Network time URL priority: networkTimeUrl > serverUrl.
    /// </summary>
    private string ResolveNetworkTimeUrl()
    {
        string configured = (networkTimeUrl ?? string.Empty).Trim();
        if (!string.IsNullOrEmpty(configured))
        {
            return configured;
        }

        return (serverUrl ?? string.Empty).Trim();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 时间解析 / Time parsing
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private bool TryParseExpireAtUtc(out DateTime expireUtc)
    {
        return DateTime.TryParse(
            expireAtUtc,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal,
            out expireUtc
        );
    }

    private bool TryParseHttpDate(string raw, out DateTime utc)
    {
        utc = DateTime.MinValue;
        if (string.IsNullOrEmpty(raw))
        {
            return false;
        }

        return DateTime.TryParse(
            raw,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal,
            out utc
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 防护执行 / Protection execution
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private void ExecuteProtection(string reason)
    {
        if (protectionTriggered)
        {
            return;
        }

        protectionTriggered = true;

        switch (protectionMode)
        {
            case ProtectionMode.BlackScreen:
                CreateBlackOverlay(null);
                break;
            case ProtectionMode.ForceQuit:
                ForceQuit();
                break;
            case ProtectionMode.MessageThenBlackScreen:
                CreateBlackOverlay(reason);
                break;
        }
    }

    /// <summary>
    /// 创建全屏黑色遮罩，可选显示拒绝原因文本，并静音所有音频。
    /// Creates a fullscreen black overlay, optionally showing denial reason, and mutes all audio.
    /// </summary>
    private void CreateBlackOverlay(string message)
    {
        if (overlayRoot != null)
        {
            return;
        }

        // 创建不可销毁的 Canvas / Create a DontDestroyOnLoad Canvas
        overlayRoot = new GameObject("__uguard_overlay");
        DontDestroyOnLoad(overlayRoot);

        Canvas canvas = overlayRoot.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 32767; // 最高层级 / Highest sorting order
        overlayRoot.AddComponent<CanvasScaler>();
        overlayRoot.AddComponent<GraphicRaycaster>();

        // 全屏黑色面板 / Fullscreen black panel
        GameObject panel = new GameObject("Panel");
        panel.transform.SetParent(overlayRoot.transform, false);

        Image panelImage = panel.AddComponent<Image>();
        panelImage.color = Color.black;
        panelImage.raycastTarget = true; // 拦截所有点击 / Block all input

        RectTransform panelRect = panel.GetComponent<RectTransform>();
        panelRect.anchorMin = Vector2.zero;
        panelRect.anchorMax = Vector2.one;
        panelRect.offsetMin = Vector2.zero;
        panelRect.offsetMax = Vector2.zero;

        // 可选：显示拒绝原因 / Optional: show denial reason
        if (!string.IsNullOrEmpty(message))
        {
            GameObject textObject = new GameObject("Reason");
            textObject.transform.SetParent(panel.transform, false);

            Text textComponent = textObject.AddComponent<Text>();
            textComponent.text = message;
            textComponent.alignment = TextAnchor.MiddleCenter;
            textComponent.color = Color.white;
            textComponent.fontSize = 26;
            textComponent.horizontalOverflow = HorizontalWrapMode.Wrap;
            textComponent.verticalOverflow = VerticalWrapMode.Overflow;
            textComponent.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

            RectTransform textRect = textObject.GetComponent<RectTransform>();
            textRect.anchorMin = new Vector2(0.1f, 0.3f);
            textRect.anchorMax = new Vector2(0.9f, 0.7f);
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
        }

        // 静音 / Mute audio
        AudioListener.volume = 0f;
    }

    /// <summary>
    /// 强制退出应用。Android 上调用 Activity.finish()，编辑器中停止播放。
    /// Force quit. Calls Activity.finish() on Android, stops play mode in Editor.
    /// </summary>
    private void ForceQuit()
    {
        Report("Protection: force quit. / 防护触发：强制退出。", true, true);

#if UNITY_ANDROID && !UNITY_EDITOR
        try
        {
            using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            {
                AndroidJavaObject activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
                if (activity != null)
                {
                    activity.Call("finish");
                }
            }
        }
        catch (Exception exception)
        {
            Debug.LogWarning("[UGuardShield] Android finish failed: " + exception.Message);
        }
#endif

#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
#else
        Application.Quit();
#endif
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 日志输出 / Logging
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private void Report(string message, bool warning = false, bool mirrorToUi = false)
    {
        if (warning)
        {
            Debug.LogWarning("[UGuardShield] " + message);
        }
        else
        {
            Debug.Log("[UGuardShield] " + message);
        }

        if (!mirrorToUi)
        {
            return;
        }

#if TMP_PRESENT
        if (statusText != null)
        {
            statusText.text = message;
        }
#endif
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 设备指纹 / Device fingerprint
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /// <summary>
    /// 生成设备指纹字符串。后端会对此值进行 SHA-256 哈希后存储。
    /// Generates a device fingerprint string. The backend SHA-256 hashes this value before storing.
    ///
    /// 使用 SHA-256 二次哈希拼接，避免分隔符歧义。
    /// Uses SHA-256 hash of concatenated parts to avoid delimiter ambiguity.
    /// </summary>
    private string GenerateFingerprint()
    {
        string raw = string.Concat(
            SystemInfo.deviceUniqueIdentifier,
            SystemInfo.deviceName,
            SystemInfo.processorType,
            SystemInfo.graphicsDeviceName
        );

        using (SHA256 sha256 = SHA256.Create())
        {
            byte[] hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(raw));
            StringBuilder sb = new StringBuilder(64);
            for (int i = 0; i < hash.Length; i++)
            {
                sb.Append(hash[i].ToString("x2"));
            }
            return sb.ToString();
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // JSON 解析 / JSON parsing
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private VerifyResponse TryParseVerifyResponse(string raw)
    {
        if (string.IsNullOrEmpty(raw))
        {
            return null;
        }

        try
        {
            return JsonUtility.FromJson<VerifyResponse>(raw);
        }
        catch
        {
            return null;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 本地时间戳双存储 / Local timestamp dual-storage
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private string GetCacheFilePath()
    {
        return Path.Combine(Application.persistentDataPath, CacheFileName);
    }

    /// <summary>
    /// 加载本地时间状态。使用双存储（加密文件 + PlayerPrefs）进行交叉验证。
    /// Loads local time state. Uses dual storage (encrypted file + PlayerPrefs) for cross-validation.
    ///
    /// 返回值 / Returns:
    ///   FirstRun — 两边均无数据 / Both storages empty.
    ///   Loaded   — 两边数据一致 / Both storages consistent.
    ///   Tampered — 仅一边存在，或两边数据不一致 / One-sided or inconsistent data.
    ///   Corrupted — 数据存在但无法解析 / Data present but unreadable.
    /// </summary>
    private LocalStateResult LoadLocalTimeState(out LocalTimeState state)
    {
        state = new LocalTimeState();

        bool fileExists = File.Exists(GetCacheFilePath());
        bool prefsExist = PlayerPrefs.HasKey(FirstRunKey) && PlayerPrefs.HasKey(LastRunKey);

        // 两边都没有 → 首次运行 / Both empty → first run
        if (!fileExists && !prefsExist)
        {
            return LocalStateResult.FirstRun;
        }

        // 只有一边存在 → 被篡改 / Only one side exists → tampered
        if (fileExists != prefsExist)
        {
            return LocalStateResult.Tampered;
        }

        // 读取加密文件 / Read encrypted file
        LocalTimeState fileState;
        if (!TryReadFileState(out fileState))
        {
            return LocalStateResult.Corrupted;
        }

        // 读取 PlayerPrefs / Read PlayerPrefs
        long prefsFirst;
        long prefsLast;
        if (!long.TryParse(PlayerPrefs.GetString(FirstRunKey, string.Empty), out prefsFirst) ||
            !long.TryParse(PlayerPrefs.GetString(LastRunKey, string.Empty), out prefsLast))
        {
            return LocalStateResult.Corrupted;
        }

        // 交叉验证 / Cross-validate
        if (fileState.firstUtcTicks != prefsFirst || fileState.lastUtcTicks != prefsLast)
        {
            return LocalStateResult.Tampered;
        }

        state = fileState;
        return LocalStateResult.Loaded;
    }

    /// <summary>
    /// 同时写入加密文件和 PlayerPrefs / Write to both encrypted file and PlayerPrefs.
    /// </summary>
    private void PersistLocalTimeState(LocalTimeState state)
    {
        string plain = state.firstUtcTicks.ToString(CultureInfo.InvariantCulture) + "|" +
                       state.lastUtcTicks.ToString(CultureInfo.InvariantCulture);

        byte[] encrypted = Encrypt(Encoding.UTF8.GetBytes(plain));
        File.WriteAllBytes(GetCacheFilePath(), encrypted);

        PlayerPrefs.SetString(FirstRunKey, state.firstUtcTicks.ToString(CultureInfo.InvariantCulture));
        PlayerPrefs.SetString(LastRunKey, state.lastUtcTicks.ToString(CultureInfo.InvariantCulture));
        PlayerPrefs.Save();
    }

    private bool TryReadFileState(out LocalTimeState state)
    {
        state = new LocalTimeState();

        try
        {
            byte[] encrypted = File.ReadAllBytes(GetCacheFilePath());
            byte[] plainBytes = Decrypt(encrypted);
            string plain = Encoding.UTF8.GetString(plainBytes);
            string[] parts = plain.Split('|');

            if (parts.Length != 2)
            {
                return false;
            }

            long firstTicks;
            long lastTicks;
            if (!long.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out firstTicks) ||
                !long.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out lastTicks))
            {
                return false;
            }

            state.firstUtcTicks = firstTicks;
            state.lastUtcTicks = lastTicks;
            return true;
        }
        catch
        {
            return false;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // AES 加解密 / AES encryption
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private byte[] Encrypt(byte[] data)
    {
        using (Aes aes = Aes.Create())
        {
            aes.Key = AesKey;
            aes.IV = AesIv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using (ICryptoTransform encryptor = aes.CreateEncryptor())
            {
                return encryptor.TransformFinalBlock(data, 0, data.Length);
            }
        }
    }

    private byte[] Decrypt(byte[] data)
    {
        using (Aes aes = Aes.Create())
        {
            aes.Key = AesKey;
            aes.IV = AesIv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            using (ICryptoTransform decryptor = aes.CreateDecryptor())
            {
                return decryptor.TransformFinalBlock(data, 0, data.Length);
            }
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 数据模型 / Data models
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /// <summary>
    /// /api/verify 请求体 / Request body for /api/verify.
    /// </summary>
    [Serializable]
    private sealed class VerifyRequest
    {
        public string token;
        public string fingerprint;
        public string os;
        public string unityVersion;
        public string deviceModel;
        public string timezone;
    }

    /// <summary>
    /// /api/verify 响应体 / Response body from /api/verify.
    /// 成功时 valid=true，permissions 包含权限列表。
    /// On success valid=true, permissions contains the permission list.
    /// 失败时 valid=false，reason 和 message 描述拒绝原因。
    /// On failure valid=false, reason and message describe the denial.
    /// </summary>
    [Serializable]
    private sealed class VerifyResponse
    {
        public bool valid;
        public string reason;
        public string message;
        public string[] permissions;
    }

    /// <summary>
    /// 验证结果内部封装 / Internal verification result wrapper.
    /// </summary>
    private sealed class ValidationOutcome
    {
        public bool Allowed { get; private set; }
        public string Reason { get; private set; }
        public string Message { get; private set; }

        public static ValidationOutcome Allow(string reason, string message)
        {
            ValidationOutcome outcome = new ValidationOutcome();
            outcome.Allowed = true;
            outcome.Reason = reason;
            outcome.Message = message;
            return outcome;
        }

        public static ValidationOutcome Deny(string reason, string message)
        {
            ValidationOutcome outcome = new ValidationOutcome();
            outcome.Allowed = false;
            outcome.Reason = reason;
            outcome.Message = message;
            return outcome;
        }
    }

    /// <summary>
    /// 本地时间状态加载结果 / Local time state load result.
    /// </summary>
    private enum LocalStateResult
    {
        FirstRun = 0,  // 首次运行 / First run
        Loaded = 1,    // 正常加载 / Loaded successfully
        Tampered = 2,  // 被篡改 / Tampered
        Corrupted = 3, // 数据损坏 / Data corrupted
    }

    /// <summary>
    /// 本地时间戳证据 / Local timestamp evidence.
    /// </summary>
    private struct LocalTimeState
    {
        public long firstUtcTicks; // 首次运行时间 / First run time (UTC ticks)
        public long lastUtcTicks;  // 最后运行时间 / Last run time (UTC ticks)
    }
}
