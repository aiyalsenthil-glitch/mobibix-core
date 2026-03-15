package com.aiyal.mobibix.ui.features.creditnotes

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import android.content.Intent
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreditNoteDetailScreen(
    shopId: String,
    creditNoteId: String,
    navController: NavController,
    viewModel: CreditNoteViewModel = hiltViewModel()
) {
    val state by viewModel.detailState.collectAsState()
    val context = LocalContext.current
    var showVoidDialog by remember { mutableStateOf(false) }
    var menuExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(creditNoteId) { viewModel.loadCreditNote(shopId, creditNoteId) }

    LaunchedEffect(state.actionSuccess) {
        if (state.actionSuccess != null) viewModel.clearActionState()
    }

    if (showVoidDialog) {
        var reason by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showVoidDialog = false },
            title = { Text("Void Credit Note") },
            text = {
                Column {
                    Text("Please provide a reason for voiding this credit note.")
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = reason, onValueChange = { reason = it }, label = { Text("Reason") }, modifier = Modifier.fillMaxWidth())
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.voidCreditNote(shopId, creditNoteId, reason)
                        showVoidDialog = false
                    },
                    enabled = reason.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) { Text("Void") }
            },
            dismissButton = { OutlinedButton(onClick = { showVoidDialog = false }) { Text("Cancel") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(state.creditNote?.creditNoteNo ?: "Credit Note", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    state.creditNote?.let { note ->
                        IconButton(onClick = {
                            val text = buildString {
                                appendLine("CREDIT NOTE: ${note.creditNoteNo}")
                                appendLine("Type: ${note.type}  |  Reason: ${note.reason.replace("_", " ")}")
                                note.customerName?.let { appendLine("Customer: $it") }
                                note.supplierName?.let { appendLine("Supplier: $it") }
                                note.invoiceNumber?.let { appendLine("Ref Invoice: $it") }
                                appendLine("Date: ${note.date.take(10)}")
                                appendLine("Status: ${note.status}")
                                appendLine("─────────────────")
                                note.items?.forEach { item ->
                                    appendLine("${item.description}")
                                    appendLine("  ${item.quantity} × ₹${String.format("%.2f", item.rate)} = ₹${String.format("%.2f", item.lineTotal)}")
                                }
                                appendLine("─────────────────")
                                appendLine("Subtotal: ₹${String.format("%.2f", note.subTotal)}")
                                if (note.gstAmount > 0) appendLine("GST: ₹${String.format("%.2f", note.gstAmount)}")
                                appendLine("TOTAL: ₹${String.format("%.2f", note.totalAmount)}")
                                note.notes?.let { appendLine("\nNotes: $it") }
                            }
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, text)
                                putExtra(Intent.EXTRA_SUBJECT, "Credit Note ${note.creditNoteNo}")
                            }
                            context.startActivity(Intent.createChooser(intent, "Print / Share Credit Note"))
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "Share credit note")
                        }
                    }
                    state.creditNote?.let { note ->
                        if (note.status == "DRAFT" || note.status == "ISSUED") {
                            Box {
                                IconButton(onClick = { menuExpanded = true }) {
                                    Icon(Icons.Default.MoreVert, contentDescription = "More")
                                }
                                DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }) {
                                    if (note.status == "DRAFT") {
                                        DropdownMenuItem(text = { Text("Issue") }, onClick = {
                                            menuExpanded = false
                                            viewModel.issueCreditNote(shopId, creditNoteId)
                                        })
                                    }
                                    DropdownMenuItem(text = { Text("Void", color = MaterialTheme.colorScheme.error) }, onClick = {
                                        menuExpanded = false
                                        showVoidDialog = true
                                    })
                                }
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
            state.error != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }
            state.creditNote != null -> {
                val note = state.creditNote!!
                LazyColumn(
                    modifier = Modifier.padding(padding).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        // Header card
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                DetailRow("Type", note.type)
                                DetailRow("Reason", note.reason.replace("_", " "))
                                if (note.customerName != null) DetailRow("Customer", note.customerName)
                                if (note.supplierName != null) DetailRow("Supplier", note.supplierName)
                                if (note.invoiceNumber != null) DetailRow("Linked Invoice", note.invoiceNumber)
                                DetailRow("Date", note.date.take(10))
                                DetailRow("Status", note.status.replace("_", " "))
                            }
                        }
                    }

                    item {
                        // Totals card
                        Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Summary", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                HorizontalDivider()
                                DetailRow("Subtotal", "₹${String.format("%.2f", note.subTotal)}")
                                DetailRow("GST", "₹${String.format("%.2f", note.gstAmount)}")
                                DetailRow("Total", "₹${String.format("%.2f", note.totalAmount)}", bold = true)
                                if (note.appliedAmount > 0) DetailRow("Applied", "₹${String.format("%.2f", note.appliedAmount)}", color = Color(0xFF00C896))
                                val remaining = note.totalAmount - note.appliedAmount - note.refundedAmount
                                if (remaining > 0) DetailRow("Remaining", "₹${String.format("%.2f", remaining)}", color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }

                    note.items?.let { items ->
                        item { Text("Items", fontWeight = FontWeight.Bold, fontSize = 14.sp) }
                        items(items) { item ->
                            Card(shape = RoundedCornerShape(8.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.description, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                                        Text("Qty: ${item.quantity} × ₹${String.format("%.2f", item.rate)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text("₹${String.format("%.2f", item.lineTotal)}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    if (note.notes != null) {
                        item {
                            Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("Notes", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Spacer(Modifier.height(4.dp))
                                    Text(note.notes, fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    // Action error/success
                    state.actionError?.let { err ->
                        item { Text(err, color = MaterialTheme.colorScheme.error, fontSize = 13.sp) }
                    }
                    if (state.actionLoading) {
                        item { LinearProgressIndicator(modifier = Modifier.fillMaxWidth()) }
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String, bold: Boolean = false, color: Color = Color.Unspecified) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 13.sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
            color = if (color != Color.Unspecified) color else MaterialTheme.colorScheme.onSurface)
    }
}
