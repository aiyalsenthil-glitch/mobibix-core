package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiyal.mobibix.data.network.ShopProduct
import com.aiyal.mobibix.util.CurrencyUtils
import kotlin.math.abs

private val avatarColors = listOf(
    Color(0xFF6366F1), Color(0xFF0EA5E9), Color(0xFF10B981),
    Color(0xFFF59E0B), Color(0xFFEF4444), Color(0xFF8B5CF6),
    Color(0xFFEC4899), Color(0xFF14B8A6)
)

private fun avatarColor(name: String) = avatarColors[abs(name.hashCode()) % avatarColors.size]

@Composable
fun ProductGridPanel(
    products: List<ShopProduct>,
    onProductSelected: (ShopProduct) -> Unit,
    modifier: Modifier = Modifier
) {
    var search by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }

    val categories = remember(products) {
        listOf("All") + products.mapNotNull { it.category }.distinct().sorted()
    }

    val filtered = remember(search, selectedCategory, products) {
        products.filter { product ->
            val matchesSearch = search.isBlank() ||
                product.name.contains(search, ignoreCase = true) ||
                (product.sku?.contains(search, ignoreCase = true) == true)
            val matchesCategory = selectedCategory == "All" || product.category == selectedCategory
            matchesSearch && matchesCategory
        }
    }

    Column(modifier = modifier) {
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            placeholder = { Text("Search products...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )

        if (categories.size > 1) {
            val catIndex = categories.indexOf(selectedCategory).coerceAtLeast(0)
            ScrollableTabRow(
                selectedTabIndex = catIndex,
                edgePadding = 12.dp,
                divider = {},
                modifier = Modifier.padding(bottom = 4.dp)
            ) {
                categories.forEach { cat ->
                    Tab(
                        selected = selectedCategory == cat,
                        onClick = { selectedCategory = cat },
                        text = { Text(cat, fontSize = 13.sp) }
                    )
                }
            }
        }

        if (filtered.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "No products found",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 130.dp),
                contentPadding = PaddingValues(12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filtered, key = { it.id }) { product ->
                    ProductCard(product = product, onClick = { onProductSelected(product) })
                }
            }
        }
    }
}

@Composable
private fun ProductCard(product: ShopProduct, onClick: () -> Unit) {
    val outOfStock = product.stockQty <= 0

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !outOfStock, onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (outOfStock)
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            else
                MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (outOfStock) 0.dp else 2.dp
        )
    ) {
        Column(
            modifier = Modifier.padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        if (outOfStock) MaterialTheme.colorScheme.outlineVariant
                        else avatarColor(product.name)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = product.name.take(1).uppercase(),
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(Modifier.height(8.dp))

            Text(
                text = product.name,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                color = if (outOfStock) MaterialTheme.colorScheme.onSurfaceVariant
                        else MaterialTheme.colorScheme.onSurface
            )

            Spacer(Modifier.height(4.dp))

            Text(
                text = CurrencyUtils.formatRupees((product.salePrice ?: 0) / 100.0),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (outOfStock) MaterialTheme.colorScheme.onSurfaceVariant
                        else Color(0xFF6366F1)
            )

            Spacer(Modifier.height(4.dp))

            Surface(
                shape = RoundedCornerShape(4.dp),
                color = when {
                    product.stockQty <= 0 -> MaterialTheme.colorScheme.errorContainer
                    product.stockQty <= 3 -> Color(0xFFFFF3CD)
                    else -> Color(0xFFDCFCE7)
                }
            ) {
                Text(
                    text = if (outOfStock) "Out of Stock" else "Qty: ${product.stockQty}",
                    style = MaterialTheme.typography.labelSmall,
                    color = when {
                        product.stockQty <= 0 -> MaterialTheme.colorScheme.onErrorContainer
                        product.stockQty <= 3 -> Color(0xFF92400E)
                        else -> Color(0xFF166534)
                    },
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}
