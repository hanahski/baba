package app.studentsplug;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/**
 * Exposed to the web app as `window.AndroidApp`. The SPA can feature-detect:
 *
 *   if (window.AndroidApp) { ... native is available ... }
 */
public class WebAppBridge {

    private final MainActivity activity;
    private final WebView webView;

    public WebAppBridge(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public String platform() { return "android"; }

    @JavascriptInterface
    public String appVersion() { return "2.0.0"; }

    @JavascriptInterface
    public boolean isOnline() { return activity.isOnline(); }

    @JavascriptInterface
    public String getPushToken() {
        String t = activity.getPushToken();
        return t == null ? "" : t;
    }

    @JavascriptInterface
    public void vibrate(int ms) { activity.vibrate(Math.max(1, ms)); }

    @JavascriptInterface
    public void copy(String text) { activity.copyToClipboard(text == null ? "" : text); }

    @JavascriptInterface
    public void share(String text, String title) { activity.shareText(text, title); }

    @JavascriptInterface
    public void openExternal(String url) { activity.openExternal(url); }

    @JavascriptInterface
    public void googleSignIn() { activity.startGoogleSignIn(); }

    @JavascriptInterface
    public void googleSignOut() { activity.googleSignOut(); }
}
