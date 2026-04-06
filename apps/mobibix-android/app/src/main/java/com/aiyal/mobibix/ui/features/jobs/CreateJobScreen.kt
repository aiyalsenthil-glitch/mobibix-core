package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.ui.features.customers.CustomerViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private fun isValidIndianPhoneNumber(phone: String): Boolean {
    return phone.matches(Regex("^(?:\\+91)?[6-9]\\d{9}$"))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateJobScreen(
    shopId: String,
    navController: NavController,
    viewModel: CreateJobViewModel = hiltViewModel(),
    customerViewModel: CustomerViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var currentStep by remember { mutableStateOf(1) }
    var showCustomerPicker by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { customerViewModel.loadCustomers() }

    LaunchedEffect(uiState.success) {
        if (uiState.success) {
            viewModel.resetState()
            navController.popBackStack()
        }
    }

    if (showCustomerPicker) {
        JobCustomerPickerDialog(
            customerViewModel = customerViewModel,
            onDismiss = { showCustomerPicker = false },
            onCustomerSelected = { name, phone ->
                viewModel.updateFormData(uiState.formData.copy(customerName = name, customerPhone = phone))
                showCustomerPicker = false
            }
        )
    }

    fun isStep1Valid() = uiState.formData.customerName.isNotBlank() && isValidIndianPhoneNumber(uiState.formData.customerPhone)
    fun isStep2Valid() = uiState.formData.deviceType.isNotBlank() && uiState.formData.deviceBrand.isNotBlank() && uiState.formData.deviceModel.isNotBlank()
    fun isStep3Valid() = uiState.formData.customerComplaint.isNotBlank()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Job - Step $currentStep of 3") },
                navigationIcon = {
                    if (currentStep > 1) {
                        IconButton(onClick = { currentStep-- }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Previous Step")
                        }
                    } else {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                }
            )
        },
        bottomBar = {
            Surface(shadowElevation = 8.dp) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    if (uiState.error != null) {
                        Text(
                            text = uiState.error!!,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (currentStep < 3) {
                            Button(
                                onClick = { currentStep++ },
                                enabled = when (currentStep) {
                                    1 -> isStep1Valid()
                                    2 -> isStep2Valid()
                                    else -> false
                                }
                            ) {
                                Text("Next")
                                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Next Step")
                            }
                        } else {
                            Button(
                                onClick = { viewModel.submitJob(shopId) },
                                enabled = isStep3Valid() && !uiState.loading
                            ) {
                                if (uiState.loading) {
                                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                                } else {
                                    Text("Create Job")
                                }
                            }
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Crossfade(targetState = currentStep, label = "job_creation_steps") { step ->
                Column(modifier = Modifier.padding(vertical = 16.dp)) {
                    when (step) {
                        1 -> Step1CustomerInfo(uiState.formData, viewModel::updateFormData, onSearchCustomer = { showCustomerPicker = true })
                        2 -> Step2DeviceDetails(uiState.formData, viewModel::updateFormData)
                        3 -> Step3JobSpecifics(uiState.formData, viewModel::updateFormData)
                    }
                }
            }
        }
    }
}

@Composable
private fun FormStep(title: String, content: @Composable () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 16.dp))
            content()
        }
    }
}

