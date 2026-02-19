package com.aiyal.mobibix.core.di

import com.aiyal.mobibix.BuildConfig
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.shop.ShopInterceptor
import com.aiyal.mobibix.data.network.AuthInterceptor
import com.aiyal.mobibix.data.network.DashboardApi
import com.aiyal.mobibix.data.network.JobApi
import com.aiyal.mobibix.data.network.ProductApi
import com.aiyal.mobibix.data.network.PurchaseApi
import com.aiyal.mobibix.data.network.ReceiptApi
import com.aiyal.mobibix.data.network.ReportApi
import com.aiyal.mobibix.data.network.SalesApi
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.data.network.StaffApi
import com.aiyal.mobibix.data.network.SupplierApi
import com.aiyal.mobibix.data.network.TenantApi
import com.aiyal.mobibix.data.network.TokenProvider
import com.aiyal.mobibix.data.network.UserApi
import com.aiyal.mobibix.data.network.VoucherApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideAuthInterceptor(tokenProvider: TokenProvider): AuthInterceptor = AuthInterceptor(tokenProvider)

    @Provides
    @Singleton
    fun provideShopInterceptor(shopContextProvider: ShopContextProvider): ShopInterceptor = ShopInterceptor(shopContextProvider)

    @Provides
    @Singleton
    fun provideOkHttpClient(authInterceptor: AuthInterceptor, shopInterceptor: ShopInterceptor): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(shopInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideAuthService(retrofit: Retrofit): com.aiyal.mobibix.data.network.AuthService {
        return retrofit.create(com.aiyal.mobibix.data.network.AuthService::class.java)
    }

    @Provides
    @Singleton
    fun provideUserApi(retrofit: Retrofit): UserApi {
        return retrofit.create(UserApi::class.java)
    }

    @Provides
    @Singleton
    fun provideTenantApi(retrofit: Retrofit): TenantApi {
        return retrofit.create(TenantApi::class.java)
    }

    @Provides
    @Singleton
    fun provideShopApi(retrofit: Retrofit): ShopApi {
        return retrofit.create(ShopApi::class.java)
    }

    @Provides
    @Singleton
    fun provideStaffApi(retrofit: Retrofit): StaffApi {
        return retrofit.create(StaffApi::class.java)
    }

    @Provides
    @Singleton
    fun provideJobApi(retrofit: Retrofit): JobApi {
        return retrofit.create(JobApi::class.java)
    }

    @Provides
    @Singleton
    fun provideDashboardApi(retrofit: Retrofit): DashboardApi {
        return retrofit.create(DashboardApi::class.java)
    }

    @Provides
    @Singleton
    fun provideSalesApi(retrofit: Retrofit): SalesApi {
        return retrofit.create(SalesApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideProductApi(retrofit: Retrofit): ProductApi {
        return retrofit.create(ProductApi::class.java)
    }

    @Provides
    @Singleton
    fun provideReportApi(retrofit: Retrofit): ReportApi {
        return retrofit.create(ReportApi::class.java)
    }

    @Provides
    @Singleton
    fun providePurchaseApi(retrofit: Retrofit): PurchaseApi {
        return retrofit.create(PurchaseApi::class.java)
    }

    @Provides
    @Singleton
    fun provideSupplierApi(retrofit: Retrofit): SupplierApi {
        return retrofit.create(SupplierApi::class.java)
    }

    @Provides
    @Singleton
    fun provideReceiptApi(retrofit: Retrofit): ReceiptApi {
        return retrofit.create(ReceiptApi::class.java)
    }

    @Provides
    @Singleton
    fun provideVoucherApi(retrofit: Retrofit): VoucherApi {
        return retrofit.create(VoucherApi::class.java)
    }

    @Provides
    @Singleton
    fun provideCustomerApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.CustomerApi {
        return retrofit.create(com.aiyal.mobibix.data.network.CustomerApi::class.java)
    }

    @Provides
    @Singleton
    fun provideWhatsappApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.WhatsappApi {
        return retrofit.create(com.aiyal.mobibix.data.network.WhatsappApi::class.java)
    }

    @Provides
    @Singleton
    fun provideLoyaltyApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.LoyaltyApi {
        return retrofit.create(com.aiyal.mobibix.data.network.LoyaltyApi::class.java)
    }

    @Provides
    @Singleton
    fun provideBillingApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.BillingApi {
        return retrofit.create(com.aiyal.mobibix.data.network.BillingApi::class.java)
    }

    @Provides
    @Singleton
    fun provideCrmApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.CrmApi {
        return retrofit.create(com.aiyal.mobibix.data.network.CrmApi::class.java)
    }
}
