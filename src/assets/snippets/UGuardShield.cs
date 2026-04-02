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
/// UGuardShield
/// - Supports platform verification, timestamp verification, or both.
/// - Timestamp validation prefers network time and falls back to local protected storage.
/// - Writes all status to Debug logs and optionally mirrors it to a TMP text component.
/// - Provides three local protection modes: black screen, force quit, message then black screen.
/// </summary>
[DefaultExecutionOrder(-300)]
public sealed class UGuardShield : MonoBehaviour
{
    public enum ValidationStrategy
    {
        PlatformAndTimestamp = 0,
        PlatformOnly = 1,
        TimestampOnly = 2,
    }

    public enum ProtectionMode
    {
        BlackScreen = 0,
        ForceQuit = 1,
        MessageThenBlackScreen = 2,
    }

    [Header("Runtime")]
    [SerializeField] private bool autoVerifyOnStart = true;
    [SerializeField] private ValidationStrategy validationStrategy = ValidationStrategy.PlatformAndTimestamp;
    [SerializeField] private ProtectionMode protectionMode = ProtectionMode.MessageThenBlackScreen;

    [Header("UGuard Platform")]
    [SerializeField] private string serverUrl = "https://your-domain.com";
    [SerializeField] private string token = "sk_your_token_here";
    [SerializeField] private int requestTimeoutSeconds = 15;

    [Header("Timestamp")]
    [Tooltip("Use an ISO-8601 UTC timestamp, for example 2026-06-01T00:00:00Z")]
    [SerializeField] private string expireAtUtc = "2026-06-01T00:00:00Z";
    [Tooltip("Optional. When empty, the script uses serverUrl to read the HTTP Date header.")]
    [SerializeField] private string networkTimeUrl = "";
    [SerializeField] private int networkTimeTimeoutSeconds = 10;
    [SerializeField] private int rollbackToleranceMinutes = 5;

#if TMP_PRESENT
    [Header("Optional Output")]
    [SerializeField] private TMP_Text statusText;
#endif

    public bool IsBusy { get; private set; }
    public bool IsVerified { get; private set; }
    public string LastReason { get; private set; }
    public string LastMessage { get; private set; }

    private const string CacheFileName = ".uguard_time_cache";
    private const string FirstRunKey = "uguard_first_ticks";
    private const string LastRunKey = "uguard_last_ticks";
    private static readonly byte[] AesKey = Encoding.UTF8.GetBytes("tL8#mQ2$vR5nW9xZ!pK4jY7cA0fH3eB6");
    private static readonly byte[] AesIv = Encoding.UTF8.GetBytes("xN3$kF8mQ1wZ6rT0");

    private GameObject overlayRoot;
    private bool protectionTriggered;

    private void Start()
    {
        if (autoVerifyOnStart)
        {
            Verify();
        }
    }

    public void Verify()
    {
        if (IsBusy)
        {
            Report("Verification is already running.", false, true);
            return;
        }

        StartCoroutine(VerifyCoroutine());
    }

    private IEnumerator VerifyCoroutine()
    {
        IsBusy = true;
        IsVerified = false;
        LastReason = string.Empty;
        LastMessage = string.Empty;
        protectionTriggered = false;

        Report("UGuard verification started.");

        ValidationOutcome outcome = ValidationOutcome.Allow("verification_passed", "All enabled validation checks passed.");

        if (validationStrategy == ValidationStrategy.PlatformOnly || validationStrategy == ValidationStrategy.PlatformAndTimestamp)
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

        if (validationStrategy == ValidationStrategy.TimestampOnly || validationStrategy == ValidationStrategy.PlatformAndTimestamp)
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

        IsVerified = true;
        LastReason = outcome.Reason;
        LastMessage = outcome.Message;
        Report("Verification passed.", false, true);
        IsBusy = false;
    }

    private void HandleFailedVerification(ValidationOutcome outcome)
    {
        IsVerified = false;
        LastReason = outcome.Reason;
        LastMessage = outcome.Message;

        string combinedMessage = string.Format("[{0}] {1}", outcome.Reason, outcome.Message);
        Report("Verification denied: " + combinedMessage, true, true);
        ExecuteProtection(combinedMessage);
        IsBusy = false;
    }

