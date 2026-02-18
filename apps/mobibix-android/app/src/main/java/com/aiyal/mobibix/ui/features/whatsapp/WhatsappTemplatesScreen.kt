package com.aiyal.mobibix.ui.features.whatsapp

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.ui.theme.MobiBixTheme
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.WhatsappTemplate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WhatsappTemplatesScreen(
    navController: NavController,
    viewModel: WhatsappViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadTemplates()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Message Templates") },
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
        ) {
            if (uiState.isLoading) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp)
                )
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.templates) { template ->
                    TemplateItem(template)
                }
            }
        }
    }
}

@Composable
fun TemplateItem(template: WhatsappTemplate) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = template.name, fontWeight = FontWeight.Bold)
                Text(
                    text = template.status,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (template.status == "APPROVED") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = "Category: ${template.category}", style = MaterialTheme.typography.bodySmall)
            Text(text = "Language: ${template.language}", style = MaterialTheme.typography.bodySmall)
            
            // Preview body text if available
            val bodyText = template.components.find { it.type == "BODY" }?.text
            if (bodyText != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = bodyText, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
