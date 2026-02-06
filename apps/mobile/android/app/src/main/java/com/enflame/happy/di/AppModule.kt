package com.enflame.happy.di

import android.content.Context
import com.enflame.happy.data.api.AuthApiService
import com.enflame.happy.data.api.FriendsApiService
import com.enflame.happy.data.api.HappyApiService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.repository.AuthRepositoryImpl
import com.enflame.happy.data.repository.FriendsRepositoryImpl
import com.enflame.happy.domain.repository.AuthRepository
import com.enflame.happy.domain.repository.FriendsRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Main Hilt dependency injection module.
 *
 * Provides application-wide singletons for networking, storage, and core services.
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    private const val BASE_URL = "https://api.happy.dev/"
    private const val CONNECT_TIMEOUT_SECONDS = 30L
    private const val READ_TIMEOUT_SECONDS = 30L
    private const val WRITE_TIMEOUT_SECONDS = 30L

    /**
     * Provides configured JSON serialization.
     */
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
        isLenient = true
    }

    /**
     * Provides HTTP logging interceptor for debugging.
     * Only logs in debug builds.
     */
    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = if (com.enflame.happy.BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }

    /**
     * Provides configured OkHttpClient.
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Provides Retrofit instance configured with kotlinx.serialization.
     */
    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        json: Json
    ): Retrofit {
        val contentType = "application/json".toMediaType()
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }

    /**
     * Provides Happy API service.
     */
    @Provides
    @Singleton
    fun provideHappyApiService(retrofit: Retrofit): HappyApiService {
        return retrofit.create(HappyApiService::class.java)
    }

    /**
     * Provides Auth API service for pairing endpoints.
     */
    @Provides
    @Singleton
    fun provideAuthApiService(retrofit: Retrofit): AuthApiService {
        return retrofit.create(AuthApiService::class.java)
    }

    /**
     * Provides secure token storage backed by Android Keystore.
     */
    @Provides
    @Singleton
    fun provideTokenStorage(@ApplicationContext context: Context): TokenStorage {
        return TokenStorage(context)
    }

    /**
     * Provides Auth repository implementation for pairing flow.
     */
    @Provides
    @Singleton
    fun provideAuthRepository(
        authApiService: AuthApiService,
        tokenStorage: TokenStorage
    ): AuthRepository {
        return AuthRepositoryImpl(authApiService, tokenStorage)
    }

    /**
     * Provides Friends API service for social feature endpoints.
     */
    @Provides
    @Singleton
    fun provideFriendsApiService(retrofit: Retrofit): FriendsApiService {
        return retrofit.create(FriendsApiService::class.java)
    }

    /**
     * Provides Friends repository implementation for social features.
     */
    @Provides
    @Singleton
    fun provideFriendsRepository(
        friendsApiService: FriendsApiService,
        happyApiService: HappyApiService
    ): FriendsRepository {
        return FriendsRepositoryImpl(friendsApiService, happyApiService)
    }
}
