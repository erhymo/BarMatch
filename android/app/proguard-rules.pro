# where2watch ProGuard rules

# Keep Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }

# Keep our JavaScript interface
-keepclassmembers class no.where2watch.app.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView JavaScript interface annotations
-keepattributes JavascriptInterface

