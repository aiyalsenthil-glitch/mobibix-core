package com.aiyal.mobibix.ui.features.jobs

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.CalendarToday
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.CurrencyRupee
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.ReportProblem
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Smartphone
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LargeTopAppBar
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTopAppBarState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import com.aiyal.mobibix.data.network.dto.UpdateJobRequest
import com.aiyal.mobibix.model.JobStatus
import com.aiyal.mobibix.ui.components.QrCode
import com.aiyal.mobibix.ui.components.StatusChip
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private data class JobDetailFormData(
    val customerComplaint: String = "",
    val physicalCondition: String = "",
    val estimatedCost: String = "",
    val advancePaid: String = "",
    val estimatedDelivery: String = "" // Stored as dd/MM/yyyy
)

private val displayDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")

private fun formatIsoToDisplay(isoDate: String?): String {
    if (isoDate.isNullOrBlank()) return ""
    return try {
        val instant = Instant.parse(isoDate)
        val localDate = instant.atZone(ZoneId.systemDefault()).toLocalDate()
        localDate.format(displayDateFormatter)
    } catch (e: Exception) {
        ""
    }
}

private fun formatDisplayToIso(displayDate: String?): String? {
    if (displayDate.isNullOrBlank()) return null
    return try {
        val localDate = LocalDate.parse(displayDate, displayDateFormatter)
        localDate.atStartOfDay(ZoneId.systemDefault()).toInstant().toString()
    } catch (e: Exception) {
        null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobDetailScreen(
    shopId: String,
    jobId: String,
    navController: NavController,
    viewModel: JobDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showShareDialog by remember { mutableStateOf(false) }
    var formData by remember { mutableStateOf(JobDetailFormData()) }

    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior(rememberTopAppBarState())

    LaunchedEffect(shopId, jobId) {
        viewModel.loadJobDetails(shopId, jobId)
    }

    // Update formData when job loads
    LaunchedEffect(uiState.job) {
        uiState.job?.let { job ->
            formData = JobDetailFormData(
                customerComplaint = job.customerComplaint,
                physicalCondition = job.physicalCondition ?: "",
                estimatedCost = job.estimatedCost?.toString() ?: "",
                advancePaid = job.advancePaid.toString(),
                estimatedDelivery = formatIsoToDisplay(job.estimatedDelivery)
            )
        }
    }

    if (showShareDialog && uiState.job?.publicToken != null) {
        val qrUrl = "${BuildConfig.PUBLIC_BASE_URL}/public/job/${uiState.job!!.publicToken}"
        ShareDialog(
            qrContent = qrUrl,
            onDismiss = { showShareDialog = false }
        )
    }

    val isEditable = uiState.job?.status != JobStatus.DELIVERED && uiState.job?.status != JobStatus.CANCELLED

    Scaffold(
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection),
        topBar = {
            LargeTopAppBar(
                title = { Text(uiState.job?.jobNumber ?: "Job Details") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate("job_card_print_preview/$shopId/$jobId") }) {
                        Icon(Icons.Outlined.Print, contentDescription = "Print Job Card")
                    }
                    IconButton(onClick = { showShareDialog = true }) {
                        Icon(Icons.Outlined.Share, contentDescription = "Share Job")
                    }
                    uiState.job?.let {
                        Box(modifier = Modifier.padding(end = 16.dp)) {
                            StatusChip(it.status)
                        }
                    }
                },
                scrollBehavior = scrollBehavior
            )
        },
        bottomBar = {
            uiState.job?.let { currentJob ->
                if (isEditable) {
                    BottomAppBar {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            JobActions(job = currentJob, onNextStatus = { nextStatus ->
                                viewModel.updateStatus(shopId, jobId, nextStatus)
                            })
                            Button(onClick = {
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
                                    estimatedCost = formData.estimatedCost.toIntOrNull(),
                                    advancePaid = formData.advancePaid.toIntOrNull(),
                                    estimatedDelivery = formatDisplayToIso(formData.estimatedDelivery)
                                )
                                viewModel.updateJob(shopId, jobId, request)
                            }) {
                                Text("Save")
                            }
                        }
                    }
                }
            }
        }
    ) { padding ->
        when {
            uiState.loading -> Box(
                Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator() }

            uiState.error != null -> Text(
                uiState.error!!,
                modifier = Modifier
                    .padding(padding)
                    .padding(16.dp),
                color = MaterialTheme.colorScheme.error
            )

            uiState.job != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                ) {
                    JobDetailContent(uiState.job!!, isEditable, formData) { formData = it }
                }
            }
        }
    }
}

