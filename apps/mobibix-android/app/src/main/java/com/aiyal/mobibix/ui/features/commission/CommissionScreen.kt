package com.aiyal.mobibix.ui.features.commission

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.CommissionStatus
import com.aiyal.mobibix.data.network.StaffCommission
import java.text.NumberFormat
import java.util.Locale

private val TealAccent = Color(0xFF00C896)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommissionScreen(
    navController: NavController,
    viewModel: CommissionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currencyFormatter = NumberFormat.getCurrencyInstance(
        Locale.Builder().setLanguage("en").setRegion("IN").build()
    )
    var showPayDialog by remember { mutableStateOf(false) }
    val tabs = listOf(CommissionStatus.PENDING, CommissionStatus.APPROVED, CommissionStatus.PAID)

    LaunchedEffect(Unit) { viewModel.loadCommissions() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Staff Commissions", fontWeight = FontWeight.Bold)
                        Text("Track and pay staff earnings", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            if (uiState.selectedIds.isNotEmpty()) {
                Surface(modifier = Modifier.fillMaxWidth(), shadowElevation = 8.dp) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (uiState.activeFilter == CommissionStatus.PENDING) {
                            OutlinedButton(
                                onClick = { viewModel.approveSelected() },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) { Text("Approve (${uiState.selectedIds.size})") }
                        }
                        if (uiState.activeFilter == CommissionStatus.APPROVED) {
                            Button(
                                onClick = { showPayDialog = true },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = TealAccent),
                                shape = RoundedCornerShape(10.dp)
                            ) { Text("Mark Paid (${uiState.selectedIds.size})") }
                        }
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Summary cards
            val summary = uiState.summary
            if (summary != null) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    CommissionSummaryCard("Pending", summary.totalPending, Color(0xFFF59E0B), currencyFormatter, Modifier.weight(1f))
                    CommissionSummaryCard("Approved", summary.totalApproved, Color(0xFF3B82F6), currencyFormatter, Modifier.weight(1f))
                    CommissionSummaryCard("Paid", summary.totalPaid, TealAccent, currencyFormatter, Modifier.weight(1f))
                }
            }

            // Filter tabs
            ScrollableTabRow(
                selectedTabIndex = tabs.indexOf(uiState.activeFilter),
                edgePadding = 16.dp,
                containerColor = MaterialTheme.colorScheme.surface,
                divider = {}
            ) {
                tabs.forEach { tab ->
                    Tab(
                        selected = uiState.activeFilter == tab,
                        onClick = { viewModel.loadCommissions(tab) },
                        text = { Text(tab.name, fontWeight = if (uiState.activeFilter == tab) FontWeight.Bold else FontWeight.Normal) }
                    )
                }
            }

            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = TealAccent)
            }

            val commissions = summary?.commissions?.filter { it.status == uiState.activeFilter } ?: emptyList()

            if (commissions.isEmpty() && !uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.MonetizationOn, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                        Spacer(Modifier.height(12.dp))
                        Text("No ${uiState.activeFilter?.name?.lowercase()} commissions", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(commissions) { commission ->
                        CommissionItem(
                            commission = commission,
                            isSelected = commission.id in uiState.selectedIds,
                            formatter = currencyFormatter,
                            onToggleSelect = { viewModel.toggleSelection(commission.id) }
                        )
                    }
                    item { Spacer(Modifier.height(72.dp)) }
                }
            }
        }
    }

    if (showPayDialog) {
        PayCommissionDialog(
            count = uiState.selectedIds.size,
            onDismiss = { showPayDialog = false },
            onPay = { method, ref ->
                viewModel.paySelected(method, ref)
                showPayDialog = false
            }
        )
    }
}

@Composable
private fun CommissionSummaryCard(
    label: String,
    amount: Double,
    color: Color,
    formatter: NumberFormat,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(label, style = MaterialTheme.typography.labelSmall, color = color)
            Spacer(Modifier.height(4.dp))
            Text(
                formatter.format(amount),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = color,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun CommissionItem(
    commission: StaffCommission,
    isSelected: Boolean,
    formatter: NumberFormat,
    onToggleSelect: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) TealAccent.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Checkbox(
                checked = isSelected,
                onCheckedChange = { onToggleSelect() },
                colors = CheckboxDefaults.colors(checkedColor = TealAccent)
            )
            Spacer(Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(commission.staffName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                if (!commission.invoiceNumber.isNullOrBlank()) {
                    Text("Invoice: ${commission.invoiceNumber}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(
                    "Sale: ${formatter.format(commission.saleAmount)}  •  ${commission.commissionType.name} ${if (commission.commissionType.name == "PERCENTAGE") "${commission.rate}%" else formatter.format(commission.rate)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(formatter.format(commission.commissionAmount), fontWeight = FontWeight.Bold, color = TealAccent)
                Text(commission.createdAt.take(10), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PayCommissionDialog(
    count: Int,
    onDismiss: () -> Unit,
    onPay: (method: String, reference: String?) -> Unit
) {
    var method by remember { mutableStateOf("CASH") }
    var reference by remember { mutableStateOf("") }
    val methods = listOf("CASH", "UPI", "BANK_TRANSFER")
    var methodExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Pay $count Commission(s)") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ExposedDropdownMenuBox(expanded = methodExpanded, onExpandedChange = { methodExpanded = it }) {
                    OutlinedTextField(
                        value = method, onValueChange = {}, readOnly = true,
                        label = { Text("Payment Method") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(methodExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    )
                    ExposedDropdownMenu(expanded = methodExpanded, onDismissRequest = { methodExpanded = false }) {
                        methods.forEach { m ->
                            DropdownMenuItem(text = { Text(m) }, onClick = { method = m; methodExpanded = false })
                        }
                    }
                }
                OutlinedTextField(
                    value = reference, onValueChange = { reference = it },
                    label = { Text("Reference (optional)") }, modifier = Modifier.fillMaxWidth(), singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onPay(method, reference.ifBlank { null }) },
                colors = ButtonDefaults.buttonColors(containerColor = TealAccent)
            ) { Text("Mark as Paid") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
