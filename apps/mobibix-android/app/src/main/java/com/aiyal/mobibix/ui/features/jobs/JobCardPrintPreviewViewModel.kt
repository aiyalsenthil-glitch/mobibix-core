package com.aiyal.mobibix.ui.features.jobs

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.data.network.ShopInfo
import com.aiyal.mobibix.data.mappers.toShopInfo
import com.aiyal.mobibix.domain.JobRepository
import com.aiyal.mobibix.domain.ShopRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class JobCardPrintPreviewViewModel @Inject constructor(
    private val jobRepository: JobRepository,
    private val shopRepository: ShopRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<PrintPreviewState>(PrintPreviewState.Loading)
    val uiState: StateFlow<PrintPreviewState> = _uiState.asStateFlow()

    fun loadPreviewData(shopId: String, jobId: String) {
        viewModelScope.launch {
            _uiState.value = PrintPreviewState.Loading
            try {
                val job = jobRepository.getJobDetails(shopId, jobId)
                val shopDetails = shopRepository.getShop(shopId)
                val shopInfo = shopDetails.toShopInfo(shopId)
                _uiState.value = PrintPreviewState.Success(job, shopInfo)
            } catch (e: Exception) {
                _uiState.value = PrintPreviewState.Error(e.message ?: "An unknown error occurred.")
            }
        }
    }
}

sealed interface PrintPreviewState {
    object Loading : PrintPreviewState
    data class Success(val job: JobCardResponse, val shop: ShopInfo) : PrintPreviewState
    data class Error(val message: String) : PrintPreviewState
}
