package com.aiyal.mobibix.core.auth

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.aiyal.mobibix.core.data.PrefKeys
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenStore @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    suspend fun saveToken(token: String) {
        dataStore.edit {
            it[PrefKeys.JWT_TOKEN] = token
        }
    }

    suspend fun clear() {
        dataStore.edit {
            it.remove(PrefKeys.JWT_TOKEN)
        }
    }
}
