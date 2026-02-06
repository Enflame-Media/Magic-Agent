package com.enflame.happy

import android.app.Application
import com.enflame.happy.data.notifications.NotificationHelper
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

/**
 * Application class for Happy Android.
 *
 * Annotated with @HiltAndroidApp to enable Hilt dependency injection
 * throughout the application.
 *
 * Initializes notification channels on startup to ensure they are
 * registered before any FCM messages arrive.
 */
@HiltAndroidApp
class HappyApplication : Application() {

    @Inject
    lateinit var notificationHelper: NotificationHelper

    override fun onCreate() {
        super.onCreate()

        // Create notification channels (required for Android 8+).
        // Must be done before any notifications are posted.
        notificationHelper.createNotificationChannels()
    }
}
