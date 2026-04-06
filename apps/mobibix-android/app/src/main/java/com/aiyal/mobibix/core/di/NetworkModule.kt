package com.aiyal.mobibix.core.di

import com.aiyal.mobibix.BuildConfig
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.shop.ShopInterceptor
import com.aiyal.mobibix.core.auth.AuthEventBus
import com.aiyal.mobibix.data.network.AuthInterceptor
import com.aiyal.mobibix.data.network.UnauthorizedInterceptor
import com.aiyal.mobibix.data.network.DashboardApi
import com.aiyal.mobibix.data.network.JobApi
import com.aiyal.mobibix.data.network.MobiResponseInterceptor
import com.aiyal.mobibix.data.network.CreditNoteApi
import com.aiyal.mobibix.data.network.IntelligenceApi
import com.aiyal.mobibix.data.network.KnowledgeApi
import com.aiyal.mobibix.data.network.OperationsApi
import com.aiyal.mobibix.data.network.PartnerApi
import com.aiyal.mobibix.data.network.QuotationApi
import com.aiyal.mobibix.data.network.StockLedgerApi
import com.aiyal.mobibix.data.network.PermissionsApi
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
import com.aiyal.mobibix.core.auth.PartnerTokenStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Qualifier

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class PartnerRetrofit
import com.google.gson.GsonBuilder
import com.google.gson.TypeAdapter
import com.google.gson.stream.JsonReader
import com.google.gson.stream.JsonToken
import com.google.gson.stream.JsonWriter
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Gson TypeAdapter that converts null JSON strings to empty string ("") for non-nullable
 * Kotlin String fields. Gson ignores Kotlin's null safety — without this adapter a backend
 * returning `"field": null` for a `val field: String` would crash Text() composables with NPE.
 */
private object NullSafeStringAdapter : TypeAdapter<String>() {
    override fun write(out: JsonWriter, value: String?) {
        if (value == null) out.nullValue() else out.value(value)
    }
    override fun read(reader: JsonReader): String {
        if (reader.peek() == JsonToken.NULL) {
            reader.nextNull()
            return ""
        }
        return reader.nextString()
    }
}

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
    fun provideMobiResponseInterceptor(): MobiResponseInterceptor = MobiResponseInterceptor()

    @Provides
    @Singleton
    fun provideUnauthorizedInterceptor(authEventBus: AuthEventBus): UnauthorizedInterceptor =
        UnauthorizedInterceptor(authEventBus)

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        shopInterceptor: ShopInterceptor,
        mobiResponseInterceptor: MobiResponseInterceptor,
        unauthorizedInterceptor: UnauthorizedInterceptor
    ): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(unauthorizedInterceptor) // Must be first to catch 401 before processing
            .addInterceptor(authInterceptor)
            .addInterceptor(shopInterceptor)
            .addInterceptor(mobiResponseInterceptor) // Unwrap {success, data}
            .addInterceptor(loggingInterceptor)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        val gson = GsonBuilder()
            .registerTypeAdapter(String::class.java, NullSafeStringAdapter)
            .create()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
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

    @Provides
    @Singleton
    fun providePermissionsApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.PermissionsApi {
        return retrofit.create(com.aiyal.mobibix.data.network.PermissionsApi::class.java)
    }

    @Provides
    @Singleton
    fun provideCreditNoteApi(retrofit: Retrofit): CreditNoteApi =
        retrofit.create(CreditNoteApi::class.java)

    @Provides
    @Singleton
    fun provideQuotationApi(retrofit: Retrofit): QuotationApi =
        retrofit.create(QuotationApi::class.java)

    @Provides
    @Singleton
    fun provideOperationsApi(retrofit: Retrofit): OperationsApi =
        retrofit.create(OperationsApi::class.java)

    @Provides
    @Singleton
    fun provideKnowledgeApi(retrofit: Retrofit): KnowledgeApi =
        retrofit.create(KnowledgeApi::class.java)

    @Provides
    @Singleton
    fun provideIntelligenceApi(retrofit: Retrofit): IntelligenceApi =
        retrofit.create(IntelligenceApi::class.java)

    @Provides
    @Singleton
    @PartnerRetrofit
    fun providePartnerOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                    else HttpLoggingInterceptor.Level.NONE
        }
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()
    }

    @Provides
    @Singleton
    @PartnerRetrofit
    fun providePartnerRetrofit(@PartnerRetrofit okHttpClient: OkHttpClient): Retrofit {
        val gson = GsonBuilder()
            .registerTypeAdapter(String::class.java, NullSafeStringAdapter)
            .create()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun providePartnerApi(
        @PartnerRetrofit retrofit: Retrofit,
        partnerTokenStore: PartnerTokenStore
    ): PartnerApi = PartnerApiFactory.create(retrofit, partnerTokenStore)

    @Provides
    @Singleton
    fun provideTradeInApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.TradeInApi =
        retrofit.create(com.aiyal.mobibix.data.network.TradeInApi::class.java)

    @Provides
    @Singleton
    fun provideConsumerFinanceApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.ConsumerFinanceApi =
        retrofit.create(com.aiyal.mobibix.data.network.ConsumerFinanceApi::class.java)

    @Provides
    @Singleton
    fun provideStockLedgerApi(retrofit: Retrofit): StockLedgerApi =
        retrofit.create(StockLedgerApi::class.java)

    @Provides
    @Singleton
    fun provideB2bApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.B2bApi =
        retrofit.create(com.aiyal.mobibix.data.network.B2bApi::class.java)

    @Provides
    @Singleton
    fun provideNotificationApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.NotificationApi =
        retrofit.create(com.aiyal.mobibix.data.network.NotificationApi::class.java)

    @Provides
    @Singleton
    fun provideAppVersionApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.AppVersionApi =
        retrofit.create(com.aiyal.mobibix.data.network.AppVersionApi::class.java)

    @Provides
    @Singleton
    fun provideEWayBillApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.EWayBillApi =
        retrofit.create(com.aiyal.mobibix.data.network.EWayBillApi::class.java)

    @Provides
    @Singleton
    fun provideCommissionApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.CommissionApi =
        retrofit.create(com.aiyal.mobibix.data.network.CommissionApi::class.java)

    @Provides
    @Singleton
    fun provideDemandForecastApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.DemandForecastApi =
        retrofit.create(com.aiyal.mobibix.data.network.DemandForecastApi::class.java)

    @Provides
    @Singleton
    fun provideDistributorApi(retrofit: Retrofit): com.aiyal.mobibix.data.network.DistributorApi =
        retrofit.create(com.aiyal.mobibix.data.network.DistributorApi::class.java)
}
