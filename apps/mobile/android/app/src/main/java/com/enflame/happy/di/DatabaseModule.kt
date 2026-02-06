package com.enflame.happy.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStoreFile
import androidx.room.Room
import com.enflame.happy.data.local.HappyDatabase
import com.enflame.happy.data.local.UserPreferencesDataStore
import com.enflame.happy.data.local.dao.MessageDao
import com.enflame.happy.data.local.dao.SessionDao
import com.enflame.happy.data.repository.LocalSessionRepository
import com.enflame.happy.domain.repository.SessionRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing local storage dependencies.
 *
 * Provides singleton instances of:
 * - [HappyDatabase] Room database
 * - [SessionDao] for session table operations
 * - [MessageDao] for message table operations
 * - [DataStore]<[Preferences]> for user preferences
 * - [UserPreferencesDataStore] wrapper for type-safe preference access
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    /**
     * Provides the Room database instance.
     *
     * Configured with all registered migrations and a fallback
     * to destructive migration for development convenience.
     * In production, remove [fallbackToDestructiveMigration] and
     * ensure all migrations are properly defined.
     */
    @Provides
    @Singleton
    fun provideDatabase(
        @ApplicationContext context: Context
    ): HappyDatabase {
        return Room.databaseBuilder(
            context,
            HappyDatabase::class.java,
            HappyDatabase.DATABASE_NAME
        )
            .addMigrations(*HappyDatabase.MIGRATIONS)
            .fallbackToDestructiveMigration()
            .build()
    }

    /**
     * Provides the Session DAO from the database instance.
     */
    @Provides
    @Singleton
    fun provideSessionDao(database: HappyDatabase): SessionDao {
        return database.sessionDao()
    }

    /**
     * Provides the Message DAO from the database instance.
     */
    @Provides
    @Singleton
    fun provideMessageDao(database: HappyDatabase): MessageDao {
        return database.messageDao()
    }

    /**
     * Provides the Jetpack DataStore instance for user preferences.
     */
    @Provides
    @Singleton
    fun providePreferencesDataStore(
        @ApplicationContext context: Context
    ): DataStore<Preferences> {
        return PreferenceDataStoreFactory.create {
            context.preferencesDataStoreFile("user_preferences")
        }
    }

    /**
     * Provides the UserPreferencesDataStore wrapper.
     */
    @Provides
    @Singleton
    fun provideUserPreferencesDataStore(
        dataStore: DataStore<Preferences>
    ): UserPreferencesDataStore {
        return UserPreferencesDataStore(dataStore)
    }
}

/**
 * Hilt module for binding repository interfaces to implementations.
 *
 * Uses [Binds] for zero-overhead interface-to-implementation bindings.
 * Separated from [DatabaseModule] because [Binds] requires an abstract class.
 */
@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    /**
     * Binds [LocalSessionRepository] as the [SessionRepository] implementation.
     */
    @Binds
    @Singleton
    abstract fun bindSessionRepository(
        localSessionRepository: LocalSessionRepository
    ): SessionRepository
}
