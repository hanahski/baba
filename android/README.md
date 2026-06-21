# StudentsPlug Android Wrapper

Native Android shell around the StudentsPlug web app.

## What's inside

- `MainActivity.java` — WebView host with:
  - Branded splash/loading overlay (matches the website's `BrandLoader`:
    spinning halo, pulsing logo, bouncing letters)
  - Offline cache (Service Worker friendly + WebView cache + custom fallback)
  - File / image / camera upload bridge (`WebChromeClient.onShowFileChooser`)
  - Download manager bridge (`setDownloadListener` → `DownloadManager`)
  - JS ↔ native bridge (`window.AndroidApp`) for: share, vibrate, notifications,
    open in external browser, register push token, copy to clipboard
  - Pull-to-refresh + back-button history navigation
  - Push notifications via Firebase Cloud Messaging (`MyFirebaseMessagingService`)
  - Online/offline detector — never crashes when offline, keeps cached UI
- `BrandLoaderView.java` — custom view that renders the same loading animation
  as the website (conic halo + pulsing logo + letter bounce).

## Configure

1. Set the live site URL in `MainActivity.SITE_URL` (defaults to the published
   Lovable URL).
2. Drop your `google-services.json` (from Firebase) into `android/app/`.
3. Build: `./gradlew assembleRelease`.

The icon + splash logo is `res/drawable/ic_brand_logo.png` (auto-synced from
`src/assets/brand-logo.png`).