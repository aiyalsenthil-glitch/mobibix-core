package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.data.network.ShopProduct
import kotlin.math.roundToInt

data class InvoiceItemUi(
    var productId: String? = null,
    var quantity: Int = 1,
    var rate: Int = 0,
    var gstRate: Float = 0f,
    var customGstRate: Float? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceItemRow(
    item: InvoiceItemUi,
    products: List<ShopProduct>,
    onRemove: () -> Unit,
    gstEnabled: Boolean
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedProduct = products.find { it.id == item.productId }

    val appliedGstRate = if (item.gstRate == -1f) item.customGstRate ?: 0f else item.gstRate
    val lineBase = item.quantity * item.rate
    val gstAmount = (lineBase * appliedGstRate / 100).roundToInt()
    val lineTotal = lineBase + gstAmount

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
            OutlinedTextField(
                value = selectedProduct?.name ?: "Select Product",
                onValueChange = {},
                readOnly = true,
                label = { Text("Product") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth()
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                products.forEach { product ->
                    DropdownMenuItem(
                        text = { Text("${product.name} (Stock: ${product.stockQty})") },
                        onClick = {
                            item.productId = product.id
                            item.rate = product.salePrice ?: 0
                            expanded = false
                        }
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row {
            OutlinedTextField(value = item.quantity.toString(), onValueChange = { item.quantity = it.toIntOrNull()?.coerceAtLeast(1) ?: 1 }, label = { Text("Qty") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            Spacer(Modifier.width(8.dp))
            OutlinedTextField(value = item.rate.toString(), onValueChange = { item.rate = it.toIntOrNull()?.coerceAtLeast(0) ?: 0 }, label = { Text("Rate") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
        }
        if (gstEnabled) {
            Spacer(Modifier.height(8.dp))
            GstSelector(item = item)
        }
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Total: ₹$lineTotal", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            TextButton(onClick = onRemove) {
                Text("Remove")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GstSelector(item: InvoiceItemUi) {
    val gstOptions = listOf("0%", "5%", "18%", "28%", "Other")
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = when (item.gstRate) {
        0f -> "0%"
        5f -> "5%"
        18f -> "18%"
        28f -> "28%"
        else -> "Other"
    }

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(modifier = Modifier.weight(1f)) {
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                OutlinedTextField(
                    value = selectedLabel,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("GST Rate") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    gstOptions.forEach { label ->
                        DropdownMenuItem(
                            text = { Text(label) },
                            onClick = {
                                item.gstRate = when (label) {
                                    "0%" -> 0f
                                    "5%" -> 5f
                                    "18%" -> 18f
                                    "28%" -> 28f
                                    else -> -1f
                                }
                                expanded = false
                            }
                        )
                    }
                }
            }
        }

        if (item.gstRate == -1f) {
            OutlinedTextField(
                value = item.customGstRate?.toString() ?: "",
                onValueChange = { item.customGstRate = it.toFloatOrNull() },
                label = { Text("Custom %") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
            )
        }
    }
}
