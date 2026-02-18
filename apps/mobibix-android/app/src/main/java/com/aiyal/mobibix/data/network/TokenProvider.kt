package com.aiyal.mobibix.data.network

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import com.aiyal.mobibix.core.data.PrefKeys
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenProvider @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    fun getToken(): String? {
        // runBlocking is used here to synchronously get the token on the same thread.
        // This is acceptable because this will be called from an I/O-bound thread by OkHttp's dispatcher.
        return runBlocking {
            dataStore.data.first()[PrefKeys.JWT_TOKEN]
        }
    }
}
