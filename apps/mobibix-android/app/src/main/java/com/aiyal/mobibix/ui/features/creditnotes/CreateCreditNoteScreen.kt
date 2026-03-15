package com.aiyal.mobibix.ui.features.creditnotes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.CreateCreditNoteDto
import com.aiyal.mobibix.data.network.CreateCreditNoteItemDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateCreditNoteScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: CreditNoteViewModel = hiltViewModel()
) {
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState()
    val saving by viewModel.saving.collectAsState()

    var type by remember { mutableStateOf("CUSTOMER") }
    var reason by remember { mutableStateOf("SALES_RETURN") }
    var notes by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    data class LineItem(var description: String, var qty: String, var rate: String, var gstRate: String = "0")
    val items = remember { mutableStateListOf(LineItem("", "1", "")) }

    val reasonOptions = listOf("SALES_RETURN", "PURCHASE_RETURN", "PRICE_ADJUSTMENT", "DISCOUNT_POST_SALE", "OVERBILLING", "WARRANTY_CLAIM")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Credit Note", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Type selector
            Text("Type", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("CUSTOMER", "SUPPLIER").forEach { t ->
                    FilterChip(selected = type == t, onClick = { type = t }, label = { Text(t.lowercase().replaceFirstChar { it.uppercase() }) })
                }
            }

            // Reason
            var reasonExpanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(expanded = reasonExpanded, onExpandedChange = { reasonExpanded = it }) {
                OutlinedTextField(
                    value = reason.replace("_", " "),
                    onValueChange = {},
                    label = { Text("Reason") },
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = reasonExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(expanded = reasonExpanded, onDismissRequest = { reasonExpanded = false }) {
                    reasonOptions.forEach { opt ->
                        DropdownMenuItem(
                            text = { Text(opt.replace("_", " ")) },
                            onClick = { reason = opt; reasonExpanded = false }
                        )
                    }
                }
            }

            // Items
            Text("Items", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            items.forEachIndexed { index, item ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Item ${index + 1}", fontWeight = FontWeight.Medium, fontSize = 13.sp, modifier = Modifier.weight(1f))
                            if (items.size > 1) {
                                IconButton(onClick = { items.removeAt(index) }, modifier = Modifier.size(24.dp)) {
                                    Icon(Icons.Default.Delete, contentDescription = "Remove", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                        OutlinedTextField(
                            value = item.description,
                            onValueChange = { items[index] = item.copy(description = it) },
                            label = { Text("Description") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = item.qty,
                                onValueChange = { items[index] = item.copy(qty = it) },
                                label = { Text("Qty") },
                                modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = item.rate,
                                onValueChange = { items[index] = item.copy(rate = it) },
                                label = { Text("Rate (₹)") },
                                modifier = Modifier.weight(1.5f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = item.gstRate,
                                onValueChange = { items[index] = item.copy(gstRate = it) },
                                label = { Text("GST %") },
                                modifier = Modifier.weight(1f),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                singleLine = true
                            )
                        }
                    }
                }
            }

            OutlinedButton(
                onClick = { items.add(LineItem("", "1", "")) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(4.dp))
                Text("Add Item")
            }

            // Notes
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2
            )

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp) }

            Button(
                onClick = {
                    val shopId = activeShopId ?: return@Button
                    val lineItems = items.mapNotNull { i ->
                        val qty = i.qty.toIntOrNull() ?: return@mapNotNull null
                        val rate = i.rate.toDoubleOrNull() ?: return@mapNotNull null
                        val gst = i.gstRate.toDoubleOrNull() ?: 0.0
                        val gstAmt = (rate * qty) * (gst / 100.0)
                        CreateCreditNoteItemDto(
                            description = i.description.ifBlank { return@mapNotNull null },
                            quantity = qty, rate = rate, gstRate = gst,
                            gstAmount = gstAmt, lineTotal = (rate * qty) + gstAmt
                        )
                    }
                    if (lineItems.isEmpty()) { error = "Add at least one valid item"; return@Button }
                    viewModel.createCreditNote(
                        shopId,
                        CreateCreditNoteDto(type = type, reason = reason, notes = notes.ifBlank { null }, items = lineItems),
                        onSuccess = { navController.popBackStack() },
                        onError = { error = it }
                    )
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                enabled = !saving,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                if (saving) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                else Text("Create Credit Note", fontWeight = FontWeight.SemiBold)
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}
