package com.aiyal.mobibix.ui.features.shop

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.Shop
import com.aiyal.mobibix.data.network.ShopApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ShopListViewModel @Inject constructor(
    private val shopApi: ShopApi
) : ViewModel() {

    private val _shops = MutableStateFlow<List<Shop>>(emptyList())
    val shops = _shops.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading = _isLoading.asStateFlow()

    fun loadShops() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                _shops.value = shopApi.getMyShops().data
            } catch (e: Exception) {
                // Handle error
            } finally {
                _isLoading.value = false
            }
        }
    }
}
