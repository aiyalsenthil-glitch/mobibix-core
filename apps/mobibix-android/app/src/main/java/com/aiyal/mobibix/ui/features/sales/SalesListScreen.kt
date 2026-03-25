package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.InvoiceListItem
import com.aiyal.mobibix.data.network.Shop
import com.aiyal.mobibix.data.network.ShopApi
import com.aiyal.mobibix.util.CurrencyUtils

private val TealAccent = Color(0xFF00C896)

private val STATUS_FILTERS = listOf("ALL", "PAID", "PARTIALLY_PAID", "CREDIT", "FINAL", "CANCELLED")

private fun statusColor(status: String?): Color = when (status?.uppercase()) {
    "PAID"           -> TealAccent
    "PARTIALLY_PAID" -> Color(0xFFF59E0B)
    "CREDIT"         -> Color(0xFF8B5CF6)
    "CANCELLED", "VOIDED" -> Color(0xFFEF4444)
    "FINAL"          -> Color(0xFF3B82F6)
    else             -> Color(0xFF6B7280)
}

private fun statusBg(status: String?): Color = statusColor(status).copy(alpha = 0.12f)

private fun formatDate(iso: String): String = runCatching {
    iso.substring(0, 10) // "2026-03-24"
}.getOrDefault(iso)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesListScreen(
    shopContextProvider: ShopContextProvider,
    shopApi: ShopApi,
    viewModel: SalesViewModel = hiltViewModel(),
    onNewSale: () -> Unit,
    onInvoiceClick: (String) -> Unit
) {
    val state by viewModel.state.collectAsState()
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()

    val allShops by produceState<List<Shop>>(initialValue = emptyList()) {
        try { value = shopApi.getMyShops().data } catch (_: Exception) {}
    }

    var search by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("ALL") }
    var shopDropdownExpanded by remember { mutableStateOf(false) }
    val selectedShop = allShops.firstOrNull { it.id == activeShopId }
    val hasMultipleShops = allShops.size > 1

    LaunchedEffect(activeShopId) {
        val id = activeShopId
        if (!id.isNullOrBlank()) viewModel.loadInvoices(id)
    }

    // Client-side filter
    val filtered = remember(state.invoices, search, statusFilter) {
        state.invoices.filter { inv ->
            val matchesSearch = search.isBlank() ||
                inv.invoiceNumber.contains(search, ignoreCase = true) ||
                (inv.customerName?.contains(search, ignoreCase = true) == true)
            val matchesStatus = statusFilter == "ALL" || inv.status.equals(statusFilter, ignoreCase = true)
            matchesSearch && matchesStatus
        }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onNewSale,
                containerColor = TealAccent,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "New Sale")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Header
            Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text("Sales", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(
                        "View and manage invoices",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Shop selector (multi-shop)
            if (hasMultipleShops) {
                ExposedDropdownMenuBox(
                    expanded = shopDropdownExpanded,
                    onExpandedChange = { shopDropdownExpanded = !shopDropdownExpanded },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)
                ) {
                    OutlinedTextField(
                        value = selectedShop?.name ?: "Select Shop",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Shop") },
                        leadingIcon = { Icon(Icons.Outlined.Store, null) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = shopDropdownExpanded) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth()
                    )
                    ExposedDropdownMenu(
                        expanded = shopDropdownExpanded,
                        onDismissRequest = { shopDropdownExpanded = false }
                    ) {
                        allShops.forEach { shop ->
                            DropdownMenuItem(
                                text = { Text(shop.name) },
                                onClick = {
                                    shopContextProvider.updateShopId(shop.id)
                                    shopDropdownExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            // Search bar
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                placeholder = { Text("Search by invoice # or customer") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (search.isNotBlank()) {
                        IconButton(onClick = { search = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Status filter chips
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(vertical = 4.dp)
            ) {
                items(STATUS_FILTERS) { status ->
                    FilterChip(
                        selected = statusFilter == status,
                        onClick = { statusFilter = status },
                        label = {
                            Text(
                                if (status == "ALL") "All" else status.replace("_", " "),
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    )
                }
            }

            when {
                activeShopId.isNullOrBlank() -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Loading shop…", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                state.loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = TealAccent)
                    }
                }
                filtered.isEmpty() -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                if (search.isBlank() && statusFilter == "ALL") "No sales yet"
                                else "No matching invoices",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(Modifier.height(8.dp))
                            if (search.isBlank() && statusFilter == "ALL") {
                                Text("Tap + to create your first invoice", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                            } else {
                                TextButton(onClick = { search = ""; statusFilter = "ALL" }) {
                                    Text("Clear filters")
                                }
                            }
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(filtered) { invoice ->
                            InvoiceListCard(invoice = invoice, onClick = { onInvoiceClick(invoice.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InvoiceListCard(invoice: InvoiceListItem, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "INV-${invoice.invoiceNumber}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Surface(
                    color = statusBg(invoice.status),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        invoice.status.replace("_", " "),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = statusColor(invoice.status)
                    )
                }
            }

            if (!invoice.customerName.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    invoice.customerName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    CurrencyUtils.formatRupees(invoice.totalAmount),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = TealAccent
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            invoice.paymentMode.replace("_", " "),
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        formatDate(invoice.invoiceDate),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
