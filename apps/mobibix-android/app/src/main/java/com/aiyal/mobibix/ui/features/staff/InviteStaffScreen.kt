package com.aiyal.mobibix.ui.features.staff

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.data.network.InviteStaffRequest
import com.aiyal.mobibix.data.network.StaffApi
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InviteStaffScreen(
    staffApi: StaffApi,
    activeShopId: String,
    viewModel: StaffViewModel = hiltViewModel(),
    onDone: () -> Unit,
    onNavigateToCustomRole: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    var step by remember { mutableStateOf(1) }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var selectedBranches by remember { mutableStateOf(setOf(activeShopId)) }
    var selectedRoleId by remember { mutableStateOf<String?>(null) }
    
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (step == 1) "Invite Staff" else "Select Role") },
                navigationIcon = {
                    IconButton(onClick = { if (step == 2) step = 1 else onDone() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            Surface(
                shadowElevation = 8.dp,
                color = MaterialTheme.colorScheme.surface
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.End
                ) {
                    if (step == 1) {
                        Button(
                            onClick = {
                                if (name.isBlank() || email.isBlank()) {
                                    error = "Name and Email are required."
                                    return@Button
                                }
                                if (selectedBranches.isEmpty()) {
                                    error = "Select at least one branch."
                                    return@Button
                                }
                                error = null
                                step = 2
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Next: Select Role →")
                        }
                    } else {
                        Button(
                            onClick = {
                                loading = true
                                error = null
                                scope.launch {
                                    try {
                                        staffApi.invite(
                                            InviteStaffRequest(
                                                email = email,
                                                name = name,
                                                phone = phone.ifBlank { null },
                                                roleId = selectedRoleId!!,
                                                branchIds = selectedBranches.toList(),
                                                shopId = activeShopId
                                            )
                                        )
                                        onDone()
                                    } catch (e: Exception) {
                                        error = e.message ?: "Invite failed"
                                    } finally {
                                        loading = false
                                    }
                                }
                            },
                            enabled = !loading && selectedRoleId != null,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(if (loading) "Inviting..." else "Send Invitation")
                        }
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp)
        ) {
            if (error != null) {
                item {
                    Text(
                        text = error!!,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }
            }

            if (step == 1) {
                item {
                    Text("Step 1: Details & Branch Locations", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(16.dp))
                    
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Full Name *") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email Address *") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone Number") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    Spacer(Modifier.height(24.dp))
                    Text("Where will they work? *", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                }
                
                items(uiState.shops) { shop ->
                    val isSelected = selectedBranches.contains(shop.id)
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable {
                            val newSet = selectedBranches.toMutableSet()
                            if (isSelected) newSet.remove(shop.id) else newSet.add(shop.id)
                            selectedBranches = newSet
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha=0.5f)
                        ),
                        border = if (isSelected) BorderStroke(1.dp, MaterialTheme.colorScheme.primary) else null
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = isSelected, onCheckedChange = null)
                            Spacer(Modifier.width(12.dp))
                            Text(shop.name, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            } else {
                item {
                    Text("Step 2: Assign a Role", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text("Choose a template or select a custom role you've created.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(16.dp))
                }

                val displayRoles = uiState.roles.filter { it.name != "System Owner" }
                
                if (displayRoles.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha=0.3f)),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                        ) {
                            Column(
                                modifier = Modifier.padding(24.dp).fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("No predefined roles found", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                                Spacer(Modifier.height(8.dp))
                                Text("Create a custom role to define what this staff member can do.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                            }
                        }
                    }
                } else {
                    items(displayRoles) { role ->
                        val isSelected = selectedRoleId == role.id
                        
                        Card(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable {
                                selectedRoleId = role.id
                            },
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
                            ),
                            border = BorderStroke(1.dp, if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(role.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                    if (isSelected) {
                                        Spacer(modifier = Modifier.weight(1f))
                                        Icon(Icons.Default.CheckCircle, contentDescription = "Selected", tint = MaterialTheme.colorScheme.primary)
                                    }
                                }
                                if (!role.isSystem) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Box(modifier = Modifier.background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(4.dp)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                                        Text("Custom", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                                    }
                                }
                                Spacer(Modifier.height(8.dp))
                                Text(role.description ?: "Access level: ${role.name}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
                
                item {
                    Spacer(Modifier.height(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { onNavigateToCustomRole() },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha=0.3f))
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Need exact granular control?", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                            Spacer(Modifier.height(4.dp))
                            Text("Leave this flow to create a custom role matrix.", style = MaterialTheme.typography.bodySmall)
                            Spacer(Modifier.height(8.dp))
                            Text("Advanced Editor →", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

