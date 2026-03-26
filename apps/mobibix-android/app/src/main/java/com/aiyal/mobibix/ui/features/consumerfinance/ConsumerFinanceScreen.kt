package com.aiyal.mobibix.ui.features.consumerfinance

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── ViewModel ───────────────────────────────────────────────────────────────

data class ConsumerFinanceState(
    val loading: Boolean = false,
    val summary: FinanceSummary? = null,
    val emiList: List<EmiApplication> = emptyList(),
    val installmentList: List<InstallmentPlan> = emptyList(),
    val error: String? = null,
    val saving: Boolean = false
)

@HiltViewModel
class ConsumerFinanceViewModel @Inject constructor(
    private val api: ConsumerFinanceApi,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _state = MutableStateFlow(ConsumerFinanceState())
    val state = _state.asStateFlow()

    fun loadAll() {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val summary = try { api.getSummary(shopId) } catch (_: Exception) { FinanceSummary() }
                val emiList = api.getEmiApplications(shopId)
                val installmentList = api.getInstallmentPlans(shopId)
                _state.value = _state.value.copy(
                    loading = false, summary = summary,
                    emiList = emiList, installmentList = installmentList
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun createEmi(request: CreateEmiRequest, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true)
            try {
                api.createEmi(request)
                _state.value = _state.value.copy(saving = false)
                onSuccess()
                loadAll()
            } catch (e: Exception) {
                _state.value = _state.value.copy(saving = false)
                onError(MobiError.extractMessage(e))
            }
        }
    }

    fun createInstallment(request: CreateInstallmentRequest, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true)
            try {
                api.createInstallmentPlan(request)
                _state.value = _state.value.copy(saving = false)
                onSuccess()
                loadAll()
            } catch (e: Exception) {
                _state.value = _state.value.copy(saving = false)
                onError(MobiError.extractMessage(e))
            }
        }
    }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

private val EMI_PROVIDERS = listOf("Bajaj Finserv", "Home Credit", "HDFC", "ICICI",
    "Axis Bank", "Kotak", "TVS Credit", "Other")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConsumerFinanceScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: ConsumerFinanceViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val shopId = shopContextProvider.getActiveShopId() ?: ""
    var selectedTab by remember { mutableIntStateOf(0) }
    var showCreateEmi by remember { mutableStateOf(false) }
    var showCreateInstallment by remember { mutableStateOf(false) }
    val snackbarState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { viewModel.loadAll() }

    if (showCreateEmi) {
        CreateEmiDialog(
            shopId = shopId, saving = state.saving,
            onDismiss = { showCreateEmi = false },
            onCreate = { req ->
                viewModel.createEmi(req,
                    onSuccess = { showCreateEmi = false },
                    onError = { msg -> scope.launch { snackbarState.showSnackbar(msg) } }
                )
            }
        )
    }

    if (showCreateInstallment) {
        CreateInstallmentDialog(
            shopId = shopId, saving = state.saving,
            onDismiss = { showCreateInstallment = false },
            onCreate = { req ->
                viewModel.createInstallment(req,
                    onSuccess = { showCreateInstallment = false },
                    onError = { msg -> scope.launch { snackbarState.showSnackbar(msg) } }
                )
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Consumer Finance", fontWeight = FontWeight.Bold)
                        Text("EMI & Installment Plans", style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadAll() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                text = { Text(if (selectedTab == 0) "New EMI" else "New Plan") },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                onClick = { if (selectedTab == 0) showCreateEmi = true else showCreateInstallment = true }
            )
        },
        snackbarHost = { SnackbarHost(snackbarState) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Summary cards
            state.summary?.let { summary ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    SummaryChip(
                        label = "EMI Pending",
                        value = "${summary.emi.pending.count}",
                        color = Color(0xFFF59E0B),
                        modifier = Modifier.weight(1f)
                    )
                    SummaryChip(
                        label = "EMI Approved",
                        value = "${summary.emi.approved.count}",
                        color = Color(0xFF00C896),
                        modifier = Modifier.weight(1f)
                    )
                    SummaryChip(
                        label = "Overdue Slots",
                        value = "${summary.installment.overdueSlots}",
                        color = if (summary.installment.overdueSlots > 0) MaterialTheme.colorScheme.error else Color(0xFF6366F1),
                        modifier = Modifier.weight(1f)
                    )
                    SummaryChip(
                        label = "Active Plans",
                        value = "${summary.installment.activePlans.count}",
                        color = Color(0xFF6366F1),
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            if (state.loading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("EMI (${state.emiList.size})") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Installment (${state.installmentList.size})") }
                )
            }

            if (state.error != null) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp))
            }

            when (selectedTab) {
                0 -> EmiTab(emiList = state.emiList)
                1 -> InstallmentTab(installmentList = state.installmentList)
            }
        }
    }
}

