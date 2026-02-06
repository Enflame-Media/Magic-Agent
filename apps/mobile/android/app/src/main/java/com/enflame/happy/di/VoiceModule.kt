package com.enflame.happy.di

import android.content.Context
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.voice.AudioDeviceManager
import com.enflame.happy.data.voice.ElevenLabsApiService
import com.enflame.happy.data.voice.VoiceService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import javax.inject.Qualifier
import javax.inject.Singleton

/**
 * Qualifier annotation for the ElevenLabs-specific [Retrofit] instance.
 *
 * Distinguishes the ElevenLabs API Retrofit from the main Happy API Retrofit
 * since they have different base URLs.
 */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class ElevenLabsRetrofit

/**
 * Hilt module providing voice-related dependencies.
 *
 * Provides:
 * - [ElevenLabsApiService] Retrofit interface for ElevenLabs TTS
 * - [AudioDeviceManager] singleton for Bluetooth and audio device routing (HAP-1021)
 * - [VoiceService] singleton for unified TTS management
 */
@Module
@InstallIn(SingletonComponent::class)
object VoiceModule {

    private const val ELEVEN_LABS_BASE_URL = "https://api.elevenlabs.io/"

    /**
     * Provides a Retrofit instance configured for the ElevenLabs API.
     *
     * Uses a separate base URL from the main Happy API while sharing
     * the same [OkHttpClient] and [Json] configuration.
     */
    @Provides
    @Singleton
    @ElevenLabsRetrofit
    fun provideElevenLabsRetrofit(
        okHttpClient: OkHttpClient,
        json: Json
    ): Retrofit {
        val contentType = "application/json".toMediaType()
        return Retrofit.Builder()
            .baseUrl(ELEVEN_LABS_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }

    /**
     * Provides the ElevenLabs API service.
     */
    @Provides
    @Singleton
    fun provideElevenLabsApiService(
        @ElevenLabsRetrofit retrofit: Retrofit
    ): ElevenLabsApiService {
        return retrofit.create(ElevenLabsApiService::class.java)
    }

    /**
     * Provides the AudioDeviceManager singleton for Bluetooth and audio routing.
     *
     * Manages audio output device discovery, selection, and routing
     * for Bluetooth headsets, wired headphones, USB audio, and speakers.
     *
     * @param context Application context for AudioManager access.
     */
    @Provides
    @Singleton
    fun provideAudioDeviceManager(
        @ApplicationContext context: Context
    ): AudioDeviceManager {
        return AudioDeviceManager(context)
    }

    /**
     * Provides the VoiceService singleton.
     *
     * @param context Application context for TextToSpeech and AudioManager.
     * @param elevenLabsApiService ElevenLabs API for high-quality TTS.
     * @param tokenStorage Secure storage for the ElevenLabs API key.
     * @param audioDeviceManager Audio device manager for Bluetooth routing (HAP-1021).
     */
    @Provides
    @Singleton
    fun provideVoiceService(
        @ApplicationContext context: Context,
        elevenLabsApiService: ElevenLabsApiService,
        tokenStorage: TokenStorage,
        audioDeviceManager: AudioDeviceManager
    ): VoiceService {
        return VoiceService(context, elevenLabsApiService, tokenStorage, audioDeviceManager)
    }
}
