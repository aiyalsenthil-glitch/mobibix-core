package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.data.network.ShopProduct

/**
 * AddPartBottomSheet — searches products and adds them to the job.
 * [products] is a list fetched from the product repository (search results).
 * [onSearch] triggers a debounced search call.
 * [onConfirm] returns the selected product ID and quantity.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddPartBottomSheet(
    products: List<ShopProduct>,
    searchLoading: Boolean,
    onDismiss: () -> Unit,
    onSearch: (String) -> Unit,
    onConfirm: (shopProductId: String, quantity: Int) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var selectedProduct by remember { mutableStateOf<ShopProduct?>(null) }
    var qty by remember { mutableStateOf("1") }
    var qtyError by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight(0.9f)
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "Add Part / Material",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            HorizontalDivider()

            when {
                selectedProduct != null -> {
                    // ── Qty picker ──
                    val product = selectedProduct!!
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(product.name, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "₹${(product.salePrice ?: 0) / 100.0} each • Stock: ${product.stockQty}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            IconButton(onClick = { selectedProduct = null }) {
                                Icon(Icons.Outlined.Close, null)
                            }
                        }
                    }

                    OutlinedTextField(
                        value = qty,
                        onValueChange = { qty = it; qtyError = false },
                        label = { Text("Quantity") },
                        leadingIcon = { Icon(Icons.Outlined.Numbers, null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        isError = qtyError,
                        supportingText = if (qtyError) {{ Text("Enter a valid quantity") }} else null,
                        shape = RoundedCornerShape(12.dp)
                    )

                    Button(
                        onClick = {
                            val q = qty.toIntOrNull()
                            if (q == null || q <= 0) {
                                qtyError = true
                            } else {
                                onConfirm(product.id, q)
                                onDismiss()
                            }
                        },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Outlined.Add, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Add to Job", style = MaterialTheme.typography.titleMedium)
                    }
                }

                else -> {
                    // ── Product search ──
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it; onSearch(it) },
                        label = { Text("Search Products") },
                        leadingIcon = { Icon(Icons.Outlined.Search, null) },
                        trailingIcon = if (searchLoading) {{ CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp) }} else null,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp)
                    )

                    if (products.isEmpty() && query.isNotBlank() && !searchLoading) {
                        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp), contentAlignment = Alignment.Center) {
                            Text("No products found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        items(products) { product ->
                            ProductSearchRow(product = product, onClick = { selectedProduct = product })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductSearchRow(product: ShopProduct, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(10.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(product.name, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                Text(
                    "₹${(product.salePrice ?: 0) / 100.0} · Qty: ${product.stockQty}",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (product.stockQty <= 0) MaterialTheme.colorScheme.error
                            else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(Icons.Outlined.ChevronRight, null, tint = MaterialTheme.colorScheme.outlineVariant)
        }
    }
}