@Composable
private fun SummaryChip(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f))
    ) {
        Column(
            modifier = Modifier.padding(10.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = color)
            Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1)
        }
    }
}

@Composable
private fun EmiTab(emiList: List<EmiApplication>) {
    if (emiList.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.CreditCard, contentDescription = null,
                    modifier = Modifier.size(56.dp),
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
                Text("No EMI applications", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(emiList) { emi -> EmiCard(emi) }
    }
}

@Composable
private fun EmiCard(emi: EmiApplication) {
    val statusColor = when (emi.status) {
        "APPROVED" -> Color(0xFF00C896)
        "SETTLED" -> Color(0xFF3B82F6)
        "REJECTED", "CANCELLED" -> MaterialTheme.colorScheme.error
        else -> Color(0xFFF59E0B)
    }
    Card(
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(emi.emiNumber, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text(emi.financeProvider, style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (!emi.applicationRef.isNullOrBlank()) {
                        Text("Ref: ${emi.applicationRef}", fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                    }
                }
                Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                    Text(emi.status, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        fontSize = 10.sp, color = statusColor, fontWeight = FontWeight.Bold)
                }
            }
            HorizontalDivider()
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                LabelValue("Loan Amount", "₹${String.format("%.0f", emi.loanAmount / 100.0)}")
                LabelValue("Monthly EMI", "₹${String.format("%.0f", emi.monthlyEmi / 100.0)}")
                LabelValue("Tenure", "${emi.tenureMonths} mo")
            }
        }
    }
}

@Composable
private fun InstallmentTab(installmentList: List<InstallmentPlan>) {
    if (installmentList.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.CalendarMonth, contentDescription = null,
                    modifier = Modifier.size(56.dp),
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
                Text("No installment plans", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(installmentList) { plan -> InstallmentCard(plan) }
    }
}

@Composable
private fun InstallmentCard(plan: InstallmentPlan) {
    val statusColor = when (plan.status) {
        "COMPLETED" -> Color(0xFF00C896)
        "DEFAULTED", "CANCELLED" -> MaterialTheme.colorScheme.error
        else -> Color(0xFF6366F1)
    }
    val paidSlots = plan.slots.count { it.status == "PAID" || it.status == "PARTIALLY_PAID" }
    val overdueSlots = plan.slots.count { it.status == "OVERDUE" }

    Card(
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(plan.planNumber, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    if (!plan.customerName.isNullOrBlank()) {
                        Text(plan.customerName, style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (overdueSlots > 0) {
                        Surface(shape = RoundedCornerShape(20.dp),
                            color = MaterialTheme.colorScheme.error.copy(alpha = 0.12f)) {
                            Text("$overdueSlots overdue",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                fontSize = 10.sp, color = MaterialTheme.colorScheme.error,
                                fontWeight = FontWeight.Bold)
                        }
                    }
                    Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                        Text(plan.status, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp, color = statusColor, fontWeight = FontWeight.Bold)
                    }
                }
            }
            HorizontalDivider()
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                LabelValue("Total", "₹${String.format("%.0f", plan.totalAmount / 100.0)}")
                LabelValue("Remaining", "₹${String.format("%.0f", plan.remainingAmount / 100.0)}")
                LabelValue("Monthly", "₹${String.format("%.0f", plan.monthlyAmount / 100.0)}")
                LabelValue("Progress", "${paidSlots}/${plan.tenureMonths}")
            }
            if (plan.slots.isNotEmpty()) {
                LinearProgressIndicator(
                    progress = { paidSlots.toFloat() / plan.tenureMonths.coerceAtLeast(1) },
                    modifier = Modifier.fillMaxWidth(),
                    color = statusColor
                )
            }
        }
    }
}

@Composable
private fun LabelValue(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
    }
}

