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

data class InvoiceItemUi(
    var productId: String? = null,
    var productName: String? = null,
    var quantity: Int = 1,
    var rate: Double = 0.0,          // Rate in RUPEES (salePrice / 100) — NOT Paisa
    var gstRate: Double = 0.0,       // GST rate as percentage from product (not hardcoded)
    var customGstRate: Double? = null,
    var imeis: List<String> = emptyList(),
    var isSerialized: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceItemRow(
    item: InvoiceItemUi,
    products: List<ShopProduct>,
    onRemove: () -> Unit,
    onItemChange: (InvoiceItemUi) -> Unit,
    gstEnabled: Boolean
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedProduct = products.find { it.id == item.productId }

    val appliedGstRate = if (item.gstRate == -1.0) item.customGstRate ?: 0.0 else item.gstRate
    val lineBase: Double = item.quantity * item.rate
    val gstAmount: Double = lineBase * appliedGstRate / 100.0
    val lineTotal: Double = lineBase + gstAmount

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
                modifier = Modifier.menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable).fillMaxWidth()
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                products.forEach { product ->
                    DropdownMenuItem(
                        text = { Text("${product.name} (Stock: ${product.stockQty})") },
                        onClick = {
                            onItemChange(item.copy(
                                productId = product.id,
                                productName = product.name,
                                // A1 FIX: salePrice is in Paisa — divide by 100 to get Rupees for backend
                                rate = (product.salePrice ?: 0) / 100.0,
                                // A8 FIX: use product-specific gstRate, fallback to 0 if not set
                                gstRate = product.gstRate ?: 0.0,
                                customGstRate = null,
                                isSerialized = product.isSerialized,
                                imeis = if (product.isSerialized) List(item.quantity) { "" } else emptyList()
                            ))
                            expanded = false
                        }
                    )
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        Row {
            OutlinedTextField(
                value = item.quantity.toString(), 
                onValueChange = { 
                    val newQty = it.toIntOrNull()?.coerceAtLeast(1) ?: 1
                    onItemChange(item.copy(
                        quantity = newQty,
                        imeis = if (item.isSerialized) {
                            val current = item.imeis.toMutableList()
                            if (newQty > current.size) {
                                current.addAll(List(newQty - current.size) { "" })
                            } else if (newQty < current.size) {
                                current.subList(0, newQty)
                            }
                            current
                        } else emptyList()
                    )) 
                }, 
                label = { Text("Qty") }, 
                modifier = Modifier.weight(1f), 
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
            Spacer(Modifier.width(8.dp))
            OutlinedTextField(value = item.rate.toString(), onValueChange = { onItemChange(item.copy(rate = it.toDoubleOrNull()?.coerceAtLeast(0.0) ?: 0.0)) }, label = { Text("Rate (₹)") }, modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
        }

        if (item.isSerialized) {
            Spacer(Modifier.height(8.dp))
            Text("Enter IMEI/Serial Numbers", style = MaterialTheme.typography.labelMedium)
            item.imeis.forEachIndexed { imeiIndex, imeiValue ->
                OutlinedTextField(
                    value = imeiValue,
                    onValueChange = { newValue ->
                        val newImeis = item.imeis.toMutableList()
                        newImeis[imeiIndex] = newValue
                        onItemChange(item.copy(imeis = newImeis))
                    },
                    label = { Text("Serial #${imeiIndex + 1}") },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                    singleLine = true
                )
            }
        }
        if (gstEnabled) {
            Spacer(Modifier.height(8.dp))
            GstSelector(item = item, onItemChange = onItemChange)
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
private fun GstSelector(item: InvoiceItemUi, onItemChange: (InvoiceItemUi) -> Unit) {
    val gstOptions = listOf("0%", "5%", "12%", "18%", "28%", "Other")
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = when (item.gstRate) {
        0.0  -> "0%"
        5.0  -> "5%"
        12.0 -> "12%"
        18.0 -> "18%"
        28.0 -> "28%"
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
                    modifier = Modifier.menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable).fillMaxWidth()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    gstOptions.forEach { label ->
                        DropdownMenuItem(
                            text = { Text(label) },
                            onClick = {
                                val newGstRate = when (label) {
                                    "0%"  -> 0.0
                                    "5%"  -> 5.0
                                    "12%" -> 12.0
                                    "18%" -> 18.0
                                    "28%" -> 28.0
                                    else  -> -1.0  // "Other" sentinel
                                }
                                onItemChange(item.copy(gstRate = newGstRate))
                                expanded = false
                            }
                        )
                    }
                }
            }
        }

        if (item.gstRate == -1.0) {
            OutlinedTextField(
                value = item.customGstRate?.toString() ?: "",
                onValueChange = { onItemChange(item.copy(customGstRate = it.toDoubleOrNull())) },
                label = { Text("Custom %") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
            )
        }
    }
}
