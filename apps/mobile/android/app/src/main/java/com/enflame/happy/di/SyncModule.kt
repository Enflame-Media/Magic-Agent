package com.enflame.happy.di

import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.sync.SyncService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import javax.inject.Qualifier
import javax.inject.Singleton

/**
 * Qualifier annotation for the sync-scoped [CoroutineScope].
 *
 * Used to provide a dedicated scope for the [SyncService] background operations
 * (ping loop, reconnection scheduling) that is independent of any ViewModel lifecycle.
 */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class SyncScope

/**
 * Hilt module providing WebSocket sync-related dependencies.
 *
 * The [SyncService] is provided as a singleton since there should be exactly one
 * WebSocket connection to the server at any time. The coroutine scope uses
 * [SupervisorJob] so that a failure in one child coroutine (e.g., ping loop)
 * does not cancel the reconnection logic.
 */
@Module
@InstallIn(SingletonComponent::class)
object SyncModule {

    /**
     * Provides a dedicated [CoroutineScope] for the sync service.
     *
     * Uses [Dispatchers.IO] for network operations and [SupervisorJob]
     * for failure isolation between child coroutines.
     */
    @Provides
    @Singleton
    @SyncScope
    fun provideSyncCoroutineScope(): CoroutineScope {
        return CoroutineScope(SupervisorJob() + Dispatchers.IO)
    }

    /**
     * Provides the singleton [SyncService] instance.
     *
     * @param okHttpClient The OkHttp client (from [AppModule]).
     * @param tokenStorage Secure token storage (from [AppModule]).
     * @param encryptionService E2E encryption service (from [CryptoModule]).
     * @param json Kotlinx serialization JSON (from [AppModule]).
     * @param coroutineScope Dedicated sync scope.
     */
    @Provides
    @Singleton
    fun provideSyncService(
        okHttpClient: OkHttpClient,
        tokenStorage: TokenStorage,
        encryptionService: EncryptionService,
        json: Json,
        @SyncScope coroutineScope: CoroutineScope
    ): SyncService {
        return SyncService(
            okHttpClient = okHttpClient,
            tokenStorage = tokenStorage,
            encryptionService = encryptionService,
            json = json,
            coroutineScope = coroutineScope
        )
    }
}
