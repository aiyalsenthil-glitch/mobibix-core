package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
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
            Column {
                TopAppBar(title = { Text("Job Cards") })
                // Search Bar
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = viewModel::onSearchQueryChanged,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    placeholder = { Text("Search by No, Customer, Device") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true
                )
                // Filter Chips
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(bottom = 8.dp)
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
        },
        floatingActionButton = {
            if (isOwner) { // Or if staff has permission
                FloatingActionButton(onClick = { navController.navigate("create_job") }) {
                    Icon(Icons.Filled.Add, contentDescription = "Create Job")
                }
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues).fillMaxSize()) {
            if (uiState.loading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.Center)
                )
            } else if (uiState.jobs.isEmpty()) {
                Text(
                    text = "No jobs found",
                    modifier = Modifier.align(Alignment.Center)
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.jobs) { job ->
                        JobItem(job = job, onClick = { navController.navigate("job_detail/${job.id}") })
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
        elevation = CardDefaults.cardElevation(2.dp)
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
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = job.customerName, style = MaterialTheme.typography.bodyLarge)
            Text(
                text = "${job.deviceBrand} ${job.deviceModel} - ${job.deviceType}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
             Text(
                text = "Problem: ${job.customerComplaint}",
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1
            )
        }
    }
}
