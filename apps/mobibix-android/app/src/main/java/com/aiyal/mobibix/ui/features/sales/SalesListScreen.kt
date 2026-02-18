package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Store
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.Shop
import com.aiyal.mobibix.data.network.ShopApi

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

    // Reactively collect the active shop ID — fixes the race condition
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()

    // Load all shops for the selector
    val allShops by produceState<List<Shop>>(initialValue = emptyList()) {
        try { value = shopApi.getMyShops().data } catch (_: Exception) {}
    }

    // Reload invoices whenever the active shop ID changes
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
            FloatingActionButton(onClick = onNewSale) {
                Icon(Icons.Default.Add, contentDescription = "New Sale")
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {

            // Shop selector — only shown when user has multiple shops
            if (hasMultipleShops) {
                ExposedDropdownMenuBox(
                    expanded = shopDropdownExpanded,
                    onExpandedChange = { shopDropdownExpanded = !shopDropdownExpanded },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    OutlinedTextField(
                        value = selectedShop?.name ?: "Select Shop",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Shop") },
                        leadingIcon = { Icon(Icons.Outlined.Store, null) },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = shopDropdownExpanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
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
                        Text("Loading shop…")
                    }
                }
                state.loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                state.invoices.isEmpty() -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No sales yet")
                    }
                }
                else -> {
                    LazyColumn(modifier = Modifier.fillMaxSize()) {
                        items(state.invoices) { invoice ->
                            ListItem(
                                headlineContent = { Text("INV-${invoice.invoiceNumber ?: ""}") },
                                supportingContent = {
                                    Text("₹${invoice.totalAmount} • ${invoice.paymentMode ?: "N/A"}")
                                },
                                trailingContent = {
                                    Text(invoice.status ?: "Unknown")
                                },
                                modifier = Modifier.clickable { onInvoiceClick(invoice.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}
