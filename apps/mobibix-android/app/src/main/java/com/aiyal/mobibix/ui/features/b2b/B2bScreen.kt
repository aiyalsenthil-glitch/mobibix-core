package com.aiyal.mobibix.ui.features.b2b

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
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

// ── ViewModel ─────────────────────────────────────────────────────────────────

data class B2bState(
    val loading: Boolean = true,
    val stats: B2bDashboardStats? = null,
    val customers: List<B2bCustomer> = emptyList(),
    val invoices: List<B2bInvoice> = emptyList(),
    val error: String? = null
)

data class B2bActionState(
    val loading: Boolean = false,
    val success: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class B2bViewModel @Inject constructor(
    private val b2bApi: B2bApi
) : ViewModel() {

    private val _state = MutableStateFlow(B2bState())
    val state = _state.asStateFlow()

    private val _actionState = MutableStateFlow(B2bActionState())
    val actionState = _actionState.asStateFlow()

    fun load(shopId: String) {
        viewModelScope.launch {
            _state.value = B2bState(loading = true)
            try {
                val stats = try { b2bApi.getDashboardStats(shopId) } catch (_: Exception) { B2bDashboardStats() }
                val customers = try { b2bApi.listCustomers(shopId) } catch (_: Exception) { emptyList() }
                val invoices = try { b2bApi.listInvoices(shopId) } catch (_: Exception) { emptyList() }
                _state.value = B2bState(loading = false, stats = stats, customers = customers, invoices = invoices)
            } catch (e: Exception) {
                _state.value = B2bState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun createCustomer(shopId: String, dto: CreateB2bCustomerDto) {
        viewModelScope.launch {
            _actionState.value = B2bActionState(loading = true)
            try {
                b2bApi.createCustomer(shopId, dto)
                _actionState.value = B2bActionState(success = true)
                load(shopId) // Refresh
            } catch (e: Exception) {
                _actionState.value = B2bActionState(error = MobiError.extractMessage(e))
            }
        }
    }

    fun clearAction() { _actionState.value = B2bActionState() }
}

// ── Screen ────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun B2bScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: B2bViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val actionState by viewModel.actionState.collectAsState()
    val activeShopId by shopContextProvider.activeShopIdFlow.collectAsState(initial = null)
    var activeTab by remember { mutableIntStateOf(0) }
    var showAddCustomerDialog by remember { mutableStateOf(false) }

    LaunchedEffect(activeShopId) {
        activeShopId?.let { viewModel.load(it) }
    }

    LaunchedEffect(actionState.success) {
        if (actionState.success) {
            showAddCustomerDialog = false
            viewModel.clearAction()
        }
    }

    if (showAddCustomerDialog) {
        AddB2bCustomerDialog(
            onDismiss = { showAddCustomerDialog = false },
            onConfirm = { dto -> activeShopId?.let { viewModel.createCustomer(it, dto) } },
            loading = actionState.loading,
            error = actionState.error
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("B2B Module", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (activeTab == 0) {
                        IconButton(onClick = { showAddCustomerDialog = true }) {
                            Icon(Icons.Default.Add, contentDescription = "Add B2B customer")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            TabRow(selectedTabIndex = activeTab, containerColor = MaterialTheme.colorScheme.surface) {
                Tab(selected = activeTab == 0, onClick = { activeTab = 0 }, text = { Text("Customers") })
                Tab(selected = activeTab == 1, onClick = { activeTab = 1 }, text = { Text("Invoices") })
                Tab(selected = activeTab == 2, onClick = { activeTab = 2 }, text = { Text("Overview") })
            }

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
                state.error != null -> Box(Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(state.error!!, color = MaterialTheme.colorScheme.error)
                        Button(onClick = { activeShopId?.let { viewModel.load(it) } }) { Text("Retry") }
                    }
                }
                else -> when (activeTab) {
                    0 -> B2bCustomersTab(state.customers, navController)
                    1 -> B2bInvoicesTab(state.invoices)
                    2 -> B2bOverviewTab(state.stats)
                }
            }
        }
    }
}

@Composable
private fun B2bOverviewTab(stats: B2bDashboardStats?) {
    if (stats == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }
    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                B2bStatCard("Total Customers", "${stats.totalCustomers}", MaterialTheme.colorScheme.primary, Modifier.weight(1f))
                B2bStatCard("Active", "${stats.activeCustomers}", Color(0xFF00C896), Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                B2bStatCard("Outstanding", "₹${String.format("%.2f", stats.totalOutstanding)}", Color(0xFFF59E0B), Modifier.weight(1f))
                B2bStatCard("Overdue", "₹${String.format("%.2f", stats.overdueAmount)}", MaterialTheme.colorScheme.error, Modifier.weight(1f))
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                B2bStatCard("This Month", "₹${String.format("%.2f", stats.thisMonthRevenue)}", Color(0xFF3B82F6), Modifier.weight(1f))
                B2bStatCard("Total Revenue", "₹${String.format("%.2f", stats.totalRevenue)}", Color(0xFF8B5CF6), Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun B2bStatCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.08f))
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = color)
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun B2bCustomersTab(customers: List<B2bCustomer>, navController: NavController) {
    if (customers.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Business, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
                Text("No B2B customers yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Tap + to add your first business customer", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
            }
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(customers) { customer ->
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier.size(40.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            customer.businessName.first().uppercaseChar().toString(),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(customer.businessName, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        if (customer.contactPerson != null) Text(customer.contactPerson, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (customer.gstin != null) Text("GSTIN: ${customer.gstin}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        if (customer.outstandingBalance > 0) {
                            Text(
                                "₹${String.format("%.2f", customer.outstandingBalance)}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = if (customer.outstandingBalance > customer.creditLimit * 0.8) MaterialTheme.colorScheme.error else Color(0xFFF59E0B)
                            )
                            Text("Outstanding", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        val statusColor = if (customer.status == "ACTIVE") Color(0xFF00C896) else MaterialTheme.colorScheme.onSurfaceVariant
                        Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                            Text(customer.status, modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp), fontSize = 9.sp, color = statusColor, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun B2bInvoicesTab(invoices: List<B2bInvoice>) {
    if (invoices.isEmpty()) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Receipt, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
                Text("No B2B invoices yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        return
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(invoices) { invoice ->
            val statusColor = when (invoice.status) {
                "PAID" -> Color(0xFF00C896)
                "PARTIALLY_PAID" -> Color(0xFFF59E0B)
                "OVERDUE" -> MaterialTheme.colorScheme.error
                "CONFIRMED" -> Color(0xFF3B82F6)
                else -> MaterialTheme.colorScheme.onSurfaceVariant
            }
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(invoice.invoiceNumber, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        Text(invoice.customerName, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(invoice.date.take(10), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                    }
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            "₹${String.format("%.2f", invoice.totalAmount)}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                            Text(invoice.status, modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp), fontSize = 9.sp, color = statusColor, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AddB2bCustomerDialog(
    onDismiss: () -> Unit,
    onConfirm: (CreateB2bCustomerDto) -> Unit,
    loading: Boolean,
    error: String?
) {
    var businessName by remember { mutableStateOf("") }
    var contactPerson by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var creditLimit by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add B2B Customer", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = businessName, onValueChange = { businessName = it }, label = { Text("Business Name *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = contactPerson, onValueChange = { contactPerson = it }, label = { Text("Contact Person") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = phone, onValueChange = { phone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = gstin, onValueChange = { gstin = it }, label = { Text("GSTIN") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = creditLimit, onValueChange = { creditLimit = it }, label = { Text("Credit Limit (₹)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                if (error != null) Text(error, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onConfirm(CreateB2bCustomerDto(
                        businessName = businessName,
                        contactPerson = contactPerson.takeIf { it.isNotBlank() },
                        phone = phone.takeIf { it.isNotBlank() },
                        gstin = gstin.takeIf { it.isNotBlank() },
                        creditLimit = creditLimit.toDoubleOrNull() ?: 0.0
                    ))
                },
                enabled = businessName.isNotBlank() && !loading
            ) {
                if (loading) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                else Text("Add Customer")
            }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Cancel") } }
    )
}
