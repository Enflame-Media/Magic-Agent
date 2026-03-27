package com.enflame.happy.di

import com.enflame.happy.data.acp.AcpRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing ACP (Agent Control Protocol) dependencies.
 *
 * Provides the [AcpRepository] as a singleton so all consumers share
 * the same reactive session state.
 */
@Module
@InstallIn(SingletonComponent::class)
object AcpModule {

    /**
     * Provides the ACP repository as a singleton.
     *
     * The repository is annotated with @Singleton and @Inject constructor,
     * so Hilt can construct it directly. This explicit provider ensures
     * singleton scope even if the annotation is missed.
     */
    @Provides
    @Singleton
    fun provideAcpRepository(): AcpRepository {
        return AcpRepository()
    }
}
