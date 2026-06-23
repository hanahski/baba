package app.studentsplug;

import android.Manifest;
import android.animation.ObjectAnimator;
import android.app.DownloadManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

/**
 * MainActivity — native shell around the StudentsPlug web app.
 *
 * Responsibilities:
 *  - Host the WebView pointed at SITE_URL.
 *  - Show the branded loading overlay (BrandLoaderView) until first paint.
 *  - Bridge JS ↔ native via window.AndroidApp (see WebAppBridge).
 *  - Handle file/image/camera uploads (onShowFileChooser).
 *  - Handle downloads via the system DownloadManager.
 *  - Detect offline and never crash — keep showing cached UI + banner.
 *  - Handle FCM push deep-links from notifications.
 *  - Back-button navigates WebView history.
 */
public class MainActivity extends AppCompatActivity {

    /** Production site URL — change here if the domain moves. */
    public static final String SITE_URL =
            "https://id-preview--f7f3628f-c144-4220-afce-d13bde6a6250.lovable.app";

    private static final int RC_GOOGLE_SIGN_IN = 9001;

    private WebView webView;
    private SwipeRefreshLayout swipe;
    private View loader;
    private View offlineBanner;

    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> filePicker;
    private ActivityResultLauncher<String> notifPermission;
    private GoogleSignInClient googleSignInClient;

    private ConnectivityManager.NetworkCallback networkCallback;
    private volatile boolean online = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Switch from splash theme to normal theme so the WebView background is correct.
        setTheme(R.style.Theme_StudentsPlug);
        setContentView(R.layout.activity_main);

        webView        = findViewById(R.id.webView);
        swipe          = findViewById(R.id.swipeRefresh);
        loader         = findViewById(R.id.brandLoader);
        offlineBanner  = findViewById(R.id.offlineBanner);

        registerLaunchers();
        configureWebView();
        registerConnectivityCallback();
        requestNotificationPermissionIfNeeded();

        swipe.setOnRefreshListener(() -> webView.reload());
        swipe.setColorSchemeColors(
                ContextCompat.getColor(this, R.color.brand_primary),
                ContextCompat.getColor(this, R.color.brand_accent)
        );

        // Initial load — honour any deep-link extra from a push notification.
        loadInitial(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String deeplink = intent.getStringExtra("deeplink");
        if (deeplink != null && webView != null) {
            webView.loadUrl(absolute(deeplink));
        }
    }

    private void loadInitial(Intent intent) {
        String deeplink = intent != null ? intent.getStringExtra("deeplink") : null;
        String url = (deeplink != null) ? absolute(deeplink) : SITE_URL;
        webView.loadUrl(url);
    }

    private String absolute(String pathOrUrl) {
        if (pathOrUrl.startsWith("http")) return pathOrUrl;
        return SITE_URL + (pathOrUrl.startsWith("/") ? pathOrUrl : "/" + pathOrUrl);
    }

