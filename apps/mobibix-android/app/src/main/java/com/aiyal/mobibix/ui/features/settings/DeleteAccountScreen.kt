package com.aiyal.mobibix.ui.features.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeleteAccountScreen(
    navController: NavController,
    viewModel: DeleteAccountViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    var acknowledged by remember { mutableStateOf(false) }
    var reason by remember { mutableStateOf("") }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Delete Account", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when (state) {
                is DeleteAccountState.Success -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(100.dp),
                            color = Color(0xFFE8F5E9),
                            modifier = Modifier.size(80.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("✓", style = MaterialTheme.typography.displayMedium, color = Color(0xFF2E7D32))
                            }
                        }
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            "Request Submitted",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "Your request has been received. Our compliance team will review and process it within 7-10 business days.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(32.dp))
                        Button(
                            onClick = { navController.popBackStack() },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Back to Settings")
                        }
                    }
                }
                else -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(20.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Danger Warning Card
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF1F0)),
                            shape = RoundedCornerShape(16.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFCF1322))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        "Irreversible Action",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFFCF1322)
                                    )
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                BulletPoint("Your business profile and all shop data will be deleted.")
                                BulletPoint("Invoices, customer records, and inventory history will be wiped.")
                                BulletPoint("All active subscriptions will be cancelled immediately.")
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Text(
                            "Final Acknowledgment",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = acknowledged,
                                onCheckedChange = { acknowledged = it },
                                colors = CheckboxDefaults.colors(checkedColor = Color(0xFFEF4444))
                            )
                            Text(
                                "I understand that this action is permanent and authorize Aiyal Groups to delete all my business data.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Text(
                            "Reason for leaving (Optional)",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = reason,
                            onValueChange = { reason = it },
                            placeholder = { Text("e.g. Switched to another vendor") },
                            modifier = Modifier.fillMaxWidth().height(120.dp),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(modifier = Modifier.height(32.dp))

                        if (state is DeleteAccountState.Error) {
                            Text(
                                (state as DeleteAccountState.Error).message,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(bottom = 16.dp)
                            )
                        }

                        Button(
                            onClick = { viewModel.requestDeletion(reason.ifBlank { null }) },
                            enabled = acknowledged && state !is DeleteAccountState.Loading,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (acknowledged) Color(0xFFEF4444) else Color.LightGray,
                                contentColor = Color.White
                            ),
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (state is DeleteAccountState.Loading) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                            } else {
                                Text("Request Permanent Deletion", fontWeight = FontWeight.Bold)
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        TextButton(
                            onClick = { navController.popBackStack() },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Keep My Account", color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BulletPoint(text: String) {
    Row(modifier = Modifier.padding(vertical = 4.dp)) {
        Text("•", color = Color(0xFFCF1322), modifier = Modifier.width(12.dp))
        Text(text, style = MaterialTheme.typography.bodySmall, color = Color(0xFF434343))
    }
}
