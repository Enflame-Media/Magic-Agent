package com.enflame.happy.di

import com.enflame.happy.data.api.HappyApiService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.notifications.FcmTokenRegistrationManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import javax.inject.Qualifier
import javax.inject.Singleton

/**
 * Qualifier annotation for the FCM registration-scoped [CoroutineScope].
 *
 * Used to provide a dedicated scope for [FcmTokenRegistrationManager] background
 * operations (token registration, retry logic) that is independent of any
 * ViewModel or Activity lifecycle.
 */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class FcmScope

/**
 * Hilt module providing push notification-related dependencies.
 *
 * The [FcmTokenRegistrationManager] is provided as a singleton since there should
 * be exactly one token registration manager managing the FCM token lifecycle.
 * The coroutine scope uses [SupervisorJob] so that a retry failure does not
 * cancel the overall registration capability.
 */
@Module
@InstallIn(SingletonComponent::class)
object NotificationModule {

    /**
     * Provides a dedicated [CoroutineScope] for FCM token registration.
     *
     * Uses [Dispatchers.IO] for network operations and [SupervisorJob]
     * for failure isolation between retry attempts.
     */
    @Provides
    @Singleton
    @FcmScope
    fun provideFcmCoroutineScope(): CoroutineScope {
        return CoroutineScope(SupervisorJob() + Dispatchers.IO)
    }

    /**
     * Provides the singleton [FcmTokenRegistrationManager] instance.
     *
     * @param tokenStorage Secure token storage for FCM token persistence.
     * @param apiService Happy API service for device registration endpoint.
     * @param coroutineScope Dedicated FCM scope for background operations.
     */
    @Provides
    @Singleton
    fun provideFcmTokenRegistrationManager(
        tokenStorage: TokenStorage,
        apiService: HappyApiService,
        @FcmScope coroutineScope: CoroutineScope
    ): FcmTokenRegistrationManager {
        return FcmTokenRegistrationManager(
            tokenStorage = tokenStorage,
            apiService = apiService,
            coroutineScope = coroutineScope
        )
    }
}
