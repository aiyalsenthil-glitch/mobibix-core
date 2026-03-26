package com.aiyal.mobibix.ui.features.tradein

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
import com.aiyal.mobibix.data.network.CreateTradeInRequest
import com.aiyal.mobibix.data.network.TradeIn
import com.aiyal.mobibix.data.network.TradeInApi
import com.aiyal.mobibix.data.network.UpdateTradeInStatusRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── ViewModel ───────────────────────────────────────────────────────────────

data class TradeInState(
    val loading: Boolean = false,
    val tradeIns: List<TradeIn> = emptyList(),
    val error: String? = null,
    val saving: Boolean = false
)

@HiltViewModel
class TradeInViewModel @Inject constructor(
    private val api: TradeInApi,
    private val shopContextProvider: ShopContextProvider
) : ViewModel() {

    private val _state = MutableStateFlow(TradeInState())
    val state = _state.asStateFlow()

    fun load(statusFilter: String? = null) {
        val shopId = shopContextProvider.getActiveShopId() ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            try {
                val list = api.getTradeIns(shopId, statusFilter)
                _state.value = _state.value.copy(loading = false, tradeIns = list)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun create(
        request: CreateTradeInRequest,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true)
            try {
                api.createTradeIn(request)
                _state.value = _state.value.copy(saving = false)
                onSuccess()
                load()
            } catch (e: Exception) {
                _state.value = _state.value.copy(saving = false)
                onError(MobiError.extractMessage(e))
            }
        }
    }

    fun updateStatus(id: String, status: String) {
        viewModelScope.launch {
            try {
                api.updateStatus(id, UpdateTradeInStatusRequest(status))
                load()
            } catch (_: Exception) { }
        }
    }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

private val STATUS_FILTERS = listOf("ALL", "DRAFT", "OFFERED", "ACCEPTED", "REJECTED", "COMPLETED")
private val GRADES = listOf("EXCELLENT", "GOOD", "FAIR", "POOR")
private val COMMON_BRANDS = listOf("Apple", "Samsung", "Xiaomi", "OnePlus", "Vivo", "Oppo", "Realme", "Other")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TradeInScreen(
    navController: NavController,
    shopContextProvider: ShopContextProvider,
    viewModel: TradeInViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val shopId = shopContextProvider.getActiveShopId() ?: ""
    var statusFilter by remember { mutableStateOf("ALL") }
    var showCreateSheet by remember { mutableStateOf(false) }
    val snackbarState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(statusFilter) {
        viewModel.load(statusFilter.takeIf { it != "ALL" })
    }

    if (showCreateSheet) {
        CreateTradeInSheet(
            shopId = shopId,
            saving = state.saving,
            onDismiss = { showCreateSheet = false },
            onCreate = { request ->
                viewModel.create(
                    request,
                    onSuccess = { showCreateSheet = false },
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
                        Text("Trade-in / Buyback", fontWeight = FontWeight.Bold)
                        Text("${state.tradeIns.size} records", style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                text = { Text("New Trade-in") },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                onClick = { showCreateSheet = true }
            )
        },
        snackbarHost = { SnackbarHost(snackbarState) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Status filter chips
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(STATUS_FILTERS) { s ->
                    FilterChip(
                        selected = statusFilter == s,
                        onClick = { statusFilter = s },
                        label = { Text(s, style = MaterialTheme.typography.labelSmall) }
                    )
                }
            }

            if (state.loading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (state.error != null) {
                Text(state.error!!, color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp))
            }

            if (state.tradeIns.isEmpty() && !state.loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Devices, contentDescription = null,
                            modifier = Modifier.size(56.dp),
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f))
                        Text("No trade-ins found", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Tap + to record a device buyback",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(state.tradeIns) { tradeIn ->
                        TradeInCard(tradeIn = tradeIn, onStatusUpdate = { newStatus ->
                            viewModel.updateStatus(tradeIn.id, newStatus)
                        })
                    }
                }
            }
        }
    }
}

