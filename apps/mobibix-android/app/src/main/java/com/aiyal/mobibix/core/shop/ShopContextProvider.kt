package com.aiyal.mobibix.core.shop

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ShopContextProvider @Inject constructor(
    shopContextStore: ShopContextStore
) {
    private val _activeShopId = MutableStateFlow<String?>(null)
    val activeShopIdFlow: StateFlow<String?> = _activeShopId.asStateFlow()

    init {
        CoroutineScope(Dispatchers.IO).launch {
            _activeShopId.value = shopContextStore.getActiveShopId()
        }
    }

    fun updateShopId(shopId: String?) {
        _activeShopId.value = shopId
    }

    fun getActiveShopId(): String? = _activeShopId.value
}