    // ===========================================================================================
    // WebView setup
    // ===========================================================================================
    @SuppressWarnings({"SetJavaScriptEnabled"})
    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);
        s.setLoadsImagesAutomatically(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " StudentsPlugApp/2.0");
        s.setJavaScriptCanOpenWindowsAutomatically(true);

        // Match the app's dark brand on Android 10+.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(s, true);
        }

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // JS bridge: window.AndroidApp.*
        webView.addJavascriptInterface(new WebAppBridge(this, webView), "AndroidApp");

        webView.setDownloadListener((url, ua, contentDisposition, mime, length) -> {
            try {
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mime);
                req.addRequestHeader("User-Agent", ua);
                req.allowScanningByMediaScanner();
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                String filename = android.webkit.URLUtil.guessFileName(url, contentDisposition, mime);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                if (dm != null) dm.enqueue(req);
                Toast.makeText(this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "Download failed", Toast.LENGTH_SHORT).show();
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                String host = uri.getHost();
                // Keep StudentsPlug + lovable preview hosts inside the WebView.
                if (host != null && (host.contains("studentsplug") || host.contains("lovable.app")
                        || host.contains("supabase.co"))) {
                    return false;
                }
                // Open mailto / tel / external links in the system handler.
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, uri);
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                } catch (Exception ignored) {}
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                hideLoader();
                swipe.setRefreshing(false);
                injectOfflineHelper();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req,
                                        android.webkit.WebResourceError err) {
                // Don't crash when offline — show the cached page + a soft banner.
                if (req.isForMainFrame()) {
                    setOnline(false);
                    hideLoader();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                filePathCallback = cb;
                Intent intent = params.createIntent();
                // Allow multiple if the input element asks for it.
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                        params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try {
                    filePicker.launch(intent);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // Auto-grant camera/mic to the site (already gated by Android perms).
                request.grant(request.getResources());
            }
        });
    }

    // ===========================================================================================
    // File picker bridge
    // ===========================================================================================
    private void registerLaunchers() {
        filePicker = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (filePathCallback == null) return;
                    Uri[] uris = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        Intent data = result.getData();
                        if (data.getClipData() != null) {
                            int n = data.getClipData().getItemCount();
                            uris = new Uri[n];
                            for (int i = 0; i < n; i++) uris[i] = data.getClipData().getItemAt(i).getUri();
                        } else if (data.getData() != null) {
                            uris = new Uri[] { data.getData() };
                        }
                    }
                    filePathCallback.onReceiveValue(uris);
                    filePathCallback = null;
                }
        );

        notifPermission = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> { /* no-op */ }
        );
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }

    // ===========================================================================================
    // Google Sign-In
    // ===========================================================================================
    void startGoogleSignIn() {
        if (googleSignInClient == null) {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                    .requestIdToken(getString(R.string.default_web_client_id))
                    .requestEmail()
                    .build();
            googleSignInClient = GoogleSignIn.getClient(this, gso);
        }
        Intent signInIntent = googleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
    }

    void googleSignOut() {
        if (googleSignInClient == null) {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                    .requestIdToken(getString(R.string.default_web_client_id))
                    .requestEmail()
                    .build();
            googleSignInClient = GoogleSignIn.getClient(this, gso);
        }
        googleSignInClient.signOut().addOnCompleteListener(this, task -> {
            // Silently clear cached credential so next sign-in re-prompts.
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == RC_GOOGLE_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                String idToken = account != null ? account.getIdToken() : null;
                if (idToken != null && !idToken.isEmpty()) {
                    callJs("window.StudentsPlugApp.onGoogleIdToken && window.StudentsPlugApp.onGoogleIdToken('" + escapeJsString(idToken) + "')");
                } else {
                    callJs("window.StudentsPlugApp.onGoogleSignInError && window.StudentsPlugApp.onGoogleSignInError('No ID token returned')");
                }
            } catch (ApiException e) {
                String msg = e.getStatusCode() == 12501 ? "Sign-in cancelled" : "Google sign-in error: " + e.getStatusCode();
                callJs("window.StudentsPlugApp.onGoogleSignInError && window.StudentsPlugApp.onGoogleSignInError('" + escapeJsString(msg) + "')");
            }
        }
    }

    private void callJs(String script) {
        if (webView != null) {
            runOnUiThread(() -> webView.evaluateJavascript(script, null));
        }
    }

    private String escapeJsString(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
    }

    // ===========================================================================================
    // Offline detection
    // ===========================================================================================
    private void registerConnectivityCallback() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return;
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network network) {
                runOnUiThread(() -> {
                    setOnline(true);
                    if (webView != null) webView.evaluateJavascript(
                            "window.dispatchEvent(new Event('online'));", null);
                });
            }
            @Override public void onLost(Network network) {
                runOnUiThread(() -> {
                    setOnline(false);
                    if (webView != null) webView.evaluateJavascript(
                            "window.dispatchEvent(new Event('offline'));", null);
                });
            }
        };
        cm.registerNetworkCallback(
                new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build(),
                networkCallback
        );
    }

    private void setOnline(boolean isOnline) {
        online = isOnline;
        offlineBanner.setVisibility(isOnline ? View.GONE : View.VISIBLE);
        // When coming back online after an error page, reload to recover.
        if (isOnline && webView != null && webView.getUrl() != null
                && webView.getUrl().startsWith("data:")) {
            webView.loadUrl(SITE_URL);
        }
    }

    /** Bridge offline events into the SPA so it can switch to cached UI. */
    private void injectOfflineHelper() {
        webView.evaluateJavascript(
                "(function(){window.__STUDENTSPLUG_NATIVE__=true;" +
                        "try{window.dispatchEvent(new CustomEvent('native-ready'," +
                        "{detail:{platform:'android'}}));}catch(e){}})();",
                null
        );
    }

    // ===========================================================================================
    // Splash overlay
    // ===========================================================================================
    private void hideLoader() {
        if (loader == null || loader.getVisibility() == View.GONE) return;
        ObjectAnimator fade = ObjectAnimator.ofFloat(loader, View.ALPHA, 1f, 0f);
        fade.setDuration(280);
        fade.start();
        loader.postDelayed(() -> loader.setVisibility(View.GONE), 280);
    }

    // ===========================================================================================
    // Lifecycle
    // ===========================================================================================
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (networkCallback != null) {
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) cm.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {}
        }
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    // ===========================================================================================
    // Helpers used by WebAppBridge
    // ===========================================================================================
    void vibrate(long ms) {
        Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (v == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
        } else {
            v.vibrate(ms);
        }
    }

    void copyToClipboard(String text) {
        ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("StudentsPlug", text));
    }

    void shareText(String text, String title) {
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, text);
        if (title != null) i.putExtra(Intent.EXTRA_SUBJECT, title);
        startActivity(Intent.createChooser(i, title != null ? title : "Share"));
    }

    void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (Exception ignored) {}
    }

    String getPushToken() {
        SharedPreferences sp = getSharedPreferences("studentsplug", Context.MODE_PRIVATE);
        return sp.getString("fcm_token", null);
    }

    boolean isOnline() { return online; }
}
