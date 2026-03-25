package com.aiyal.mobibix.ui.features.reports

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import com.aiyal.mobibix.ui.components.DateRangeFilterRow
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
import com.aiyal.mobibix.data.network.PurchaseReportItem
import com.aiyal.mobibix.data.network.PurchaseReportResponse
import com.aiyal.mobibix.data.network.StockLedgerApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

// ── ViewModel ─────────────────────────────────────────────────────────────────

data class PurchaseReportState(
    val loading: Boolean = false,
    val report: PurchaseReportResponse? = null,
    val error: String? = null
)

@HiltViewModel
class PurchaseReportViewModel @Inject constructor(
    private val stockLedgerApi: StockLedgerApi
) : ViewModel() {

    private val _state = MutableStateFlow(PurchaseReportState())
    val state = _state.asStateFlow()

    fun load(shopId: String, startDate: String? = null, endDate: String? = null) {
        viewModelScope.launch {
            _state.value = PurchaseReportState(loading = true)
            try {
                val report = stockLedgerApi.getPurchaseReport(shopId, startDate, endDate)
                _state.value = PurchaseReportState(loading = false, report = report)
            } catch (e: Exception) {
                _state.value = PurchaseReportState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }
}

// ── Screen ────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PurchaseReportScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: PurchaseReportViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState(initial = null)
    val fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    val today = LocalDate.now()
    var startDate by remember { mutableStateOf(today.withDayOfMonth(1).format(fmt)) }
    var endDate by remember { mutableStateOf(today.format(fmt)) }

    LaunchedEffect(activeShopId) {
        activeShopId?.let { viewModel.load(it, startDate, endDate) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Purchase Report", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            DateRangeFilterRow(
                startDate = startDate,
                endDate = endDate,
                onRangeSelected = { start, end ->
                    startDate = start
                    endDate = end
                    activeShopId?.let { viewModel.load(it, start, end) }
                }
            )
            LazyColumn(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
            when {
                state.loading -> item {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                state.error != null -> item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                    ) {
                        Text(
                            state.error!!,
                            modifier = Modifier.padding(14.dp),
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
                state.report != null -> {
                    val report = state.report!!

                    // Summary card
                    item {
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                SummaryStatCol(
                                    label = "Total Purchases",
                                    value = "₹${String.format("%.2f", report.totalAmount)}",
                                    color = MaterialTheme.colorScheme.primary
                                )
                                VerticalDivider(modifier = Modifier.height(40.dp))
                                SummaryStatCol(
                                    label = "Total Tax",
                                    value = "₹${String.format("%.2f", report.totalTax)}",
                                    color = Color(0xFFF59E0B)
                                )
                                VerticalDivider(modifier = Modifier.height(40.dp))
                                SummaryStatCol(
                                    label = "Invoices",
                                    value = "${report.data.size}",
                                    color = Color(0xFF3B82F6)
                                )
                            }
                        }
                    }

                    if (report.data.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier.fillMaxWidth().padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(
                                        Icons.Default.ShoppingCart,
                                        contentDescription = null,
                                        modifier = Modifier.size(48.dp),
                                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text("No purchases in this period", color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    } else {
                        item {
                            Text(
                                "Purchase Invoices (${report.data.size})",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                        }
                        items(report.data) { item -> PurchaseReportItemCard(item) }
                    }
                }
            }
            } // end LazyColumn
        } // end outer Column
    }
}

@Composable
private fun SummaryStatCol(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = color)
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PurchaseReportItemCard(item: PurchaseReportItem) {
    val payStatusColor = when (item.paymentStatus) {
        "PAID" -> Color(0xFF00C896)
        "PARTIAL" -> Color(0xFFF59E0B)
        "UNPAID" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val statusColor = when (item.status) {
        "CONFIRMED" -> Color(0xFF00C896)
        "DRAFT" -> Color(0xFFF59E0B)
        "CANCELLED" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.invoiceNumber, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(item.supplierName, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(item.date.take(10), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        "₹${String.format("%.2f", item.totalAmount)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                            Text(item.status, modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp), fontSize = 9.sp, color = statusColor, fontWeight = FontWeight.Bold)
                        }
                        item.paymentStatus?.let {
                            Surface(shape = RoundedCornerShape(20.dp), color = payStatusColor.copy(alpha = 0.12f)) {
                                Text(it, modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp), fontSize = 9.sp, color = payStatusColor, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
            if (item.taxAmount > 0) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Tax", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("₹${String.format("%.2f", item.taxAmount)}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