@Composable
private fun Step1CustomerInfo(
    formData: CreateJobFormData,
    onFormDataChange: (CreateJobFormData) -> Unit,
    onSearchCustomer: () -> Unit = {}
) {
    val showPhoneError = formData.customerPhone.isNotBlank() && !isValidIndianPhoneNumber(formData.customerPhone)
    val showAltPhoneError = formData.customerAltPhone.isNotBlank() && !isValidIndianPhoneNumber(formData.customerAltPhone)

    FormStep(title = "Customer Information") {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedButton(onClick = onSearchCustomer, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.size(6.dp))
                Text("Search Existing Customer")
            }
            if (formData.customerName.isNotBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Person, contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.size(4.dp))
                    Text("Selected: ${formData.customerName}", style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary)
                }
            }
            OutlinedTextField(
                value = formData.customerName,
                onValueChange = { onFormDataChange(formData.copy(customerName = it)) },
                label = { Text("Customer Name*") },
                leadingIcon = { Icon(Icons.Outlined.Person, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = formData.customerPhone,
                onValueChange = { onFormDataChange(formData.copy(customerPhone = it)) },
                label = { Text("Customer Phone*") },
                leadingIcon = { Icon(Icons.Outlined.Phone, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                isError = showPhoneError,
                supportingText = { if (showPhoneError) Text("Please enter a valid 10-digit Indian phone number.") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
            )
            OutlinedTextField(
                value = formData.customerAltPhone,
                onValueChange = { onFormDataChange(formData.copy(customerAltPhone = it)) },
                label = { Text("Alternate Phone (Optional)") },
                leadingIcon = { Icon(Icons.Outlined.Phone, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                isError = showAltPhoneError,
                supportingText = { if (showAltPhoneError) Text("Please enter a valid 10-digit Indian phone number.") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Step2DeviceDetails(
    formData: CreateJobFormData,
    onFormDataChange: (CreateJobFormData) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val deviceTypes = remember { listOf("Mobile", "Laptop", "Tablet", "Other") }

    FormStep(title = "Device Details") {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded },
            ) {
                OutlinedTextField(
                    value = formData.deviceType,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Device Type*") },
                    leadingIcon = {
                        val icon = when (formData.deviceType.lowercase()) {
                            "mobile" -> Icons.Outlined.Smartphone
                            "laptop" -> Icons.Outlined.Laptop
                            "tablet" -> Icons.Outlined.Tablet
                            else -> Icons.Outlined.Devices
                        }
                        Icon(icon, contentDescription = null)
                    },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable).fillMaxWidth()
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    deviceTypes.forEach { type ->
                        DropdownMenuItem(
                            text = { Text(type) },
                            onClick = {
                                onFormDataChange(formData.copy(deviceType = type))
                                expanded = false
                            }
                        )
                    }
                }
            }
            OutlinedTextField(
                value = formData.deviceBrand,
                onValueChange = { onFormDataChange(formData.copy(deviceBrand = it)) },
                label = { Text("Device Brand*") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = formData.deviceModel,
                onValueChange = { onFormDataChange(formData.copy(deviceModel = it)) },
                label = { Text("Device Model*") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = formData.deviceSerial,
                onValueChange = { onFormDataChange(formData.copy(deviceSerial = it)) },
                label = { Text("IMEI / Serial Number (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Step3JobSpecifics(
    formData: CreateJobFormData,
    onFormDataChange: (CreateJobFormData) -> Unit
) {
    var showDatePicker by remember { mutableStateOf(false) }
    val datePickerState = rememberDatePickerState()

    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        val selectedDate = datePickerState.selectedDateMillis?.let { sdf.format(Date(it)) }
                        if (selectedDate != null) {
                            onFormDataChange(formData.copy(estimatedDelivery = selectedDate))
                        }
                        showDatePicker = false
                    }
                ) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancel") } }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    FormStep(title = "Job Details") {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedTextField(
                value = formData.customerComplaint,
                onValueChange = { onFormDataChange(formData.copy(customerComplaint = it)) },
                label = { Text("Customer Complaint*") },
                leadingIcon = { Icon(Icons.Outlined.Description, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )
            OutlinedTextField(
                value = formData.physicalCondition,
                onValueChange = { onFormDataChange(formData.copy(physicalCondition = it)) },
                label = { Text("Physical Condition (Optional)") },
                leadingIcon = { Icon(Icons.Outlined.Build, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )
            OutlinedTextField(
                value = formData.estimatedCost,
                onValueChange = { onFormDataChange(formData.copy(estimatedCost = it)) },
                label = { Text("Estimated Cost") },
                leadingIcon = { Icon(Icons.Outlined.AttachMoney, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
            OutlinedTextField(
                value = formData.advancePaid,
                onValueChange = { onFormDataChange(formData.copy(advancePaid = it)) },
                label = { Text("Advance Paid") },
                leadingIcon = { Icon(Icons.Outlined.AttachMoney, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )

            val interactionSource = remember { MutableInteractionSource() }
            if (interactionSource.collectIsPressedAsState().value) {
                showDatePicker = true
            }
            OutlinedTextField(
                value = formData.estimatedDelivery,
                onValueChange = {},
                label = { Text("Estimated Delivery (Optional)") },
                leadingIcon = { Icon(Icons.Outlined.Event, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                readOnly = true,
                interactionSource = interactionSource
            )
        }
    }
}

private val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

@Composable
private fun JobCustomerPickerDialog(
    customerViewModel: CustomerViewModel,
    onDismiss: () -> Unit,
    onCustomerSelected: (name: String, phone: String) -> Unit
) {
    val uiState by customerViewModel.uiState.collectAsState()
    var query by remember { mutableStateOf("") }
    var showCreate by remember { mutableStateOf(false) }
    var newName by remember { mutableStateOf("") }
    var newPhone by remember { mutableStateOf("") }

    LaunchedEffect(query) {
        kotlinx.coroutines.delay(300)
        customerViewModel.loadCustomers(query.takeIf { it.isNotBlank() })
    }
    LaunchedEffect(uiState.operationSuccess) {
        if (uiState.operationSuccess) {
            val created = uiState.customers.firstOrNull {
                it.name.equals(newName, ignoreCase = true) && it.phone == newPhone
            }
            onCustomerSelected(created?.name ?: newName, created?.phone ?: newPhone)
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (showCreate) "New Customer" else "Select Customer") },
        text = {
            Column {
                if (showCreate) {
                    OutlinedTextField(
                        value = newName, onValueChange = { newName = it },
                        label = { Text("Name *") }, modifier = Modifier.fillMaxWidth(), singleLine = true
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newPhone, onValueChange = { newPhone = it },
                        label = { Text("Phone *") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                    )
                    if (uiState.error != null) {
                        Spacer(Modifier.height(4.dp))
                        Text(uiState.error!!, color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall)
                    }
                } else {
                    OutlinedTextField(
                        value = query, onValueChange = { query = it },
                        placeholder = { Text("Search by name or phone") },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(), singleLine = true
                    )
                    Spacer(Modifier.height(8.dp))
                    if (uiState.loading) {
                        CircularProgressIndicator(modifier = Modifier.align(Alignment.CenterHorizontally).padding(16.dp))
                    } else if (uiState.customers.isEmpty()) {
                        Text(
                            if (query.isBlank()) "Start typing to search" else "No match for \"$query\"",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(8.dp)
                        )
                    } else {
                        LazyColumn(modifier = Modifier.height(260.dp)) {
                            items(uiState.customers.take(20)) { customer ->
                                ListItem(
                                    headlineContent = { Text(customer.name) },
                                    supportingContent = { Text(customer.phone) },
                                    modifier = Modifier.clickable { onCustomerSelected(customer.name, customer.phone) }
                                )
                                HorizontalDivider()
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    TextButton(onClick = { showCreate = true }, modifier = Modifier.fillMaxWidth()) {
                        Text("+ Create New Customer")
                    }
                }
            }
        },
        confirmButton = {
            if (showCreate) {
                Button(
                    onClick = {
                        customerViewModel.createCustomer(
                            name = newName, phone = newPhone, email = null,
                            address = "", businessType = "B2C", partyType = "CUSTOMER", gst = null
                        )
                    },
                    enabled = newName.isNotBlank() && newPhone.isNotBlank() && !uiState.operationLoading
                ) {
                    if (uiState.operationLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary)
                    } else Text("Create")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = { if (showCreate) showCreate = false else onDismiss() }) {
                Text(if (showCreate) "Back" else "Cancel")
            }
        }
    )
}
