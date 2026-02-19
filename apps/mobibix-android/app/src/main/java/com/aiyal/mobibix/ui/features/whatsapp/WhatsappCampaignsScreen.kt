package com.aiyal.mobibix.ui.features.whatsapp

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.WhatsappCampaign

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WhatsappCampaignsScreen(
    navController: NavController,
    viewModel: WhatsappViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadCampaigns()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Marketing Campaigns") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { navController.navigate("whatsapp_create_campaign") }) {
                Icon(Icons.Default.Add, contentDescription = "Create Campaign")
            }
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
                items(uiState.campaigns) { campaign ->
                    CampaignItem(campaign)
                }
            }
        }
    }
}

@Composable
fun CampaignItem(campaign: WhatsappCampaign) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = campaign.name, fontWeight = FontWeight.Bold)
                Text(
                    text = campaign.status,
                    style = MaterialTheme.typography.labelSmall,
                    color = when (campaign.status) {
                        "SENT" -> MaterialTheme.colorScheme.primary
                        "FAILED" -> MaterialTheme.colorScheme.error
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    }
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = "Template: ${campaign.templateName}", style = MaterialTheme.typography.bodySmall)
            if (campaign.scheduledTime != null) {
                Text(text = "Scheduled: ${campaign.scheduledTime}", style = MaterialTheme.typography.bodySmall)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "Sent", style = MaterialTheme.typography.labelSmall)
                    Text(text = "${campaign.sentCount}", fontWeight = FontWeight.Bold)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "Delivered", style = MaterialTheme.typography.labelSmall)
                    Text(text = "${campaign.deliveredCount}", fontWeight = FontWeight.Bold)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = "Read", style = MaterialTheme.typography.labelSmall)
                    Text(text = "${campaign.readCount}", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
