package com.enflame.happy.di

import com.enflame.happy.data.crypto.EncryptionService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing encryption-related dependencies.
 *
 * The EncryptionService is a singleton since it maintains a monotonic nonce counter
 * for hybrid nonce generation. Sharing a single instance across the app ensures
 * counter uniqueness and prevents nonce collision risk.
 */
@Module
@InstallIn(SingletonComponent::class)
object CryptoModule {

    /**
     * Provides the singleton EncryptionService instance.
     *
     * While EncryptionService is annotated with @Singleton and @Inject constructor,
     * providing it explicitly in a module makes the dependency graph more discoverable
     * and enables future configuration (e.g., injecting an Android Keystore-backed provider).
     */
    @Provides
    @Singleton
    fun provideEncryptionService(): EncryptionService {
        return EncryptionService()
    }
}
