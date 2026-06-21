# Keep the JS bridge so reflection from WebView still works after R8.
-keepclassmembers class app.studentsplug.WebAppBridge {
   @android.webkit.JavascriptInterface <methods>;
}
-keep class app.studentsplug.** { *; }