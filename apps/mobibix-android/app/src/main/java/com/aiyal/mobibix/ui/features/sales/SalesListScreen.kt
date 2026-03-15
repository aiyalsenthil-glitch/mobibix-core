package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.Shop
import com.aiyal.mobibix.data.network.ShopApi

private val TealAccent = Color(0xFF00C896)

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

    LaunchedEffect(activeShopId) {
        val id = activeShopId
        if (!id.isNullOrBlank()) {
            viewModel.loadInvoices(id)
        }
    }

    var shopDropdownExpanded by remember { mutableStateOf(false) }
    val selectedShop = allShops.firstOrNull { it.id == activeShopId }
    val hasMultipleShops = allShops.size > 1

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
            // ── Premium Header ──
            Surface(
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text(
                        "Sales",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "View and manage invoices",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Shop selector
            if (hasMultipleShops) {
                ExposedDropdownMenuBox(
                    expanded = shopDropdownExpanded,
                    onExpandedChange = { shopDropdownExpanded = !shopDropdownExpanded },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    OutlinedTextField(
                        value = selectedShop?.name ?: "Select Shop",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Shop") },
                        leadingIcon = { Icon(Icons.Outlined.Store, null) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = shopDropdownExpanded) },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                            .fillMaxWidth()
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
                state.invoices.isEmpty() -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("No sales yet", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(8.dp))
                            Text("Tap + to create your first invoice", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(state.invoices) { invoice ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onInvoiceClick(invoice.id) },
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            "INV-${invoice.invoiceNumber ?: ""}",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        Text(
                                            "₹${invoice.totalAmount} • ${invoice.paymentMode ?: "N/A"}",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Surface(
                                        color = when (invoice.status?.uppercase()) {
                                            "PAID" -> TealAccent.copy(alpha = 0.12f)
                                            "CANCELLED" -> MaterialTheme.colorScheme.error.copy(alpha = 0.12f)
                                            else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
                                        },
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text(
                                            invoice.status ?: "Unknown",
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.SemiBold,
                                            color = when (invoice.status?.uppercase()) {
                                                "PAID" -> TealAccent
                                                "CANCELLED" -> MaterialTheme.colorScheme.error
                                                else -> MaterialTheme.colorScheme.outline
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
