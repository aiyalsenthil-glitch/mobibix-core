package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.foundation.layout.*
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

/**
 * AddAdvanceBottomSheet — records an advance payment against a job.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddAdvanceBottomSheet(
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, mode: String) -> Unit
) {
    val modes = listOf("CASH", "UPI", "CARD")
    var amount by remember { mutableStateOf("") }
    var selectedMode by remember { mutableStateOf("CASH") }
    var amountError by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                "Record Advance Payment",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            HorizontalDivider()

            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it; amountError = false },
                label = { Text("Amount (₹)") },
                leadingIcon = { Icon(Icons.Outlined.CurrencyRupee, null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                isError = amountError,
                supportingText = if (amountError) {{ Text("Enter a valid amount") }} else null,
                shape = RoundedCornerShape(12.dp)
            )

            Text("Payment Mode", style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                modes.forEach { mode ->
                    FilterChip(
                        selected = selectedMode == mode,
                        onClick = { selectedMode = mode },
                        label = { Text(mode) }
                    )
                }
            }

            Button(
                onClick = {
                    val parsed = amount.toDoubleOrNull()
                    if (parsed == null || parsed <= 0) {
                        amountError = true
                    } else {
                        onConfirm(parsed, selectedMode)
                        onDismiss()
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Outlined.CurrencyRupee, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Record Advance", style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}