@Composable
private fun TradeInCard(tradeIn: TradeIn, onStatusUpdate: (String) -> Unit) {
    val statusColor = when (tradeIn.status) {
        "ACCEPTED", "COMPLETED" -> Color(0xFF00C896)
        "OFFERED" -> Color(0xFF6366F1)
        "DRAFT" -> Color(0xFFF59E0B)
        "REJECTED" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val gradeColor = when (tradeIn.conditionGrade) {
        "EXCELLENT" -> Color(0xFF00C896)
        "GOOD" -> Color(0xFF6366F1)
        "FAIR" -> Color(0xFFF59E0B)
        "POOR" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    var showActions by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(tradeIn.tradeInNumber, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("${tradeIn.deviceBrand} ${tradeIn.deviceModel}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (!tradeIn.deviceImei.isNullOrBlank()) {
                        Text("IMEI: ${tradeIn.deviceImei}", fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
                    }
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.12f)) {
                        Text(tradeIn.status, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp, color = statusColor, fontWeight = FontWeight.Bold)
                    }
                    Surface(shape = RoundedCornerShape(20.dp), color = gradeColor.copy(alpha = 0.12f)) {
                        Text(tradeIn.conditionGrade, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                            fontSize = 10.sp, color = gradeColor, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            HorizontalDivider()

            // Customer + values row
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Customer", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(tradeIn.customerName, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                    Text(tradeIn.customerPhone, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Offered", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("₹${String.format("%.0f", tradeIn.offeredValue)}", fontWeight = FontWeight.Bold,
                        fontSize = 15.sp, color = Color(0xFF6366F1))
                    Text("Market: ₹${String.format("%.0f", tradeIn.marketValue)}", fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            // Action buttons for non-terminal statuses
            if (tradeIn.status == "DRAFT") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { onStatusUpdate("OFFERED") },
                        modifier = Modifier.weight(1f)
                    ) { Text("Mark Offered", style = MaterialTheme.typography.labelSmall) }
                    OutlinedButton(
                        onClick = { onStatusUpdate("REJECTED") },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) { Text("Reject", style = MaterialTheme.typography.labelSmall) }
                }
            } else if (tradeIn.status == "OFFERED") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { onStatusUpdate("ACCEPTED") },
                        modifier = Modifier.weight(1f)
                    ) { Text("Accept", style = MaterialTheme.typography.labelSmall) }
                    OutlinedButton(
                        onClick = { onStatusUpdate("REJECTED") },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) { Text("Reject", style = MaterialTheme.typography.labelSmall) }
                }
            } else if (tradeIn.status == "ACCEPTED") {
                Button(
                    onClick = { onStatusUpdate("COMPLETED") },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("Mark Completed") }
            }
        }
    }
}

// ─── Create Sheet ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateTradeInSheet(
    shopId: String,
    saving: Boolean,
    onDismiss: () -> Unit,
    onCreate: (CreateTradeInRequest) -> Unit
) {
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var deviceBrand by remember { mutableStateOf("") }
    var deviceModel by remember { mutableStateOf("") }
    var deviceImei by remember { mutableStateOf("") }
    var deviceStorage by remember { mutableStateOf("") }
    var conditionGrade by remember { mutableStateOf("GOOD") }
    var marketValue by remember { mutableStateOf("") }
    var offeredValue by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var brandExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Trade-in", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 500.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = customerName,
                    onValueChange = { customerName = it },
                    label = { Text("Customer Name *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = customerPhone,
                    onValueChange = { customerPhone = it },
                    label = { Text("Phone *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                )
                // Brand dropdown
                ExposedDropdownMenuBox(
                    expanded = brandExpanded,
                    onExpandedChange = { brandExpanded = it }
                ) {
                    OutlinedTextField(
                        value = deviceBrand,
                        onValueChange = { deviceBrand = it },
                        label = { Text("Brand *") },
                        modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryEditable),
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = brandExpanded) },
                        singleLine = true
                    )
                    ExposedDropdownMenu(
                        expanded = brandExpanded,
                        onDismissRequest = { brandExpanded = false }
                    ) {
                        COMMON_BRANDS.forEach { brand ->
                            DropdownMenuItem(
                                text = { Text(brand) },
                                onClick = { deviceBrand = brand; brandExpanded = false }
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = deviceModel,
                    onValueChange = { deviceModel = it },
                    label = { Text("Model *") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = deviceImei,
                        onValueChange = { deviceImei = it },
                        label = { Text("IMEI") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                    OutlinedTextField(
                        value = deviceStorage,
                        onValueChange = { deviceStorage = it },
                        label = { Text("Storage") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("128GB") }
                    )
                }
                // Grade selector
                Text("Condition Grade", style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(GRADES) { grade ->
                        val gradeColor = when (grade) {
                            "EXCELLENT" -> Color(0xFF00C896)
                            "GOOD" -> Color(0xFF6366F1)
                            "FAIR" -> Color(0xFFF59E0B)
                            else -> MaterialTheme.colorScheme.error
                        }
                        FilterChip(
                            selected = conditionGrade == grade,
                            onClick = { conditionGrade = grade },
                            label = { Text(grade, style = MaterialTheme.typography.labelSmall) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = gradeColor.copy(alpha = 0.15f),
                                selectedLabelColor = gradeColor
                            )
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = marketValue,
                        onValueChange = { marketValue = it },
                        label = { Text("Market Value ₹ *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                    OutlinedTextField(
                        value = offeredValue,
                        onValueChange = { offeredValue = it },
                        label = { Text("Offered ₹ *") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                }
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
                    val mv = marketValue.toDoubleOrNull() ?: 0.0
                    val ov = offeredValue.toDoubleOrNull() ?: 0.0
                    onCreate(
                        CreateTradeInRequest(
                            shopId = shopId,
                            customerName = customerName.trim(),
                            customerPhone = customerPhone.trim(),
                            deviceBrand = deviceBrand.trim(),
                            deviceModel = deviceModel.trim(),
                            deviceImei = deviceImei.takeIf { it.isNotBlank() },
                            deviceStorage = deviceStorage.takeIf { it.isNotBlank() },
                            conditionGrade = conditionGrade,
                            marketValue = mv,
                            offeredValue = ov,
                            notes = notes.takeIf { it.isNotBlank() }
                        )
                    )
                },
                enabled = !saving && customerName.isNotBlank() && customerPhone.isNotBlank()
                    && deviceBrand.isNotBlank() && deviceModel.isNotBlank()
                    && marketValue.isNotBlank() && offeredValue.isNotBlank()
            ) {
                if (saving) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                else Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