// ─── Create Dialogs ──────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateEmiDialog(
    shopId: String,
    saving: Boolean,
    onDismiss: () -> Unit,
    onCreate: (CreateEmiRequest) -> Unit
) {
    var provider by remember { mutableStateOf("") }
    var providerExpanded by remember { mutableStateOf(false) }
    var appRef by remember { mutableStateOf("") }
    var loanAmount by remember { mutableStateOf("") }
    var downPayment by remember { mutableStateOf("0") }
    var tenure by remember { mutableStateOf("") }
    var monthlyEmi by remember { mutableStateOf("") }
    var interestRate by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New EMI Application", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                ExposedDropdownMenuBox(
                    expanded = providerExpanded,
                    onExpandedChange = { providerExpanded = it }
                ) {
                    OutlinedTextField(
                        value = provider,
                        onValueChange = { provider = it },
                        label = { Text("Finance Provider *") },
                        modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryEditable),
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = providerExpanded) },
                        singleLine = true
                    )
                    ExposedDropdownMenu(
                        expanded = providerExpanded,
                        onDismissRequest = { providerExpanded = false }
                    ) {
                        EMI_PROVIDERS.forEach { p ->
                            DropdownMenuItem(
                                text = { Text(p) },
                                onClick = { provider = p; providerExpanded = false }
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = appRef,
                    onValueChange = { appRef = it },
                    label = { Text("Application Ref") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = loanAmount,
                        onValueChange = { loanAmount = it },
                        label = { Text("Loan Amount ₹ *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                    OutlinedTextField(
                        value = downPayment,
                        onValueChange = { downPayment = it },
                        label = { Text("Down Payment ₹") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = tenure,
                        onValueChange = { tenure = it },
                        label = { Text("Tenure (months) *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                    OutlinedTextField(
                        value = monthlyEmi,
                        onValueChange = { monthlyEmi = it },
                        label = { Text("Monthly EMI ₹ *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                }
                OutlinedTextField(
                    value = interestRate,
                    onValueChange = { interestRate = it },
                    label = { Text("Interest Rate % (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val loan = ((loanAmount.toDoubleOrNull() ?: 0.0) * 100).toLong()
                    val dp = ((downPayment.toDoubleOrNull() ?: 0.0) * 100).toLong()
                    val emi = ((monthlyEmi.toDoubleOrNull() ?: 0.0) * 100).toLong()
                    onCreate(CreateEmiRequest(
                        shopId = shopId,
                        financeProvider = provider.trim(),
                        applicationRef = appRef.takeIf { it.isNotBlank() },
                        loanAmount = loan,
                        downPayment = dp,
                        tenureMonths = tenure.toIntOrNull() ?: 0,
                        monthlyEmi = emi,
                        interestRate = interestRate.toDoubleOrNull()
                    ))
                },
                enabled = !saving && provider.isNotBlank() && loanAmount.isNotBlank()
                    && tenure.isNotBlank() && monthlyEmi.isNotBlank()
            ) {
                if (saving) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                else Text("Save")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateInstallmentDialog(
    shopId: String,
    saving: Boolean,
    onDismiss: () -> Unit,
    onCreate: (CreateInstallmentRequest) -> Unit
) {
    var customerId by remember { mutableStateOf("") }
    var totalAmount by remember { mutableStateOf("") }
    var downPayment by remember { mutableStateOf("0") }
    var tenure by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Installment Plan", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = customerId,
                    onValueChange = { customerId = it },
                    label = { Text("Customer ID *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = totalAmount,
                        onValueChange = { totalAmount = it },
                        label = { Text("Total Amount ₹ *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                    OutlinedTextField(
                        value = downPayment,
                        onValueChange = { downPayment = it },
                        label = { Text("Down Pay ₹") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                }
                OutlinedTextField(
                    value = tenure,
                    onValueChange = { tenure = it },
                    label = { Text("Tenure (months) *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    supportingText = {
                        val total = totalAmount.toDoubleOrNull() ?: 0.0
                        val dp = downPayment.toDoubleOrNull() ?: 0.0
                        val t = tenure.toIntOrNull() ?: 0
                        if (t > 0 && total > dp) {
                            Text("Monthly: ₹${String.format("%.0f", (total - dp) / t)}")
                        }
                    }
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 2
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val total = ((totalAmount.toDoubleOrNull() ?: 0.0) * 100).toLong()
                    val dp = ((downPayment.toDoubleOrNull() ?: 0.0) * 100).toLong()
                    onCreate(CreateInstallmentRequest(
                        shopId = shopId,
                        customerId = customerId.trim(),
                        totalAmount = total,
                        downPayment = dp,
                        tenureMonths = tenure.toIntOrNull() ?: 0,
                        notes = notes.takeIf { it.isNotBlank() }
                    ))
                },
                enabled = !saving && customerId.isNotBlank() && totalAmount.isNotBlank()
                    && tenure.isNotBlank()
            ) {
                if (saving) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                else Text("Save")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