@Composable
private fun JobDetailContent(
    job: JobCardResponse,
    isEditable: Boolean,
    formData: JobDetailFormData,
    onFormDataChange: (JobDetailFormData) -> Unit
) {
    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // Job Meta Section
        DetailSectionCard(title = "Job Details") {
            DetailRow(Icons.Outlined.ConfirmationNumber, "Job Number", job.jobNumber)
            DetailRow(Icons.Outlined.Info, "Status", job.status.name)
            DetailRow(Icons.Outlined.Person, "Created By", job.createdByName)
        }

        // Customer Info Section
        DetailSectionCard(title = "Customer Information") {
            DetailRow(Icons.Outlined.Person, "Customer Name", job.customerName)
            DetailRow(Icons.Outlined.Phone, "Contact Number", job.customerPhone, isClickable = true)
            job.customerAltPhone?.takeIf { it.isNotBlank() }?.let {
                DetailRow(Icons.Outlined.Phone, "Alternate Contact", it, isClickable = true)
            }
        }

        // Device Info Section
        DetailSectionCard(title = "Device Information") {
            DetailRow(Icons.Outlined.Smartphone, "Device Type", job.deviceType)
            DetailRow(Icons.Outlined.Business, "Brand", job.deviceBrand)
            DetailRow(Icons.Outlined.Smartphone, "Model", job.deviceModel)
            job.deviceSerial?.takeIf { it.isNotBlank() }?.let {
                DetailRow(Icons.Outlined.ConfirmationNumber, "IMEI / Serial", it)
            }
        }

        // Issue & Condition Section
        DetailSectionCard(title = "Issue & Condition") {
            EditableDetailRow(
                label = "Customer Complaint",
                value = formData.customerComplaint,
                onValueChange = { onFormDataChange(formData.copy(customerComplaint = it)) },
                isEditable = isEditable,
                icon = Icons.Outlined.ReportProblem
            )
            EditableDetailRow(
                label = "Physical Condition",
                value = formData.physicalCondition,
                onValueChange = { onFormDataChange(formData.copy(physicalCondition = it)) },
                isEditable = isEditable,
                icon = Icons.Outlined.Info
            )
        }

        // Financials Section
        DetailSectionCard(title = "Financials") {
            EditableDetailRow(
                label = "Estimated Cost",
                value = formData.estimatedCost,
                onValueChange = { onFormDataChange(formData.copy(estimatedCost = it)) },
                isEditable = isEditable,
                icon = Icons.Outlined.CurrencyRupee,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
            EditableDetailRow(
                label = "Advance Paid",
                value = formData.advancePaid,
                onValueChange = { onFormDataChange(formData.copy(advancePaid = it)) },
                isEditable = isEditable,
                icon = Icons.Outlined.CurrencyRupee,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
            val balance = (job.estimatedCost ?: 0.0) - job.advancePaid
            val formatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())
            DetailRow(Icons.Outlined.CurrencyRupee, "Balance Due", formatter.format(balance))
        }

        // Delivery Section
        DetailSectionCard(title = "Delivery") {
            EditableDateRow(
                label = "Estimated Delivery",
                value = formData.estimatedDelivery,
                onValueChange = { onFormDataChange(formData.copy(estimatedDelivery = it)) },
                isEditable = isEditable,
                icon = Icons.Outlined.CalendarToday
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditableDateRow(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    isEditable: Boolean,
    icon: ImageVector
) {
    var showDatePicker by remember { mutableStateOf(false) }
    val datePickerState = rememberDatePickerState()

    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let {
                            val instant = Instant.ofEpochMilli(it)
                            val localDate = instant.atZone(ZoneId.systemDefault()).toLocalDate()
                            onValueChange(localDate.format(displayDateFormatter))
                        }
                        showDatePicker = false
                    }
                ) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) { Text("Cancel") }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    if (isEditable) {
        val interactionSource = remember { MutableInteractionSource() }
        if (interactionSource.collectIsPressedAsState().value) {
            showDatePicker = true
        }
        OutlinedTextField(
            value = value,
            onValueChange = { /* read-only */ },
            label = { Text(label) },
            leadingIcon = { Icon(icon, contentDescription = label) },
            modifier = Modifier.fillMaxWidth(),
            readOnly = true,
            interactionSource = interactionSource
        )
    } else {
        DetailRow(icon, label, value)
    }
}

@Composable
fun DetailSectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))
            content()
        }
    }
}

@Composable
fun EditableDetailRow(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    isEditable: Boolean,
    icon: ImageVector,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default
) {
    if (isEditable) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label) },
            leadingIcon = { Icon(icon, contentDescription = label) },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = keyboardOptions
        )
    } else {
        DetailRow(icon, label, value)
    }
}

@Composable
private fun ShareDialog(
    qrContent: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Share Job Status") },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                QrCode(content = qrContent, modifier = Modifier.size(256.dp))
                Spacer(Modifier.height(16.dp))
                Text("Scan to see live job status", style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = {
            Button(onClick = {
                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TEXT, "Track your job status: $qrContent")
                    type = "text/plain"
                }
                val shareIntent = Intent.createChooser(sendIntent, null)
                context.startActivity(shareIntent)
                onDismiss()
            }) {
                Text("Share Link")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

@Composable
private fun DetailRow(
    icon: ImageVector,
    label: String,
    content: String,
    modifier: Modifier = Modifier,
    isClickable: Boolean = false
) {
    val context = LocalContext.current
    val rowModifier = if (isClickable) {
        modifier.clickable {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$content"))
            context.startActivity(intent)
        }
    } else {
        modifier
    }

    Row(
        modifier = rowModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = label,
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = content,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                color = if (isClickable) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
private fun JobActions(
    job: JobCardResponse,
    onNextStatus: (JobStatus) -> Unit
) {
    val nextStatusInfo = when (job.status) {
        JobStatus.RECEIVED -> JobStatus.IN_PROGRESS to "Start Repair"
        JobStatus.IN_PROGRESS -> JobStatus.READY to "Mark as Ready"
        JobStatus.READY -> JobStatus.DELIVERED to "Mark as Delivered"
        else -> null
    }

    if (nextStatusInfo != null) {
        val (status, text) = nextStatusInfo
        Button(onClick = { onNextStatus(status) }) {
            Text(text)
        }
    }
}
