package com.aiyal.mobibix.data.network

import com.aiyal.mobibix.core.auth.AuthEventBus
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class UnauthorizedInterceptor @Inject constructor(
    private val authEventBus: AuthEventBus
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())
        if (response.code == 401) {
            authEventBus.emitUnauthorized()
        }
        return response
    }
}
