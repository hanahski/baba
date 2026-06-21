package app.studentsplug;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Receives FCM pushes. Payload shape (data message):
 *   { "title": "...", "body": "...", "url": "/messages/123" }
 * Tapping the notification deep-links into the WebView at the given path.
 */
public class MyFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onNewToken(String token) {
        // Cache the token; the WebView will pick it up via AndroidApp.getPushToken()
        getSharedPreferences("studentsplug", Context.MODE_PRIVATE)
                .edit()
                .putString("fcm_token", token)
                .apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        String title = "StudentsPlug";
        String body = "";
        String url = "/";

        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) title = message.getNotification().getTitle();
            if (message.getNotification().getBody() != null) body = message.getNotification().getBody();
        }
        if (message.getData() != null) {
            if (message.getData().get("title") != null) title = message.getData().get("title");
            if (message.getData().get("body") != null) body = message.getData().get("body");
            if (message.getData().get("url") != null) url = message.getData().get("url");
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("deeplink", url);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, StudentsPlugApp.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_brand_logo)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify((int) System.currentTimeMillis(), b.build());
    }
}