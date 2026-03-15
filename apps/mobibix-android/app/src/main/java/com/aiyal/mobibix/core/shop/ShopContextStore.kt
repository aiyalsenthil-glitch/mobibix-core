package com.aiyal.mobibix.core.shop

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.aiyal.mobibix.core.data.PrefKeys
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShopContextStore @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {
    suspend fun setActiveShopId(shopId: String) {
        dataStore.edit {
            it[PrefKeys.ACTIVE_SHOP_ID] = shopId
        }
    }

    suspend fun getActiveShopId(): String? {
        return dataStore.data.first()[PrefKeys.ACTIVE_SHOP_ID]
    }

    suspend fun clear() {
        dataStore.edit {
            it.remove(PrefKeys.ACTIVE_SHOP_ID)
        }
    }
}
