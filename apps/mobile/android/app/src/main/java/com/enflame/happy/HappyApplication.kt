package com.enflame.happy

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class for Happy Android.
 *
 * Annotated with @HiltAndroidApp to enable Hilt dependency injection
 * throughout the application.
 */
@HiltAndroidApp
class HappyApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        // Application-level initialization
    }
}
