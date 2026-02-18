package com.aiyal.mobibix.ui.features.whatsapp

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WhatsappCreateCampaignScreen(
    navController: NavController,
    viewModel: WhatsappViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val scope = rememberCoroutineScope()
    
    var name by remember { mutableStateOf("") }
    var selectedTemplate by remember { mutableStateOf("") }
    var selectedAudience by remember { mutableStateOf("ALL_CUSTOMERS") }
    var expandedTemplate by remember { mutableStateOf(false) }
    var expandedAudience by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadTemplates()
    }

    LaunchedEffect(uiState.campaignCreated) {
        if (uiState.campaignCreated) {
            viewModel.clearCampaignCreated()
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Campaign") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Campaign Name") },
                modifier = Modifier.fillMaxWidth()
            )

            // Template Dropdown
            ExposedDropdownMenuBox(
                expanded = expandedTemplate,
                onExpandedChange = { expandedTemplate = !expandedTemplate },
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    readOnly = true,
                    value = selectedTemplate,
                    onValueChange = { },
                    label = { Text("Select Template") },
                    trailingIcon = { Icon(Icons.Default.ArrowDropDown, null) },
                    colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = expandedTemplate,
                    onDismissRequest = { expandedTemplate = false }
                ) {
                    uiState.templates.forEach { template ->
                        DropdownMenuItem(
                            text = { Text(template.name) },
                            onClick = {
                                selectedTemplate = template.name
                                expandedTemplate = false
                            }
                        )
                    }
                }
            }

            // Audience Dropdown
            ExposedDropdownMenuBox(
                expanded = expandedAudience,
                onExpandedChange = { expandedAudience = !expandedAudience },
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedTextField(
                    readOnly = true,
                    value = selectedAudience,
                    onValueChange = { },
                    label = { Text("Select Audience") },
                    trailingIcon = { Icon(Icons.Default.ArrowDropDown, null) },
                    colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors(),
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = expandedAudience,
                    onDismissRequest = { expandedAudience = false }
                ) {
                    listOf("ALL_CUSTOMERS", "HIGH_VALUE", "INACTIVE").forEach { audience ->
                        DropdownMenuItem(
                            text = { Text(audience) },
                            onClick = {
                                selectedAudience = audience
                                expandedAudience = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (name.isNotBlank() && selectedTemplate.isNotBlank()) {
                        viewModel.createCampaign(name, selectedTemplate, selectedAudience)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Create Campaign")
                }
            }

            if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}
