package com.aiyal.mobibix.ui.features.products

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.utils.CsvUtils
import com.aiyal.mobibix.data.network.CreateProductRequest
import com.aiyal.mobibix.domain.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.io.InputStream
import javax.inject.Inject

@HiltViewModel
class ImportExportViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _importState = MutableStateFlow<ImportState>(ImportState.Idle)
    val importState: StateFlow<ImportState> = _importState

    private val _exportState = MutableStateFlow<ExportState>(ExportState.Idle)
    val exportState: StateFlow<ExportState> = _exportState

    // Import Logic
    fun parseCsv(inputStream: InputStream) {
        viewModelScope.launch(Dispatchers.IO) {
            _importState.value = ImportState.Parsing
            try {
                val rows = CsvUtils.parseProductCsv(inputStream)
                _importState.value = ImportState.Preview(rows)
            } catch (e: Exception) {
                _importState.value = ImportState.Error("Failed to parse CSV: ${e.message}")
            }
        }
    }

    fun confirmImport() {
        val currentState = _importState.value
        if (currentState is ImportState.Preview) {
            val rows = currentState.rows
            val shopId = shopContextProvider.getActiveShopId() ?: return

            viewModelScope.launch {
                _importState.value = ImportState.Importing(0, rows.size)
                var successCount = 0
                var failCount = 0

                rows.forEachIndexed { index, row ->
                    try {
                        productRepository.createProduct(
                            CreateProductRequest(
                                shopId = shopId,
                                name = row.name,
                                type = "PRODUCT", // Default type
                                category = row.category.takeIf { it.isNotBlank() },
                                salePrice = (row.salePrice * 100).toInt(),
                                costPrice = (row.costPrice * 100).toInt(),
                                isSerialized = false // CSV mostly for simple products
                            )
                        )
                        successCount++
                    } catch (e: Exception) {
                        failCount++
                    }
                    _importState.value = ImportState.Importing(index + 1, rows.size)
                }
                _importState.value = ImportState.Success(successCount, failCount)
            }
        }
    }

    fun resetImport() {
        _importState.value = ImportState.Idle
    }

    // Export Logic
    fun exportProducts(onReady: (String) -> Unit) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        
        viewModelScope.launch {
            _exportState.value = ExportState.Loading
            try {
                // Fetch ALL products (pagination hack: assume < 1000 for now or implement loop)
                val response = productRepository.getProducts(shopId, 0, 1000)
                val csvContent = CsvUtils.generateProductCsv(response.data)
                onReady(csvContent)
                _exportState.value = ExportState.Success
            } catch (e: Exception) {
                _exportState.value = ExportState.Error(e.message ?: "Export failed")
            }
        }
    }
}

sealed class ImportState {
    object Idle : ImportState()
    object Parsing : ImportState()
    data class Preview(val rows: List<CsvUtils.CsvProductRow>) : ImportState()
    data class Importing(val progress: Int, val total: Int) : ImportState()
    data class Success(val successCount: Int, val failCount: Int) : ImportState()
    data class Error(val message: String) : ImportState()
}

sealed class ExportState {
    object Idle : ExportState()
    object Loading : ExportState()
    object Success : ExportState()
    data class Error(val message: String) : ExportState()
}
