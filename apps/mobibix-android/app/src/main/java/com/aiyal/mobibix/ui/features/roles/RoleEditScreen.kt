package com.aiyal.mobibix.ui.features.roles

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.aiyal.mobibix.domain.model.PermissionModule

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleEditScreen(
    appState: AppState,
    roleId: String?,    // null = create new
    onNavigateBack: () -> Unit,
    viewModel: RolesViewModel = hiltViewModel()
) {
    val isSystemOwner = when (appState) {
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

    val editState by viewModel.editState.collectAsState()

    LaunchedEffect(roleId) {
        viewModel.loadRoleForEdit(roleId)
    }

    // Navigate back after successful save
    LaunchedEffect(editState) {
        if (editState is RoleEditUiState.Saved) {
            viewModel.resetEditState()
            onNavigateBack()
        }
    }

    when (val state = editState) {
        is RoleEditUiState.Idle, is RoleEditUiState.Loading -> {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text(if (roleId == null) "Create Role" else "Edit Role") },
                        navigationIcon = {
                            IconButton(onClick = onNavigateBack) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                            }
                        }
                    )
                }
            ) { padding ->
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }
        is RoleEditUiState.Error -> {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text("Error") },
                        navigationIcon = {
                            IconButton(onClick = onNavigateBack) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                            }
                        }
                    )
                }
            ) { padding ->
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(state.message, color = MaterialTheme.colorScheme.error)
                        Spacer(Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadRoleForEdit(roleId) }) { Text("Retry") }
                    }
                }
            }
        }
        is RoleEditUiState.Ready, is RoleEditUiState.Saving -> {
            val ready = editState as? RoleEditUiState.Ready
                ?: (editState as RoleEditUiState.Saving).let { return }
            RoleEditContent(
                roleId = roleId,
                existingRole = ready.role,
                modules = ready.modules,
                isSaving = editState is RoleEditUiState.Saving,
                onNavigateBack = onNavigateBack,
                onSave = { name, description, permissions ->
                    viewModel.saveRole(
                        roleId = if (ready.role?.isSystem == true) null else roleId,
                        name = name,
                        description = description,
                        permissions = permissions,
                        onSuccess = {}
                    )
                },
                onClone = { role ->
                    viewModel.cloneRole(role, onSuccess = {})
                }
            )
        }
        else -> {}
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoleEditContent(
    roleId: String?,
    existingRole: com.aiyal.mobibix.domain.model.Role?,
    modules: List<PermissionModule>,
    isSaving: Boolean,
    onNavigateBack: () -> Unit,
    onSave: (String, String, List<String>) -> Unit,
    onClone: (com.aiyal.mobibix.domain.model.Role) -> Unit
) {
    val isReadOnly = existingRole?.isSystem == true
    val isNew = roleId == null && existingRole == null

    var name by remember(existingRole) { mutableStateOf(existingRole?.name ?: "") }
    var description by remember(existingRole) { mutableStateOf(existingRole?.description ?: "") }
    var selectedActions by remember(existingRole) {
        mutableStateOf<Set<String>>(existingRole?.permissions?.toSet() ?: emptySet())
    }
    var activeModuleIndex by remember { mutableStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(when {
                        isNew -> "Create Custom Role"
                        isReadOnly -> "Template Blueprint"
                        else -> "Edit Role"
                    })
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (isReadOnly && existingRole != null) {
                        TextButton(onClick = { onClone(existingRole) }, enabled = !isSaving) {
                            if (isSaving) CircularProgressIndicator(Modifier.size(16.dp))
                            else Text("Clone Role")
                        }
                    } else {
                        TextButton(
                            onClick = { onSave(name, description, selectedActions.toList()) },
                            enabled = !isSaving && name.isNotBlank() && selectedActions.isNotEmpty()
                        ) {
                            if (isSaving) CircularProgressIndicator(Modifier.size(16.dp))
                            else Text("Save")
                        }
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp)
        ) {
            if (isReadOnly) {
                item {
                    Surface(
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                    ) {
                        Text(
                            "This is a locked template. View its permissions or tap 'Clone Role' to create an editable copy.",
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onTertiaryContainer
                        )
                    }
                }
            }

            item {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Role Name") },
                    enabled = !isReadOnly,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    enabled = !isReadOnly,
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )
                Spacer(Modifier.height(24.dp))
            }

            if (modules.isNotEmpty()) {
                item {
                    ScrollableTabRow(
                        selectedTabIndex = activeModuleIndex,
                        edgePadding = 0.dp,
                        indicator = { tabPositions ->
                            if (activeModuleIndex < tabPositions.size) {
                                SecondaryIndicator(Modifier.tabIndicatorOffset(tabPositions[activeModuleIndex]))
                            }
                        }
                    ) {
                        modules.forEachIndexed { index, module ->
                            Tab(
                                selected = activeModuleIndex == index,
                                onClick = { activeModuleIndex = index },
                                text = { Text(module.displayName) }
                            )
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }

                val activeModule = modules.getOrNull(activeModuleIndex)
                activeModule?.resources?.forEach { resource ->
                    item {
                        Text(
                            resource.displayName,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }
                    items(resource.actions.size) { i ->
                        val action = resource.actions[i]
                        val isChecked = selectedActions.contains(action.key)

                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = when {
                                    isChecked && action.isSensitive -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.4f)
                                    isChecked -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                                    else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                                }
                            ),
                            border = BorderStroke(
                                1.dp,
                                when {
                                    isChecked && action.isSensitive -> MaterialTheme.colorScheme.error
                                    isChecked -> MaterialTheme.colorScheme.primary
                                    else -> MaterialTheme.colorScheme.outlineVariant
                                }
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable(enabled = !isReadOnly) {
                                        val updated = selectedActions.toMutableSet()
                                        if (isChecked) updated.remove(action.key) else updated.add(action.key)
                                        selectedActions = updated
                                    }
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Checkbox(
                                    checked = isChecked,
                                    onCheckedChange = null,
                                    enabled = !isReadOnly
                                )
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(action.label, fontWeight = FontWeight.SemiBold)
                                        if (action.isSensitive) {
                                            Spacer(Modifier.width(6.dp))
                                            Box(
                                                modifier = Modifier
                                                    .background(
                                                        MaterialTheme.colorScheme.errorContainer,
                                                        RoundedCornerShape(4.dp)
                                                    )
                                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    "SENSITIVE",
                                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                                    style = MaterialTheme.typography.labelSmall
                                                )
                                            }
                                        }
                                    }
                                    Text(
                                        action.key,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            } else {
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "No permission modules available.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
