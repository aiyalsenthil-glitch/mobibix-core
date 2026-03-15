package com.aiyal.mobibix.ui.features.roles

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.SecondaryIndicator
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.core.app.AppState
import com.aiyal.mobibix.domain.model.Role
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleEditScreen(
    appState: AppState,
    roleId: String,
    onNavigateBack: () -> Unit,
    viewModel: RolesViewModel = hiltViewModel()
) {
    // Only system owners can access this
    val isSystemOwner = when(appState) {
        is AppState.Owner -> appState.isSystemOwner
        is AppState.Staff -> appState.isSystemOwner
        else -> false
    }

    if (!isSystemOwner) {
        Scaffold { padding ->
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("Access Denied", color = MaterialTheme.colorScheme.error)
            }
        }
        return
    }

    val coroutineScope = rememberCoroutineScope()
    val isNew = roleId == "new"

    // Simulate dictionary fetching (Hardcoded for Android MVP UI mapping)
    // In reality this would come from a static object exactly like the web
    val modules = listOf(
        Pair("MOBILE_SHOP", "Mobile Shop"),
        Pair("CORE", "Core Admin & Finance")
    )
    val permissionsDict = mapOf(
        "MOBILE_SHOP" to listOf(
            mapOf("action" to "sale.create", "label" to "Ring up Sales", "desc" to "Create new invoices", "sensitive" to false),
            mapOf("action" to "sale.view_profit", "label" to "View Profit Margin", "desc" to "See actual item cost/profit", "sensitive" to true),
            mapOf("action" to "sale.refund", "label" to "Refund Invoices", "desc" to "Refund money to customers", "sensitive" to true),
            mapOf("action" to "inventory.adjust", "label" to "Adjust Stock", "desc" to "Manually change quantities", "sensitive" to false)
        ),
        "CORE" to listOf(
            mapOf("action" to "report.view_financials", "label" to "View Financial Reports", "desc" to "P&L and daily totals", "sensitive" to true),
            mapOf("action" to "report.export", "label" to "Export CSV", "desc" to "Download bulk data", "sensitive" to true),
            mapOf("action" to "approval.override", "label" to "Manager Override", "desc" to "Approve restricted discounts", "sensitive" to true)
        )
    )

    var role by remember { mutableStateOf<Role?>(null) }
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedActions by remember { mutableStateOf<Set<String>>(emptySet()) }
    var activeTab by remember { mutableStateOf("MOBILE_SHOP") }
    
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }

    // Fetch Role on launch (we don't have a Get API hook in RolesViewModel directly for 1 item, so we fake it using the Repository pattern inline or fetch all and filter)
    LaunchedEffect(roleId) {
        if (!isNew) {
            // Very hacky but fine for just mocking visual composition
            val allRoles = (viewModel.uiState.value as? RolesUiState.Success)?.roles
            val target = allRoles?.find { it.id == roleId }
            if (target != null) {
                role = target
                name = target.name
                description = target.description
                selectedActions = target.permissions.toSet()
            }
        }
        isLoading = false
    }

    val isReadOnly = role?.isSystem == true

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isNew) "Create Custom Role" else if (isReadOnly) "Template Blueprint" else "Edit Role") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Text("←", style = MaterialTheme.typography.titleLarge)
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            isSaving = true
                            // Here we'd call viewModel.saveRole or repository.save
                            coroutineScope.launch {
                                kotlinx.coroutines.delay(600)
                                onNavigateBack()
                            }
                        },
                        enabled = !isSaving && selectedActions.isNotEmpty() && name.isNotBlank()
                    ) {
                        Text(if (isReadOnly) "Clone Role" else "Save")
                    }
                }
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp)
        ) {
            // Header Context
            if (isReadOnly) {
                item {
                    Surface(
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Text(
                            "This is a locked template. You can view its permissions, but to make changes you must clone it by tapping 'Clone Role'.",
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onTertiaryContainer
                        )
                    }
                }
            }

            // Form Fields
            item {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Role Name") },
                    enabled = !isReadOnly,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    enabled = !isReadOnly,
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )
                Spacer(modifier = Modifier.height(24.dp))
            }

            // Module Tabs
            item {
                ScrollableTabRow(
                    selectedTabIndex = modules.indexOfFirst { it.first == activeTab },
                    edgePadding = 0.dp,
                    indicator = { tabPositions ->
                        SecondaryIndicator(
                            Modifier.tabIndicatorOffset(tabPositions[modules.indexOfFirst { it.first == activeTab }])
                        )
                    }
                ) {
                    modules.forEach { module ->
                        Tab(
                            selected = activeTab == module.first,
                            onClick = { activeTab = module.first },
                            text = { Text(module.second) }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Permissions Matrix
            val tabPermissions = permissionsDict[activeTab] ?: emptyList()
            
            items(tabPermissions.size) { i ->
                val perm = tabPermissions[i]
                val actionId = perm["action"] as String
                val label = perm["label"] as String
                val desc = perm["desc"] as String
                val isSensitive = perm["sensitive"] as Boolean
                val isChecked = selectedActions.contains(actionId)

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isChecked && isSensitive) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.5f)
                        else if (isChecked) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                        else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    ),
                    border = BorderStroke(
                        1.dp,
                        if (isChecked && isSensitive) MaterialTheme.colorScheme.error
                        else if (isChecked) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.outlineVariant
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(enabled = !isReadOnly) {
                                val newSet = selectedActions.toMutableSet()
                                if (isChecked) newSet.remove(actionId) else newSet.add(actionId)
                                selectedActions = newSet
                            }
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = isChecked,
                            onCheckedChange = null,
                            enabled = !isReadOnly
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(label, fontWeight = FontWeight.Bold)
                                if (isSensitive) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Box(
                                        modifier = Modifier.background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(4.dp)).padding(horizontal = 4.dp, vertical = 2.dp)
                                    ) {
                                        Text("SENSITIVE", color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }
                            Text(desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
