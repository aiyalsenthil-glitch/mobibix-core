package com.aiyal.mobibix.ui.features.intelligence

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.TrendingFlat
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.DemandForecastApi
import com.aiyal.mobibix.data.network.DemandForecastResponse
import com.aiyal.mobibix.data.network.ForecastItem
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.core.ui.UiMessageBus
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── ViewModel ───────────────────────────────────────────────────────────────

data class DemandForecastState(
    val loading: Boolean = false,
    val forecast: DemandForecastResponse? = null,
    val error: String? = null,
    val selectedDays: Int = 30
)

@HiltViewModel
class DemandForecastViewModel @Inject constructor(
    private val demandForecastApi: DemandForecastApi,
    private val shopContextProvider: ShopContextProvider,
    private val uiMessageBus: UiMessageBus
) : ViewModel() {

    private val _state = MutableStateFlow(DemandForecastState())
    val state = _state.asStateFlow()

    fun load(days: Int = 30) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null, selectedDays = days)
            try {
                val data = demandForecastApi.getDemandForecast(shopId, days)
                _state.value = _state.value.copy(loading = false, forecast = data)
            } catch (e: Exception) {
                val msg = MobiError.extractMessage(e)
                uiMessageBus.showError(msg)
                _state.value = _state.value.copy(loading = false, error = msg)
            }
        }
    }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

private val TealAccent = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DemandForecastScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: DemandForecastViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val periodOptions = listOf(7, 14, 30, 60, 90)

    LaunchedEffect(Unit) { viewModel.load() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Demand Forecast", fontWeight = FontWeight.Bold)
                        Text("AI-driven reorder recommendations", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        ) {
            if (state.loading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = TealAccent)
            }

            // Period selector
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                periodOptions.forEach { days ->
                    FilterChip(
                        selected = state.selectedDays == days,
                        onClick = { viewModel.load(days) },
                        label = { Text("${days}d") }
                    )
                }
            }

            val forecast = state.forecast
            if (forecast == null && !state.loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Analytics, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                        Spacer(Modifier.height(12.dp))
                        Text("No forecast data", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(state.error ?: "Check back after recording some sales", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
                    }
                }
            } else if (forecast != null) {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Summary row
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            ForecastStatCard("Low Stock", forecast.lowStockCount.toString(), Color(0xFFF59E0B), Modifier.weight(1f))
                            ForecastStatCard("Critical", forecast.criticalStockCount.toString(), Color(0xFFEF4444), Modifier.weight(1f))
                            ForecastStatCard("Period", "${forecast.forecastPeriodDays}d", TealAccent, Modifier.weight(1f))
                        }
                    }

                    item {
                        Text("Product Forecasts", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }

                    items(forecast.items.sortedBy { it.daysUntilStockout ?: Int.MAX_VALUE }) { item ->
                        ForecastItemCard(item)
                    }
                }
            }
        }
    }
}

@Composable
private fun ForecastStatCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f))
    ) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = color)
            Text(label, style = MaterialTheme.typography.labelSmall, color = color.copy(alpha = 0.8f))
        }
    }
}

@Composable
private fun ForecastItemCard(item: ForecastItem) {
    val urgency = when {
        item.daysUntilStockout != null && item.daysUntilStockout <= 3  -> Color(0xFFEF4444)
        item.daysUntilStockout != null && item.daysUntilStockout <= 7  -> Color(0xFFF59E0B)
        else -> Color(0xFF9CA3AF)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(item.productName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                TrendIcon(item.trend)
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                ForecastStat("In Stock", "${item.currentStock}", Modifier.weight(1f))
                ForecastStat("Forecast", "${item.forecastedDemand}", Modifier.weight(1f))
                ForecastStat("Reorder", "${item.recommendedReorder}", Modifier.weight(1f))
            }
            if (item.daysUntilStockout != null) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = urgency, modifier = Modifier.size(14.dp))
                    Text(
                        "Stockout in ~${item.daysUntilStockout} day(s)",
                        style = MaterialTheme.typography.labelSmall,
                        color = urgency,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "${(item.confidence * 100).toInt()}% confidence",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }
        }
    }
}

@Composable
private fun ForecastStat(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        Text(value, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun TrendIcon(trend: String) {
    val (icon, tint) = when (trend.uppercase()) {
        "UP"   -> Pair(Icons.AutoMirrored.Filled.TrendingUp, Color(0xFF00C896))
        "DOWN" -> Pair(Icons.AutoMirrored.Filled.TrendingDown, Color(0xFFEF4444))
        else   -> Pair(Icons.Default.TrendingFlat, Color(0xFF9CA3AF))
    }
    Icon(icon, contentDescription = trend, tint = tint, modifier = Modifier.size(20.dp))
}
