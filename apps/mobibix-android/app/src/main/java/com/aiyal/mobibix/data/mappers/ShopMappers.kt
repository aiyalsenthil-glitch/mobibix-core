package com.aiyal.mobibix.data.mappers

import com.aiyal.mobibix.data.network.ShopDetails
import com.aiyal.mobibix.data.network.ShopInfo

fun ShopDetails.toShopInfo(id: String): ShopInfo {
    return ShopInfo(
        id = id,
        name = name,
        phone = phone
    )
}
