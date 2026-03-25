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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.aiyal.mobibix.util.CurrencyUtils

data class InvoiceItemUi(
    var productId: String? = null,
    var productName: String? = null,
    var quantity: Int = 1,
    var rate: Double = 0.0,
    var gstRate: Double = 0.0,
    var customGstRate: Double? = null,
    var imeis: List<String> = emptyList(),
    var isSerialized: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceItemRow(
    item: InvoiceItemUi,
    onRemove: () -> Unit,
    onItemChange: (InvoiceItemUi) -> Unit,
    gstEnabled: Boolean
) {
    val appliedGstRate = if (item.gstRate == -1.0) item.customGstRate ?: 0.0 else item.gstRate
    val lineBase: Double = item.quantity * item.rate
    val gstAmount: Double = lineBase * appliedGstRate / 100.0
    val lineTotal: Double = lineBase + gstAmount

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        // Product name header + remove
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = item.productName ?: "Unknown Product",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )
            TextButton(onClick = onRemove) {
                Text("Remove", color = MaterialTheme.colorScheme.error)
            }
        }

        Spacer(Modifier.height(8.dp))

        // Qty stepper + Rate field
        Row(verticalAlignment = Alignment.CenterVertically) {
            // Qty stepper
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .border(
                        1.dp,
                        MaterialTheme.colorScheme.outline,
                        RoundedCornerShape(8.dp)
                    )
                    .padding(horizontal = 4.dp)
            ) {
                IconButton(
                    onClick = {
                        val newQty = (item.quantity - 1).coerceAtLeast(1)
                        onItemChange(item.copy(
                            quantity = newQty,
                            imeis = if (item.isSerialized) item.imeis.take(newQty) else emptyList()
                        ))
                    },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Remove, contentDescription = "Decrease", modifier = Modifier.size(16.dp))
                }
                Text(
                    text = item.quantity.toString(),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 8.dp)
                )
                IconButton(
                    onClick = {
                        val newQty = item.quantity + 1
                        onItemChange(item.copy(
                            quantity = newQty,
                            imeis = if (item.isSerialized) {
                                item.imeis + List(newQty - item.imeis.size) { "" }
                            } else emptyList()
                        ))
                    },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Increase", modifier = Modifier.size(16.dp))
                }
            }

            Spacer(Modifier.width(12.dp))

            OutlinedTextField(
                value = item.rate.toString(),
                onValueChange = {
                    onItemChange(item.copy(rate = it.toDoubleOrNull()?.coerceAtLeast(0.0) ?: 0.0))
                },
                label = { Text("Rate (₹)") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true
            )
        }

        // IMEI fields for serialized products
        if (item.isSerialized) {
            Spacer(Modifier.height(8.dp))
            Text("IMEI / Serial Numbers", style = MaterialTheme.typography.labelMedium)
            item.imeis.forEachIndexed { index, imeiValue ->
                OutlinedTextField(
                    value = imeiValue,
                    onValueChange = { newValue ->
                        val newImeis = item.imeis.toMutableList()
                        newImeis[index] = newValue
                        onItemChange(item.copy(imeis = newImeis))
                    },
                    label = { Text("Serial #${index + 1}") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp),
                    singleLine = true
                )
            }
        }

        // GST selector
        if (gstEnabled) {
            Spacer(Modifier.height(8.dp))
            GstSelector(item = item, onItemChange = onItemChange)
        }

        Spacer(Modifier.height(10.dp))

        // Total line
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (gstEnabled && appliedGstRate > 0.0) {
                Text(
                    "GST ${appliedGstRate}%: +${CurrencyUtils.formatRupees(gstAmount)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.weight(1f))
            } else {
                Spacer(Modifier.weight(1f))
            }
            Text(
                "Total: ${CurrencyUtils.formatRupees(lineTotal)}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
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
                    modifier = Modifier
                        .menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable)
                        .fillMaxWidth()
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
                                    else  -> -1.0
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
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true
            )
        }
    }
}
