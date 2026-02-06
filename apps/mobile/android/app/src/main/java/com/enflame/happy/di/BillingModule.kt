package com.enflame.happy.di

import android.content.Context
import com.enflame.happy.data.billing.PurchaseService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing billing-related dependencies.
 *
 * The [PurchaseService] is provided as a singleton since there should be
 * exactly one [BillingClient] connection per application. Having multiple
 * billing clients can cause unexpected behavior with purchase callbacks.
 */
@Module
@InstallIn(SingletonComponent::class)
object BillingModule {

    /**
     * Provides the singleton [PurchaseService] instance.
     *
     * The service manages the Google Play Billing client lifecycle,
     * product queries, purchase flows, and subscription status tracking.
     *
     * @param context The application context for creating the BillingClient.
     */
    @Provides
    @Singleton
    fun providePurchaseService(
        @ApplicationContext context: Context
    ): PurchaseService {
        return PurchaseService(context)
    }
}
