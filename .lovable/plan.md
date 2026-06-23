# Native Google Sign-In for the StudentsPlug Android wrapper

Goal: when the user taps "Continue with Google" inside the Android app, the **native** Google account picker opens (not the web OAuth popup). After the user picks an account, the resulting Google ID token is handed to the website, which signs the user into Supabase. Outside the app (regular browser), nothing changes.

---

## How the handshake works

```text
[WebView] tap Google button
   │  isInApp() === true  →  call AndroidApp.googleSignIn()
   ▼
[Android] Credential Manager / GoogleSignIn shows native picker
   │  user picks account → Google returns an ID token (JWT)
   ▼
[Android] webView.evaluateJavascript(
            "window.StudentsPlugApp.onGoogleIdToken('<idToken>')")
   ▼
[WebView] supabase.auth.signInWithIdToken({ provider:'google', token })
   │  Supabase verifies the token with Google, creates a session
   ▼
[WebView] navigate to redirect target → user is signed in
```

The web Google web-OAuth popup is **never opened** in the app. Outside the app the existing `lovable.auth.signInWithOAuth("google", …)` flow keeps working.

---

## Web-side changes

### 1. `src/lib/app-bridge.ts`
Extend the bridge contract:

- Add to `AndroidBridge`:
  - `googleSignIn?: () => void` — fire-and-forget; result arrives via `onGoogleIdToken`.
  - `googleSignOut?: () => void` — clears the native cached account.
- Add to `window.StudentsPlugApp`:
  - `onGoogleIdToken(token: string)` — invoked by Java after a successful pick.
  - `onGoogleSignInError(message: string)` — invoked on cancel/error.
- New helpers:
  - `requestNativeGoogleSignIn(): Promise<string>` — resolves with the ID token, rejects on error/cancel. Internally calls `AndroidApp.googleSignIn()` and waits for the next `onGoogleIdToken` / `onGoogleSignInError` event (with a timeout).
  - `supportsNativeGoogle()` — true only when `isInApp() && typeof window.AndroidApp?.googleSignIn === "function"`.

### 2. `src/routes/login.tsx`
Rewrite the `google` handler:

- If `supportsNativeGoogle()`:
  1. `const idToken = await requestNativeGoogleSignIn();`
  2. `await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });`
  3. On success, navigate to `redirect`.
  4. On error, `toast.error(...)`.
- Else: keep current `lovable.auth.signInWithOAuth("google", …)` path.

Also hide the "blocked inside the preview frame" amber notice when `isInApp()` is true (it's irrelevant there), and keep the Google button visible (the app uses it — it just routes natively).

No other auth code, no new server functions, no Supabase migration. `signInWithIdToken` is already enabled for Google in Lovable Cloud's managed auth.

---

## Android-side changes (you paste this into Sketchware)

These edits are to the files you uploaded (`MainActivity (18) (3).java`, `activity_main (4).xml`). I'll hand you the patched Java file ready to paste — XML stays the same.

### `MainActivity.java`
1. **Add Credential Manager (Google ID) wiring.** Use `androidx.credentials.CredentialManager` + `com.google.android.libraries.identity.googleid.GetGoogleIdOption` (modern, replaces deprecated GoogleSignIn). Required Gradle deps (Sketchware "local libraries"):
   - `androidx.credentials:credentials:1.3.0`
   - `androidx.credentials:credentials-play-services-auth:1.3.0`
   - `com.google.android.libraries.identity.googleid:googleid:1.1.1`
2. **Constant** `WEB_CLIENT_ID` — the **Web** OAuth client ID from Google Cloud (the same one Supabase Auth → Google uses as "Client ID"). Required so the returned ID token's `aud` matches what Supabase expects. *You'll need to give me this value, or paste it into the file yourself.*
3. **New `@JavascriptInterface` methods on the `AndroidApp` bridge:**
   - `googleSignIn()` — launches `CredentialManager.getCredential(...)` with the Google ID option (`setFilterByAuthorizedAccounts(false)`, `setAutoSelectEnabled(false)`, `setServerClientId(WEB_CLIENT_ID)`, fresh nonce per request). On success, calls `webView.evaluateJavascript("window.StudentsPlugApp.onGoogleIdToken('…')", null)`. On `GetCredentialException`/cancel, calls `window.StudentsPlugApp.onGoogleSignInError('…')`.
   - `googleSignOut()` — `CredentialManager.clearCredentialState(...)` so the next sign-in re-prompts the picker.
4. Properly escape the token for the JS string literal (it's a JWT — safe charset, but still wrap in `JSON.stringify` via a small helper to be safe).
5. Bump the UA tag to `StudentsPlugApp/2.1` so the web side can require `>= 2.1` before assuming native Google is available (forward-compatible).

### `activity_main.xml`
No change required.

### Google Cloud Console (one-time, done by you)
- In the existing OAuth consent screen, add an **Android** OAuth client:
  - Package name: `com.studentsplug.app`
  - SHA-1: the signing cert SHA-1 of the APK Sketchware produces (debug + release). You can get it with `keytool -list -v -keystore <your.keystore>`.
- Keep the existing **Web** OAuth client (used by Supabase) — its client ID is what we hard-code into `MainActivity` as `WEB_CLIENT_ID`.
- No redirect URI changes needed; native flow doesn't use one.

---

## What you'll see after this lands

- **In a normal browser:** Google button → web popup (unchanged).
- **In the app:** Google button → native Android account chooser → app continues signed in. No web popup ever appears. No "open in new tab" notice.
- The website itself still exposes Google sign-in on the public site for desktop/mobile-browser users — only the *in-app* path is rerouted.

---

## What I need from you before I can build

1. The **Web OAuth Client ID** that Supabase Google provider is configured with (looks like `xxxxxxxx.apps.googleusercontent.com`). I'll inline it into `MainActivity.java` as `WEB_CLIENT_ID`.
2. Confirmation you can add those three `androidx.credentials` / `googleid` libraries in Sketchware (they're required — no Credential Manager, no native picker).
3. Confirmation you've registered the Android OAuth client in Google Cloud with the app's package name + SHA-1 (otherwise Google will reject the request with `developer error`).

Once I have #1 (and you've done #2/#3), I'll:
- Update `src/lib/app-bridge.ts` and `src/routes/login.tsx`.
- Hand you the full patched `MainActivity.java` ready to paste into Sketchware.
