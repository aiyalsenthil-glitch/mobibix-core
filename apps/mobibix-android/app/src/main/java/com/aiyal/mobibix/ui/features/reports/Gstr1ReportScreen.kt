package com.aiyal.mobibix.ui.features.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
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
import com.aiyal.mobibix.data.network.Gstr1B2bInvoice
import com.aiyal.mobibix.data.network.StockLedgerApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class Gstr1State(
    val loading: Boolean = true,
    val b2bItems: List<Gstr1B2bInvoice> = emptyList(),
    val totalTaxable: Double = 0.0,
    val totalTax: Double = 0.0,
    val error: String? = null
)

@HiltViewModel
class Gstr1ViewModel @Inject constructor(private val stockLedgerApi: StockLedgerApi) : ViewModel() {
    private val _state = MutableStateFlow(Gstr1State())
    val state = _state.asStateFlow()

    fun load(shopId: String, startDate: String? = null, endDate: String? = null) {
        viewModelScope.launch {
            _state.value = Gstr1State(loading = true)
            try {
                val b2b = stockLedgerApi.getGstr1B2b(shopId, startDate, endDate)
                _state.value = Gstr1State(
                    loading = false, b2bItems = b2b,
                    totalTaxable = b2b.sumOf { it.taxableValue },
                    totalTax = b2b.sumOf { it.totalTax }
                )
            } catch (e: Exception) {
                _state.value = Gstr1State(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Gstr1ReportScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: Gstr1ViewModel = hiltViewModel()
) {
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val state by viewModel.state.collectAsState()
    var activeTab by remember { mutableIntStateOf(0) }

    LaunchedEffect(activeShopId) { activeShopId?.let { viewModel.load(it) } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("GSTR-1", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            TabRow(selectedTabIndex = activeTab) {
                Tab(selected = activeTab == 0, onClick = { activeTab = 0 }, text = { Text("B2B") })
                Tab(selected = activeTab == 1, onClick = { activeTab = 1 }, text = { Text("Summary") })
            }

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.error!!, color = MaterialTheme.colorScheme.error)
                }
                activeTab == 0 -> {
                    if (state.b2bItems.isEmpty()) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No B2B invoices found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else {
                        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(state.b2bItems) { inv ->
                                Card(
                                    shape = RoundedCornerShape(10.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(inv.invoiceNo, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                            Text(inv.date.take(10), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        Text(inv.buyerName ?: inv.buyerGstin, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text("GSTIN: ${inv.buyerGstin}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                                        HorizontalDivider(modifier = Modifier.padding(vertical = 2.dp))
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Taxable", fontSize = 12.sp)
                                            Text("₹${String.format("%.2f", inv.taxableValue)}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                        }
                                        if (inv.cgst > 0) Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("CGST + SGST", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("₹${String.format("%.2f", inv.cgst + inv.sgst)}", fontSize = 12.sp)
                                        }
                                        if (inv.igst > 0) Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("IGST", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Text("₹${String.format("%.2f", inv.igst)}", fontSize = 12.sp)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Total Tax", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                            Text("₹${String.format("%.2f", inv.totalTax)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else -> {
                    // Summary tab
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f))) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("GSTR-1 Summary", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                HorizontalDivider()
                                SummaryRow("Total B2B Invoices", "${state.b2bItems.size}")
                                SummaryRow("Total Taxable Value", "₹${String.format("%.2f", state.totalTaxable)}")
                                SummaryRow("Total Tax", "₹${String.format("%.2f", state.totalTax)}", bold = true, color = MaterialTheme.colorScheme.primary)
                                SummaryRow("Invoice Value", "₹${String.format("%.2f", state.totalTaxable + state.totalTax)}", bold = true)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String, bold: Boolean = false, color: Color = Color.Unspecified) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 13.sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = if (color != Color.Unspecified) color else MaterialTheme.colorScheme.onSurface)
    }
}
