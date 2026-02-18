package com.aiyal.mobibix.core.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore

const val USER_PREFERENCES_NAME = "mobibix_user_preferences"

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
    name = USER_PREFERENCES_NAME
)

object PrefKeys {
    val JWT_TOKEN = stringPreferencesKey("jwt_token")
    val ACTIVE_SHOP_ID = stringPreferencesKey("active_shop_id")
}
