package com.enflame.happy

import android.app.Application
import com.enflame.happy.data.notifications.FcmTokenRegistrationManager
import com.enflame.happy.data.notifications.NotificationHelper
import com.enflame.happy.data.sync.SyncLifecycleManager
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

/**
 * Application class for Happy Android.
 *
 * Annotated with @HiltAndroidApp to enable Hilt dependency injection
 * throughout the application.
 *
 * Initializes:
 * - Notification channels on startup (required for Android 8+)
 * - FCM token registration with the Happy server (for push notifications)
 * - WebSocket lifecycle management for automatic background disconnect/reconnect
 */
@HiltAndroidApp
class HappyApplication : Application() {

    @Inject
    lateinit var notificationHelper: NotificationHelper

    @Inject
    lateinit var fcmTokenRegistrationManager: FcmTokenRegistrationManager

    @Inject
    lateinit var syncLifecycleManager: SyncLifecycleManager

    override fun onCreate() {
        super.onCreate()

        // Create notification channels (required for Android 8+).
        // Must be done before any notifications are posted.
        notificationHelper.createNotificationChannels()

        // Register FCM token with the server if the user has already paired.
        // If not yet paired, registration is deferred until pairing completes.
        fcmTokenRegistrationManager.registerIfNeeded()

        // Register the sync lifecycle manager with ProcessLifecycleOwner.
        // This automatically disconnects WebSocket when the app enters background
        // and reconnects when the app returns to foreground (HAP-1017).
        syncLifecycleManager.register()
    }
}
