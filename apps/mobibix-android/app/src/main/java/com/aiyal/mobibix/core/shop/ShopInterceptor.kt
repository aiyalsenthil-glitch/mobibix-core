package com.aiyal.mobibix.core.shop

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class ShopInterceptor @Inject constructor(
    private val shopContextProvider: ShopContextProvider
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
        shopContextProvider.getActiveShopId()?.let {
            request.addHeader("X-Shop-Id", it)
        }
        return chain.proceed(request.build())
    }
}
