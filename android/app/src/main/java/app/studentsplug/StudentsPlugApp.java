package app.studentsplug;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

public class StudentsPlugApp extends Application {
    public static final String CHANNEL_ID = "studentsplug_default";

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.notif_channel_default),
                    NotificationManager.IMPORTANCE_HIGH
            );
            ch.setDescription(getString(R.string.notif_channel_default_desc));
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }
}