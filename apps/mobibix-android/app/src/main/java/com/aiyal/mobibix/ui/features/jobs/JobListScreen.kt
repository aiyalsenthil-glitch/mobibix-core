package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.model.JobStatus
import com.aiyal.mobibix.ui.components.StatusChip

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobListScreen(
    shopId: String,
    navController: NavController,
    isOwner: Boolean,
    viewModel: JobViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(shopId) {
        viewModel.loadJobs(shopId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Job Cards") },
                navigationIcon = {
                    IconButton(onClick = { navController.navigateUp() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            if (isOwner) { // Or if staff has permission
                ExtendedFloatingActionButton(
                    text = { Text("New Job") },
                    icon = { Icon(Icons.Filled.Add, contentDescription = "Create Job") },
                    onClick = { navController.navigate("create_job") }
                )
            }
        }
    ) { paddingValues ->
        Column(modifier = Modifier.padding(paddingValues)) {
            // Search and Filter UI
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = viewModel::onSearchQueryChanged,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    placeholder = { Text("Search by No, Customer, Device") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true
                )
                LazyRow(
                    contentPadding = PaddingValues(vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        FilterChip(
                            selected = uiState.statusFilter == null,
                            onClick = { viewModel.onStatusFilterChanged(null) },
                            label = { Text("All") }
                        )
                    }
                    items(JobStatus.values()) { status ->
                        FilterChip(
                            selected = uiState.statusFilter == status,
                            onClick = { viewModel.onStatusFilterChanged(status) },
                            label = { Text(status.name) } // Or formatted name
                        )
                    }
                }
            }

            // Content
            Box(modifier = Modifier.fillMaxSize()) {
                if (uiState.loading) {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                } else if (uiState.error != null) {
                    Text(
                        text = uiState.error!!,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center).padding(16.dp)
                    )
                } else if (uiState.jobs.isEmpty()) {
                    Text(
                        text = "No jobs found",
                        modifier = Modifier.align(Alignment.Center).padding(16.dp)
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(uiState.jobs) { job ->
                            JobItem(job = job, onClick = { navController.navigate("job_detail/${job.id}") })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun JobItem(job: JobCardResponse, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "#${job.jobNumber}",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                StatusChip(status = job.status)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = job.customerName, style = MaterialTheme.typography.bodyLarge)
            Text(
                text = "${job.deviceBrand} ${job.deviceModel} - ${job.deviceType}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Problem: ${job.customerComplaint}",
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1
            )
        }
    }
}
