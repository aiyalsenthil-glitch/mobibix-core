package com.aiyal.mobibix.ui.features.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.StockLedgerApi
import com.aiyal.mobibix.data.network.StockLedgerEntry
import com.aiyal.mobibix.data.network.StockLedgerResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StockLedgerState(
    val loading: Boolean = true,
    val ledger: StockLedgerResponse? = null,
    val error: String? = null
)

@HiltViewModel
class StockLedgerViewModel @Inject constructor(private val stockLedgerApi: StockLedgerApi) : ViewModel() {
    private val _state = MutableStateFlow(StockLedgerState())
    val state = _state.asStateFlow()

    fun load(shopId: String, productId: String? = null) {
        viewModelScope.launch {
            _state.value = StockLedgerState(loading = true)
            try {
                val data = stockLedgerApi.getStockLedger(shopId, productId)
                _state.value = StockLedgerState(loading = false, ledger = data)
            } catch (e: Exception) {
                _state.value = StockLedgerState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockLedgerScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    filterProductId: String? = null,
    viewModel: StockLedgerViewModel = hiltViewModel()
) {
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val state by viewModel.state.collectAsState()

    LaunchedEffect(activeShopId, filterProductId) { activeShopId?.let { viewModel.load(it, filterProductId) } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stock Ledger", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            state.error != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }
            state.ledger != null -> {
                val ledger = state.ledger!!
                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Summary
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                LedgerStat("Opening", "${ledger.openingBalance}")
                                VerticalDivider()
                                LedgerStat("In", "+${ledger.totalIn}", Color(0xFF00C896))
                                VerticalDivider()
                                LedgerStat("Out", "-${ledger.totalOut}", MaterialTheme.colorScheme.error)
                                VerticalDivider()
                                LedgerStat("Closing", "${ledger.closingBalance}", MaterialTheme.colorScheme.primary)
                            }
                        }
                    }

                    // Ledger entries
                    if (ledger.entries.isEmpty()) {
                        item { Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) { Text("No ledger entries", color = MaterialTheme.colorScheme.onSurfaceVariant) } }
                    } else {
                        // Header
                        item {
                            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Date / Product", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                                Text("In", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF00C896), modifier = Modifier.width(40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                Text("Out", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.error, modifier = Modifier.width(40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                                Text("Bal", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End)
                            }
                        }
                        items(ledger.entries) { entry ->
                            LedgerEntryRow(entry)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LedgerStat(label: String, value: String, color: Color = Color.Unspecified) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = if (color != Color.Unspecified) color else MaterialTheme.colorScheme.onSurface)
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun LedgerEntryRow(entry: StockLedgerEntry) {
    Card(
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(entry.productName, fontSize = 12.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(entry.txnDate.take(10), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(entry.txnType.replace("_", " "), fontSize = 10.sp, color = MaterialTheme.colorScheme.primary)
                }
            }
            Text(if (entry.quantityIn > 0) "+${entry.quantityIn}" else "", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF00C896), modifier = Modifier.width(40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Text(if (entry.quantityOut > 0) "-${entry.quantityOut}" else "", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.error, modifier = Modifier.width(40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Text("${entry.balanceQty}", fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End)
        }
    }
}
