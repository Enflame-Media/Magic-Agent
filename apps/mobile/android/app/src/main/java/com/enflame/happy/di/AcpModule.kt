package com.enflame.happy.di

import com.enflame.happy.data.acp.AcpJsonParser
import com.enflame.happy.data.acp.AcpRepositoryImpl
import com.enflame.happy.data.acp.AcpSyncHandler
import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.sync.SyncService
import com.enflame.happy.domain.repository.AcpRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.serialization.json.Json
import javax.inject.Singleton

/**
 * Hilt module providing ACP (Agent Client Protocol) dependencies.
 *
 * All ACP components are singletons to ensure consistent state
 * across the application lifecycle.
 *
 * ## Dependency Graph
 * ```
 * AcpModule
 *   ├── AcpJsonParser ← Json
 *   ├── AcpRepository (interface) → AcpRepositoryImpl
 *   └── AcpSyncHandler ← SyncService, AcpRepository, AcpJsonParser,
 *                         EncryptionService, TokenStorage, Json, CoroutineScope
 * ```
 */
@Module
@InstallIn(SingletonComponent::class)
object AcpModule {

    /**
     * Provides the ACP JSON parser.
     *
     * Uses the application-wide [Json] instance from [AppModule] which is
     * configured with `ignoreUnknownKeys = true` for forward compatibility.
     */
    @Provides
    @Singleton
    fun provideAcpJsonParser(json: Json): AcpJsonParser {
        return AcpJsonParser(json)
    }

    /**
     * Provides the ACP repository implementation.
     *
     * Backed by in-memory StateFlows. Singleton ensures a single source
     * of truth for ACP state across all ViewModels and composables.
     */
    @Provides
    @Singleton
    fun provideAcpRepository(): AcpRepository {
        return AcpRepositoryImpl()
    }

    /**
     * Provides the ACP sync handler.
     *
     * Integrates with the existing [SyncService] to receive and process
     * ACP session updates from the WebSocket. Uses the sync-scoped
     * [CoroutineScope] for background processing.
     *
     * @param syncService The WebSocket sync service.
     * @param acpRepository The ACP repository to store state in.
     * @param acpJsonParser The JSON parser for ACP payloads.
     * @param encryptionService For decrypting ACP payloads.
     * @param tokenStorage For loading encryption key material.
     * @param json The JSON serialization instance.
     * @param coroutineScope The sync-scoped coroutine scope.
     */
    @Provides
    @Singleton
    fun provideAcpSyncHandler(
        syncService: SyncService,
        acpRepository: AcpRepository,
        acpJsonParser: AcpJsonParser,
        encryptionService: EncryptionService,
        tokenStorage: TokenStorage,
        json: Json,
        @SyncScope coroutineScope: CoroutineScope,
    ): AcpSyncHandler {
        return AcpSyncHandler(
            syncService = syncService,
            acpRepository = acpRepository,
            acpJsonParser = acpJsonParser,
            encryptionService = encryptionService,
            tokenStorage = tokenStorage,
            json = json,
            coroutineScope = coroutineScope,
        )
    }
}
