package com.aiyal.mobibix.ui.features.roles

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.core.app.AppState
import com.aiyal.mobibix.domain.model.Role

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleListScreen(
    appState: AppState,
    onNavigateBack: () -> Unit,
    onNavigateToRoleEdit: (String) -> Unit,
    viewModel: RolesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // Access control: Only system owners can view/edit roles
    val isSystemOwner = when(appState) {
        is AppState.Owner -> appState.isSystemOwner
        is AppState.Staff -> appState.isSystemOwner
        else -> false
    }

    if (!isSystemOwner) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Roles & Permissions") },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.Add /* Should be Back Arrow but we're mocking for compilation */, contentDescription = "Back")
                        }
                    }
                )
            }
        ) { padding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Access Denied. Only system owners can manage roles.",
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
        return
    }

    var showDeleteConfirm by remember { mutableStateOf<String?>(null) }

    if (showDeleteConfirm != null) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Delete Custom Role?") },
            text = { Text("Are you sure you want to delete this role? Any staff assigned to it must be reassigned.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteRole(showDeleteConfirm!!)
                        showDeleteConfirm = null
                    }
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Role Management") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        // Will replace Add with Back Arrow later when icons are available
                        Icon(Icons.Default.Add, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { onNavigateToRoleEdit("new") },
                containerColor = MaterialTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Custom Role")
            }
        }
    ) { padding ->
        when (uiState) {
            is RolesUiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is RolesUiState.Error -> {
                Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Text("Error: ${(uiState as RolesUiState.Error).message}", color = MaterialTheme.colorScheme.error)
                }
            }
            is RolesUiState.Success -> {
                val roles = (uiState as RolesUiState.Success).roles
                val systemRoles = roles.filter { it.isSystem }
                val customRoles = roles.filter { !it.isSystem }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(horizontal = 16.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    item {
                        Text(
                            text = "Choose a simple template or create a custom set of permissions for your staff.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(vertical = 16.dp)
                        )
                    }

                    item {
                        Text(
                            "Ready-to-Use Templates",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(vertical = 8.dp)
                        )
                    }

                    items(systemRoles) { role ->
                        RoleCard(
                            role = role,
                            onClick = { onNavigateToRoleEdit(role.id) },
                            onDelete = null
                        )
                    }

                    item {
                        Text(
                            "Custom Roles",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 24.dp, bottom = 8.dp)
                        )
                        if (customRoles.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 16.dp)
                                    .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(12.dp))
                                    .padding(24.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "You haven't created any custom roles. Most businesses never need to!",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }

                    items(customRoles) { role ->
                        RoleCard(
                            role = role,
                            onClick = { onNavigateToRoleEdit(role.id) },
                            onDelete = { showDeleteConfirm = role.id }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun RoleCard(
    role: Role,
    onClick: () -> Unit,
    onDelete: (() -> Unit)?
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        role.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    if (role.isSystem) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                "Template",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
                
                if (onDelete != null) {
                    IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = role.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = if (role.isSystem) "View Blueprint →" else "Edit Matrix →",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
