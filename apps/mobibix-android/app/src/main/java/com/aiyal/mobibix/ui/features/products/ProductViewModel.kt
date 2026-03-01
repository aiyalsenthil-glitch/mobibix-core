package com.aiyal.mobibix.ui.features.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.CreateProductRequest
import com.aiyal.mobibix.data.network.ShopProduct
import com.aiyal.mobibix.data.network.StockCorrectionRequest
import com.aiyal.mobibix.data.network.StockInRequest
import com.aiyal.mobibix.data.network.UpdateProductRequest
import com.aiyal.mobibix.domain.ProductRepository
import com.aiyal.mobibix.core.util.MobiError
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductListUiState(
    val isLoading: Boolean = false,
    val products: List<ShopProduct> = emptyList(),
    val error: String? = null,
    val searchQuery: String = "",
    val total: Int = 0,
    val actionSuccess: Boolean = false // For navigation after create/update/stock
)

@HiltViewModel
class ProductViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductListUiState())
    val uiState = _uiState.asStateFlow()

    private var allProducts: List<ShopProduct> = emptyList()

    fun loadProducts() {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            // Observe local database
            launch {
                productRepository.getLocalProducts(shopId)
                    .catch { e ->
                        _uiState.value = _uiState.value.copy(error = e.message ?: "Failed to load local products")
                    }
                    .collect { products ->
                        allProducts = products
                        filterProducts(_uiState.value.searchQuery)
                    }
            }

            // Sync from network
            try {
                productRepository.syncProducts(shopId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Offline mode. Showing cached data."
                )
            }
        }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        filterProducts(query)
    }

    private fun filterProducts(query: String) {
        val filtered = if (query.isBlank()) {
            allProducts
        } else {
            allProducts.filter { 
                it.name.contains(query, ignoreCase = true) || 
                (it.sku?.contains(query, ignoreCase = true) == true)
            }
        }
        _uiState.value = _uiState.value.copy(
            products = filtered,
            isLoading = false,
            total = if (query.isBlank()) allProducts.size else filtered.size
        )
    }

    fun createProduct(name: String, type: String, salePrice: Double, category: String?, isSerialized: Boolean, costPrice: Double?, gstRate: Float?, hsnCode: String?) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                productRepository.createProduct(
                    CreateProductRequest(
                        shopId = shopId,
                        name = name,
                        type = type,
                        category = category,
                        salePrice = (salePrice * 100).toInt(),
                        costPrice = costPrice?.let { (it * 100).toInt() },
                        gstRate = gstRate,
                        hsnCode = hsnCode,
                        isSerialized = isSerialized
                    )
                )
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
                loadProducts()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun updateProduct(id: String, name: String?, type: String?, salePrice: Double?, category: String?, costPrice: Double?, gstRate: Float?, hsnCode: String?) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                productRepository.updateProduct(
                    id,
                    UpdateProductRequest(
                        shopId = shopId,
                        name = name,
                        type = type,
                        category = category,
                        salePrice = salePrice?.let { (it * 100).toInt() },
                        costPrice = costPrice?.let { (it * 100).toInt() },
                        gstRate = gstRate,
                        hsnCode = hsnCode
                    )
                )
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
                loadProducts()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun stockIn(productId: String, quantity: Int, costPrice: Double, imeis: List<String>?, type: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                productRepository.stockIn(
                    StockInRequest(
                        productId = productId,
                        quantity = quantity,
                        costPerUnit = (costPrice * 100).toInt(),
                        imeis = imeis,
                        type = type
                    )
                )
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
                loadProducts()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun correctStock(productId: String, quantity: Int, reason: String, note: String?) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                productRepository.correctStock(
                    StockCorrectionRequest(
                        shopId = shopId,
                        shopProductId = productId,
                        quantity = quantity,
                        reason = reason,
                        note = note
                    )
                )
                _uiState.value = _uiState.value.copy(isLoading = false, actionSuccess = true)
                loadProducts()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = MobiError.extractMessage(e))
            }
        }
    }
    
    fun resetActionSuccess() {
        _uiState.value = _uiState.value.copy(actionSuccess = false)
    }
}
