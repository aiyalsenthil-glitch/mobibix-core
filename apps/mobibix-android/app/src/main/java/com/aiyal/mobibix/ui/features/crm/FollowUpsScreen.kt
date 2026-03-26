package com.aiyal.mobibix.ui.features.crm

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.FollowUp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FollowUpsScreen(
    navController: NavController,
    viewModel: CrmViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Follow-ups") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateDialog = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add")
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (uiState.followUps.isEmpty() && !uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No pending follow-ups", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    items(uiState.followUps) { task ->
                        FollowUpItem(
                            task = task,
                            onComplete = { viewModel.completeFollowUp(task.id) }
                        )
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateFollowUpDialog(
            isSaving = uiState.isSaving,
            onDismiss = { showCreateDialog = false },
            onCreate = { customerId, type, dueDate, note, priority ->
                viewModel.createFollowUp(customerId, type, dueDate, note ?: "", priority) {
                    showCreateDialog = false
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateFollowUpDialog(
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onCreate: (customerId: String, type: String, dueDate: String, note: String?, priority: String) -> Unit
) {
    var customerId by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("CALL") }
    var dueDate by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var selectedPriority by remember { mutableStateOf("MEDIUM") }
    var typeExpanded by remember { mutableStateOf(false) }

    val types = listOf("CALL", "WHATSAPP", "VISIT")
    val priorities = listOf("HIGH", "MEDIUM", "LOW")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Follow-up") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = customerId,
                    onValueChange = { customerId = it },
                    label = { Text("Customer ID") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                ExposedDropdownMenuBox(
                    expanded = typeExpanded,
                    onExpandedChange = { typeExpanded = it }
                ) {
                    OutlinedTextField(
                        value = selectedType,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Type") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(typeExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    )
                    ExposedDropdownMenu(expanded = typeExpanded, onDismissRequest = { typeExpanded = false }) {
                        types.forEach { t ->
                            DropdownMenuItem(text = { Text(t) }, onClick = { selectedType = t; typeExpanded = false })
                        }
                    }
                }

                OutlinedTextField(
                    value = dueDate,
                    onValueChange = { dueDate = it },
                    label = { Text("Due Date (YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text("2026-03-30") }
                )

                Text("Priority", style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    priorities.forEach { p ->
                        FilterChip(
                            selected = selectedPriority == p,
                            onClick = { selectedPriority = p },
                            label = { Text(p) }
                        )
                    }
                }

                OutlinedTextField(
                    value = note,
                    onValueChange = { note = it },
                    label = { Text("Note (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (customerId.isNotBlank() && dueDate.isNotBlank()) {
                        onCreate(customerId, selectedType, dueDate, note.ifBlank { null }, selectedPriority)
                    }
                },
                enabled = !isSaving && customerId.isNotBlank() && dueDate.isNotBlank()
            ) {
                if (isSaving) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                else Text("Create")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun FollowUpItem(task: FollowUp, onComplete: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(task.customerName, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        color = when(task.priority) {
                            "HIGH" -> Color(0xFFFFEBEE)
                            "MEDIUM" -> Color(0xFFFFF3E0)
                            else -> Color(0xFFE8F5E9)
                        },
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            task.priority,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = when(task.priority) {
                                "HIGH" -> Color(0xFFD32F2F)
                                "MEDIUM" -> Color(0xFFE65100)
                                else -> Color(0xFF2E7D32)
                            }
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(task.type, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(task.duelDate.take(10), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (!task.note.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(task.note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                }
            }
            IconButton(onClick = onComplete) {
                Icon(Icons.Default.CheckCircle, contentDescription = "Complete", tint = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
