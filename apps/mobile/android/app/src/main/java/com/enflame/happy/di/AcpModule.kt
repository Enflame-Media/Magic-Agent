package com.enflame.happy.di

import com.enflame.happy.data.acp.AcpRepository
import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.sync.SyncService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.serialization.json.Json
import javax.inject.Singleton

/**
 * Hilt module providing ACP (Agent Control Protocol) dependencies.
 *
 * The [AcpRepository] is provided as a singleton to maintain permission
 * queue state, session list, and agent state across screen transitions.
 * It shares the sync-scoped [CoroutineScope] with [SyncService] for
 * coordinated background operations.
 */
@Module
@InstallIn(SingletonComponent::class)
object AcpModule {

    /**
     * Provides the singleton [AcpRepository] instance.
     *
     * @param syncService WebSocket sync service for relay communication.
     * @param encryptionService E2E encryption service for message encryption.
     * @param tokenStorage Secure storage for encryption keys.
     * @param json Kotlinx serialization JSON for message serialization.
     * @param coroutineScope Sync-scoped coroutine scope for background operations.
     */
    @Provides
    @Singleton
    fun provideAcpRepository(
        syncService: SyncService,
        encryptionService: EncryptionService,
        tokenStorage: TokenStorage,
        json: Json,
        @SyncScope coroutineScope: CoroutineScope
    ): AcpRepository {
        return AcpRepository(
            syncService = syncService,
            encryptionService = encryptionService,
            tokenStorage = tokenStorage,
            json = json,
            coroutineScope = coroutineScope
        )
    }
}
