package com.aiyal.mobibix.ui.features.jobs

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.BuildConfig
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.data.network.RefundDetails
import com.aiyal.mobibix.data.network.ShopProduct
import com.aiyal.mobibix.data.network.dto.UpdateJobRequest
import com.aiyal.mobibix.model.JobStatus
import com.aiyal.mobibix.ui.components.QrCode
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val displayDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

private fun formatIsoToDisplay(isoDate: String?): String {
    if (isoDate.isNullOrBlank()) return ""
    return try {
        val instant = Instant.parse(isoDate)
        instant.atZone(ZoneId.systemDefault()).toLocalDate().format(displayDateFormatter)
    } catch (e: Exception) { "" }
}

private fun formatDisplayToIso(displayDate: String?): String? {
    if (displayDate.isNullOrBlank()) return null
    return try {
        val localDate = LocalDate.parse(displayDate, displayDateFormatter)
        localDate.atStartOfDay(ZoneId.systemDefault()).toInstant().toString()
    } catch (e: Exception) { null }
}

private val TERMINAL_STATUSES = setOf(
    JobStatus.DELIVERED, JobStatus.CANCELLED, JobStatus.RETURNED, JobStatus.SCRAPPED
)

private data class JobDetailFormData(
    val customerComplaint: String = "",
    val physicalCondition: String = "",
    val estimatedCost: String = "",
    val estimatedDelivery: String = ""
)