    private IEnumerator PlatformVerifyCoroutine(Action<ValidationOutcome> callback)
    {
        string trimmedServerUrl = (serverUrl ?? string.Empty).Trim().TrimEnd('/');
        if (string.IsNullOrEmpty(trimmedServerUrl))
        {
            callback(ValidationOutcome.Deny("platform_config_invalid", "serverUrl is empty."));
            yield break;
        }

        if (string.IsNullOrEmpty(token))
        {
            callback(ValidationOutcome.Deny("platform_config_invalid", "token is empty."));
            yield break;
        }

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

            if (parsedResponse != null)
            {
                if (parsedResponse.valid)
                {
                    callback(ValidationOutcome.Allow("platform_valid", "UGuard platform verification passed."));
                }
                else
                {
                    string reason = string.IsNullOrEmpty(parsedResponse.reason) ? "platform_denied" : parsedResponse.reason;
                    string message = string.IsNullOrEmpty(parsedResponse.message) ? "UGuard denied this request." : parsedResponse.message;
                    callback(ValidationOutcome.Deny(reason, message));
                }

                yield break;
            }

            if (request.result == UnityWebRequest.Result.ConnectionError)
            {
                callback(ValidationOutcome.Deny("network_error", string.IsNullOrEmpty(request.error) ? "Platform verification failed because the network is unavailable." : request.error));
                yield break;
            }

            if (request.result == UnityWebRequest.Result.DataProcessingError)
            {
                callback(ValidationOutcome.Deny("platform_response_invalid", "UGuard returned an unreadable response."));
                yield break;
            }

            if (request.result == UnityWebRequest.Result.ProtocolError)
            {
                callback(ValidationOutcome.Deny("platform_protocol_error", string.IsNullOrEmpty(responseText) ? "UGuard returned an HTTP error." : responseText));
                yield break;
            }

            callback(ValidationOutcome.Deny("network_timeout", string.IsNullOrEmpty(request.error) ? "Platform verification timed out." : request.error));
        }
    }

    private IEnumerator TimestampVerifyCoroutine(Action<ValidationOutcome> callback)
    {
        DateTime expireUtc;
        if (!TryParseExpireAtUtc(out expireUtc))
        {
            callback(ValidationOutcome.Deny("timestamp_config_invalid", "expireAtUtc must be a valid UTC ISO-8601 timestamp."));
            yield break;
        }

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

        LocalTimeState state;
        LocalStateResult stateResult = LoadLocalTimeState(out state);

        if (stateResult == LocalStateResult.Tampered)
        {
            callback(ValidationOutcome.Deny("timestamp_storage_tampered", "Local timestamp evidence is missing or has been modified."));
            yield break;
        }

        if (stateResult == LocalStateResult.Corrupted)
        {
            callback(ValidationOutcome.Deny("timestamp_storage_invalid", "Local timestamp evidence could not be read."));
            yield break;
        }

        if (stateResult == LocalStateResult.FirstRun)
        {
            state = new LocalTimeState();
            state.firstUtcTicks = trustedUtc.Ticks;
            state.lastUtcTicks = trustedUtc.Ticks;
            PersistLocalTimeState(state);
            Report("Timestamp validation initialized local evidence.", false, true);
        }
        else
        {
            DateTime previousUtc = new DateTime(state.lastUtcTicks, DateTimeKind.Utc);
            if (trustedUtc < previousUtc.AddMinutes(-Mathf.Max(0, rollbackToleranceMinutes)))
            {
                callback(ValidationOutcome.Deny("timestamp_rollback_detected", "The current time is earlier than the last recorded trusted time."));
                yield break;
            }
        }

        if (trustedUtc >= expireUtc)
        {
            callback(ValidationOutcome.Deny("timestamp_expired", "The protected timestamp has expired."));
            yield break;
        }

        state.lastUtcTicks = trustedUtc.Ticks;
        PersistLocalTimeState(state);

        string timeSource = networkTimeUsed ? "network" : "local";
        if (!networkTimeUsed && !string.IsNullOrEmpty(networkTimeError))
        {
            Report("Network time unavailable, fell back to local UTC. " + networkTimeError, false, true);
        }

        callback(ValidationOutcome.Allow("timestamp_valid", "Timestamp validation passed via " + timeSource + " time."));
    }

    private IEnumerator FetchTrustedUtcCoroutine(Action<DateTime> onSuccess, Action<string> onFailure)
    {
        string url = ResolveNetworkTimeUrl();
        if (string.IsNullOrEmpty(url))
        {
            onFailure("networkTimeUrl and serverUrl are both empty.");
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

            string dateHeader = request.GetResponseHeader("Date");
            if (string.IsNullOrEmpty(dateHeader))
            {
                dateHeader = request.GetResponseHeader("date");
            }

            DateTime networkUtc;
            if (!TryParseHttpDate(dateHeader, out networkUtc))
            {
                onFailure("HTTP Date header is missing or invalid.");
                yield break;
            }

            onSuccess(networkUtc);
        }
    }

    private string ResolveNetworkTimeUrl()
    {
        string configured = (networkTimeUrl ?? string.Empty).Trim();
        if (!string.IsNullOrEmpty(configured))
        {
            return configured;
        }

        string trimmedServerUrl = (serverUrl ?? string.Empty).Trim();
        return trimmedServerUrl;
    }

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
        return DateTime.TryParse(
            raw,
            CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal,
            out utc
        );
    }

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

    private void CreateBlackOverlay(string message)
    {
        if (overlayRoot != null)
        {
            return;
        }

        overlayRoot = new GameObject("__uguard_overlay");
        DontDestroyOnLoad(overlayRoot);

        Canvas canvas = overlayRoot.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 32767;
        overlayRoot.AddComponent<CanvasScaler>();
        overlayRoot.AddComponent<GraphicRaycaster>();

        GameObject panel = new GameObject("Panel");
        panel.transform.SetParent(overlayRoot.transform, false);

        Image panelImage = panel.AddComponent<Image>();
        panelImage.color = Color.black;
        panelImage.raycastTarget = true;

        RectTransform panelRect = panel.GetComponent<RectTransform>();
        panelRect.anchorMin = Vector2.zero;
        panelRect.anchorMax = Vector2.one;
        panelRect.offsetMin = Vector2.zero;
        panelRect.offsetMax = Vector2.zero;

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
            textComponent.font = Resources.GetBuiltinResource<Font>("Arial.ttf");

            RectTransform textRect = textObject.GetComponent<RectTransform>();
            textRect.anchorMin = new Vector2(0.1f, 0.3f);
            textRect.anchorMax = new Vector2(0.9f, 0.7f);
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
        }

        AudioListener.volume = 0f;
    }

    private void ForceQuit()
    {
        Report("UGuard protection mode requested force quit.", true, true);

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

    private string GenerateFingerprint()
    {
        return string.Join("|",
            SystemInfo.deviceUniqueIdentifier,
            SystemInfo.deviceName,
            SystemInfo.processorType,
            SystemInfo.graphicsDeviceName
        );
    }

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

    private string GetCacheFilePath()
    {
        return Path.Combine(Application.persistentDataPath, CacheFileName);
    }

    private LocalStateResult LoadLocalTimeState(out LocalTimeState state)
    {
        state = new LocalTimeState();

        bool fileExists = File.Exists(GetCacheFilePath());
        bool prefsExist = PlayerPrefs.HasKey(FirstRunKey) && PlayerPrefs.HasKey(LastRunKey);

        if (!fileExists && !prefsExist)
        {
            return LocalStateResult.FirstRun;
        }

        if (fileExists != prefsExist)
        {
            return LocalStateResult.Tampered;
        }

        LocalTimeState fileState;
        if (!TryReadFileState(out fileState))
        {
            return LocalStateResult.Corrupted;
        }

        long prefsFirst;
        long prefsLast;
        if (!long.TryParse(PlayerPrefs.GetString(FirstRunKey, string.Empty), out prefsFirst) ||
            !long.TryParse(PlayerPrefs.GetString(LastRunKey, string.Empty), out prefsLast))
        {
            return LocalStateResult.Corrupted;
        }

        if (fileState.firstUtcTicks != prefsFirst || fileState.lastUtcTicks != prefsLast)
        {
            return LocalStateResult.Tampered;
        }

        state = fileState;
        return LocalStateResult.Loaded;
    }

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

    [Serializable]
    private sealed class VerifyResponse
    {
        public bool valid;
        public string reason;
        public string message;
    }

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

    private enum LocalStateResult
    {
        FirstRun = 0,
        Loaded = 1,
        Tampered = 2,
        Corrupted = 3,
    }

    private struct LocalTimeState
    {
        public long firstUtcTicks;
        public long lastUtcTicks;
    }
}