// ─────────────────────────────────────────────
// Status chip with complete color mapping
// ─────────────────────────────────────────────
@Composable
fun JobStatusChip(status: JobStatus) {
    val (bg, fg) = when (status) {
        JobStatus.RECEIVED          -> Color(0xFF64748B).copy(0.12f) to Color(0xFF64748B)
        JobStatus.ASSIGNED          -> Color(0xFF3B82F6).copy(0.12f) to Color(0xFF3B82F6)
        JobStatus.DIAGNOSING        -> Color(0xFFF59E0B).copy(0.12f) to Color(0xFFF59E0B)
        JobStatus.WAITING_APPROVAL  -> Color(0xFFEF6C00).copy(0.12f) to Color(0xFFEF6C00)
        JobStatus.APPROVED          -> Color(0xFF00B894).copy(0.12f) to Color(0xFF00B894)
        JobStatus.WAITING_FOR_PARTS -> Color(0xFFF59E0B).copy(0.15f) to Color(0xFFD97706)
        JobStatus.IN_PROGRESS       -> Color(0xFF00C896).copy(0.12f) to Color(0xFF00C896)
        JobStatus.READY             -> Color(0xFF3B82F6).copy(0.12f) to Color(0xFF2563EB)
        JobStatus.DELIVERED         -> Color(0xFF8B5CF6).copy(0.12f) to Color(0xFF8B5CF6)
        JobStatus.CANCELLED         -> Color(0xFFEF4444).copy(0.12f) to Color(0xFFEF4444)
        JobStatus.RETURNED          -> Color(0xFFEC4899).copy(0.12f) to Color(0xFFEC4899)
        JobStatus.SCRAPPED          -> Color(0xFF78716C).copy(0.12f) to Color(0xFF78716C)
        JobStatus.UNKNOWN           -> Color.LightGray.copy(0.12f) to Color.Gray
    }
    Surface(color = bg, shape = RoundedCornerShape(8.dp)) {
        Text(
            status.name.replace("_", " "),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = fg
        )
    }
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobDetailScreen(
    shopId: String,
    jobId: String,
    navController: NavController,
    viewModel: JobDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior(rememberTopAppBarState())

    var selectedTab by remember { mutableIntStateOf(0) }
    var showStatusSheet by remember { mutableStateOf(false) }
    var showShareDialog by remember { mutableStateOf(false) }
    var showAddPart by remember { mutableStateOf(false) }
    var showAddAdvance by remember { mutableStateOf(false) }
    var pendingStatusForRefund by remember { mutableStateOf<JobStatus?>(null) }
    var formData by remember { mutableStateOf(JobDetailFormData()) }

    LaunchedEffect(shopId, jobId) { viewModel.loadJobDetails(shopId, jobId) }

    LaunchedEffect(uiState.job) {
        uiState.job?.let { job ->
            formData = JobDetailFormData(
                customerComplaint = job.customerComplaint,
                physicalCondition = job.physicalCondition ?: "",
                estimatedCost = job.estimatedCost?.toString() ?: "",
                estimatedDelivery = formatIsoToDisplay(job.estimatedDelivery)
            )
        }
    }

    // Snackbars
    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearMessages()
        }
    }
    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            snackbarHostState.showSnackbar(it, duration = SnackbarDuration.Long)
            viewModel.clearMessages()
        }
    }

    val job = uiState.job
    val isLocked = job?.status in TERMINAL_STATUSES

    // ── Dialogs & Bottom Sheets ──
    if (showStatusSheet && job != null) {
        StatusTransitionBottomSheet(
            currentStatus = job.status ?: JobStatus.RECEIVED,
            advancePaid = job.advancePaid,
            onDismiss = { showStatusSheet = false },
            onStatusSelected = { status ->
                viewModel.updateStatus(shopId, jobId, status)
            },
            onStatusWithRefund = { status ->
                pendingStatusForRefund = status
            }
        )
    }

    pendingStatusForRefund?.let { targetStatus ->
        RefundConfirmDialog(
            targetStatus = targetStatus.name,
            advancePaid = job?.advancePaid ?: 0.0,
            onConfirm = { amount, mode ->
                viewModel.updateStatus(
                    shopId, jobId, targetStatus,
                    RefundDetails(amount, mode)
                )
                pendingStatusForRefund = null
            },
            onDismiss = { pendingStatusForRefund = null }
        )
    }

    if (showAddAdvance) {
        AddAdvanceBottomSheet(
            onDismiss = { showAddAdvance = false },
            onConfirm = { amount, mode -> viewModel.addAdvance(shopId, jobId, amount, mode) }
        )
    }

    if (showShareDialog && job?.publicToken != null) {
        val qrUrl = "${BuildConfig.PUBLIC_BASE_URL}/public/job/${job.publicToken}"
        JobShareDialog(qrContent = qrUrl, onDismiss = { showShareDialog = false })
    }

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            LargeTopAppBar(
                title = { Text(job?.jobNumber ?: "Job Details", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate("job_card_print_preview/$shopId/$jobId") }) {
                        Icon(Icons.Outlined.Print, "Print")
                    }
                    IconButton(onClick = { showShareDialog = true }) {
                        Icon(Icons.Outlined.Share, "Share")
                    }
                    job?.let { Box(Modifier.padding(end = 8.dp)) { JobStatusChip(it.status ?: JobStatus.UNKNOWN) } }
                },
                scrollBehavior = scrollBehavior
            )
        },
        bottomBar = {
            job?.let { currentJob ->
                JobDetailBottomBar(
                    job = currentJob,
                    isLocked = isLocked,
                    onStatusClick = { showStatusSheet = true },
                    onSave = {
                        val request = UpdateJobRequest(
                                customerName = currentJob.customerName,
                                customerPhone = currentJob.customerPhone,
                                customerAltPhone = currentJob.customerAltPhone,
                                deviceBrand = currentJob.deviceBrand,
                                deviceModel = currentJob.deviceModel,
                                deviceType = currentJob.deviceType,
                                deviceSerial = currentJob.deviceSerial,
                                customerComplaint = formData.customerComplaint,
                                physicalCondition = formData.physicalCondition.takeIf { it.isNotBlank() },
                                estimatedCost = formData.estimatedCost.toDoubleOrNull(),
                                estimatedDelivery = formatDisplayToIso(formData.estimatedDelivery)
                        )
                        viewModel.updateJob(shopId, jobId, request)
                        
                        // If user clicked "Generate Bill" (which triggers onSave), navigate
                        if (currentJob.status == JobStatus.READY || currentJob.status == JobStatus.IN_PROGRESS) {
                            navController.navigate("job_repair_bill/$shopId/$jobId")
                        }
                    }
                )
            }
        }
    ) { padding ->
        when {
            uiState.loading -> Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator()
            }
            job != null -> {
                Column(modifier = Modifier.fillMaxSize().padding(padding)) {
                    // ── Tab bar ──
                    val tabs = listOf("Overview", "Parts", "Financials")
                    TabRow(selectedTabIndex = selectedTab) {
                        tabs.forEachIndexed { i, title ->
                            Tab(
                                selected = selectedTab == i,
                                onClick = { selectedTab = i },
                                text = { Text(title) },
                                icon = {
                                    when (i) {
                                        0 -> Icon(Icons.Outlined.Info, null, Modifier.size(18.dp))
                                        1 -> Icon(Icons.Outlined.Build, null, Modifier.size(18.dp))
                                        2 -> Icon(Icons.Outlined.CurrencyRupee, null, Modifier.size(18.dp))
                                        else -> {}
                                    }
                                }
                            )
                        }
                    }

                    when (selectedTab) {
                        0 -> OverviewTab(job, formData, isLocked, onFormDataChange = { formData = it })
                        1 -> PartsTab(
                            job = job,
                            isLocked = isLocked,
                            partsLoading = uiState.partsLoading,
                            onAddPart = { showAddPart = true },
                            onRemovePart = { partId -> viewModel.removePart(shopId, jobId, partId) }
                        )
                        2 -> FinancialsTab(
                            job = job,
                            isLocked = isLocked,
                            onAddAdvance = { showAddAdvance = true },
                            onWarrantyJob = { viewModel.createWarrantyJob(shopId, jobId) }
                        )
                    }
                }

                // AddPart bottom sheet shown outside Scaffold padding
                if (showAddPart) {
                    AddPartBottomSheet(
                        products = emptyList(), // TODO: wire product search VM
                        searchLoading = false,
                        onDismiss = { showAddPart = false },
                        onSearch = { /* TODO: call productViewModel.searchProducts(it) */ },
                        onConfirm = { pid, qty -> viewModel.addPart(shopId, jobId, pid, qty) }
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────
// Bottom bar
// ─────────────────────────────────────────────
@Composable
private fun JobDetailBottomBar(
    job: JobCardResponse,
    isLocked: Boolean,
    onStatusClick: () -> Unit,
    onSave: () -> Unit
) {
    val isFullyTerminal = job.status in setOf(
        JobStatus.DELIVERED, JobStatus.RETURNED, JobStatus.SCRAPPED
    )

    BottomAppBar(containerColor = MaterialTheme.colorScheme.surface) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!isFullyTerminal) {
                OutlinedButton(
                    onClick = onStatusClick,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Outlined.SwapHoriz, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Status")
                }
            }
            if (job.status == JobStatus.READY || job.status == JobStatus.IN_PROGRESS) {
                Button(
                    onClick = { onSave(); /* Navigate implemented in caller */ }, // I'll wrap this in a callback
                    modifier = Modifier.weight(1.5f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(Icons.Outlined.Receipt, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Generate Bill")
                }
            } else if (!isLocked) {
                Button(
                    onClick = onSave,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Outlined.Save, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Save")
                }
            }
        }
    }
}

// ─────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OverviewTab(
    job: JobCardResponse,
    formData: JobDetailFormData,
    isEditable: Boolean,
    onFormDataChange: (JobDetailFormData) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        SectionCard(title = "Customer") {
            InfoRow(Icons.Outlined.Person, "Name", job.customerName)
            InfoRow(Icons.Outlined.Phone, "Phone", job.customerPhone, isPhone = true)
            job.customerAltPhone?.takeIf { it.isNotBlank() }?.let {
                InfoRow(Icons.Outlined.Phone, "Alt Phone", it, isPhone = true)
            }
        }
        SectionCard(title = "Device") {
            InfoRow(Icons.Outlined.Smartphone, "Type", job.deviceType)
            InfoRow(Icons.Outlined.Business, "Brand & Model", "${job.deviceBrand} ${job.deviceModel}")
            job.deviceSerial?.takeIf { it.isNotBlank() }?.let {
                InfoRow(Icons.Outlined.ConfirmationNumber, "IMEI / Serial", it)
            }
        }
        SectionCard(title = "Complaint & Condition") {
            if (isEditable) {
                OutlinedTextField(
                    value = formData.customerComplaint,
                    onValueChange = { onFormDataChange(formData.copy(customerComplaint = it)) },
                    label = { Text("Complaint") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = formData.physicalCondition,
                    onValueChange = { onFormDataChange(formData.copy(physicalCondition = it)) },
                    label = { Text("Physical Condition") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
            } else {
                InfoRow(Icons.Outlined.ReportProblem, "Complaint", job.customerComplaint)
                job.physicalCondition?.takeIf { it.isNotBlank() }?.let {
                    InfoRow(Icons.Outlined.Info, "Condition", it)
                }
            }
        }
        SectionCard(title = "Delivery") {
            if (isEditable) {
                OutlinedTextField(
                    value = formData.estimatedDelivery,
                    onValueChange = { onFormDataChange(formData.copy(estimatedDelivery = it)) },
                    label = { Text("Est. Delivery (dd/MM/yyyy)") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(12.dp)
                )
            } else {
                InfoRow(Icons.Outlined.CalendarToday, "Est. Delivery", job.estimatedDelivery ?: "—")
                job.deliveredAt?.let { InfoRow(Icons.Outlined.CheckCircle, "Delivered At", formatIsoToDisplay(it)) }
                job.scrappedAt?.let { InfoRow(Icons.Outlined.Delete, "Scrapped At", formatIsoToDisplay(it)) }
            }
        }
    }
}

@Composable
private fun PartsTab(
    job: JobCardResponse,
    isLocked: Boolean,
    partsLoading: Boolean,
    onAddPart: () -> Unit,
    onRemovePart: (String) -> Unit
) {
    val parts = job.parts
    val formatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())

    Column(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!isLocked) {
            Button(
                onClick = onAddPart,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                enabled = !partsLoading
            ) {
                if (partsLoading) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Outlined.Add, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Add Part / Material")
                }
            }
        }

        if (parts.isEmpty()) {
            Box(Modifier.fillMaxWidth().padding(top = 48.dp), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Outlined.Inventory2, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.outlineVariant)
                    Text("No parts added", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (!isLocked) Text("Tap above to add a part", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                }
            }
        } else {
            parts.forEach { part ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(1.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(part.productName, fontWeight = FontWeight.SemiBold)
                            Text(
                                "Qty: ${part.quantity} × ${formatter.format(part.unitPrice)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(formatter.format(part.totalPrice), fontWeight = FontWeight.Bold)
                            if (!isLocked) {
                                IconButton(
                                    onClick = { onRemovePart(part.id) },
                                    modifier = Modifier.size(32.dp),
                                    enabled = !partsLoading
                                ) {
                                    Icon(Icons.Outlined.Delete, "Remove", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }
            }
            // Total
            val total = parts.sumOf { it.totalPrice }
            Surface(color = MaterialTheme.colorScheme.primaryContainer, shape = RoundedCornerShape(12.dp)) {
                Row(Modifier.fillMaxWidth().padding(16.dp), Arrangement.SpaceBetween) {
                    Text("Parts Total", fontWeight = FontWeight.SemiBold)
                    Text(formatter.format(total), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
private fun FinancialsTab(
    job: JobCardResponse,
    isLocked: Boolean,
    onAddAdvance: () -> Unit,
    onWarrantyJob: () -> Unit
) {
    val formatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())
    val balance = (job.finalCost ?: job.estimatedCost ?: 0.0) - job.advancePaid
    val partsTotal = job.parts.sumOf { it.totalPrice }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Summary card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Financial Summary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                FinancialRow("Estimated Cost", formatter.format(job.estimatedCost ?: 0.0))
                if (job.laborCharge != null && job.laborCharge > 0) {
                    FinancialRow("Labor Charge", formatter.format(job.laborCharge))
                }
                if (partsTotal > 0) FinancialRow("Parts", formatter.format(partsTotal))
                if (job.finalCost != null) FinancialRow("Final Cost", formatter.format(job.finalCost), highlight = true)
                HorizontalDivider()
                FinancialRow("Advance Paid", formatter.format(job.advancePaid))
                FinancialRow(
                    "Balance Due",
                    formatter.format(if (balance >= 0) balance else 0.0),
                    highlight = true,
                    isNegative = balance < 0
                )
            }
        }

        // Action buttons
        if (!isLocked) {
            OutlinedButton(
                onClick = onAddAdvance,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Outlined.AddCard, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Add Advance Payment")
            }
        }

        // Warranty job button — only on DELIVERED with duration > 0
        if (job.status == JobStatus.DELIVERED && (job.warrantyDuration ?: 0) > 0) {
            Button(
                onClick = onWarrantyJob,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))
            ) {
                Icon(Icons.Outlined.Shield, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Create Warranty Job (${job.warrantyDuration} days)")
            }
        }
    }
}

@Composable
private fun FinancialRow(
    label: String,
    value: String,
    highlight: Boolean = false,
    isNegative: Boolean = false
) {
    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
        Text(label, style = if (highlight) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.bodyMedium,
             fontWeight = if (highlight) FontWeight.SemiBold else FontWeight.Normal,
             color = MaterialTheme.colorScheme.onPrimaryContainer)
        Text(
            value,
            fontWeight = if (highlight) FontWeight.Bold else FontWeight.Normal,
            color = if (isNegative) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onPrimaryContainer
        )
    }
}

// ─────────────────────────────────────────────
// Reusable composables
// ─────────────────────────────────────────────
@Composable
fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, style = MaterialTheme.typography.labelLarge,
                 fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            HorizontalDivider()
            content()
        }
    }
}

@Composable
fun InfoRow(
    icon: ImageVector,
    label: String,
    content: String,
    isPhone: Boolean = false
) {
    val context = LocalContext.current
    val rowMod = if (isPhone) Modifier.clickable {
        context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$content")))
    } else Modifier

    Row(
        modifier = rowMod.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(icon, label, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                content,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = if (isPhone) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
private fun JobShareDialog(qrContent: String, onDismiss: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Share Job Status") },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                QrCode(content = qrContent, modifier = Modifier.size(256.dp))
                Spacer(Modifier.height(8.dp))
                Text("Scan to track live job status", style = MaterialTheme.typography.bodySmall,
                     color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        },
        confirmButton = {
            Button(onClick = {
                val intent = Intent(Intent.ACTION_SEND).apply {
                    putExtra(Intent.EXTRA_TEXT, "Track your job: $qrContent")
                    type = "text/plain"
                }
                context.startActivity(Intent.createChooser(intent, null))
                onDismiss()
            }) { Text("Share Link") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}
