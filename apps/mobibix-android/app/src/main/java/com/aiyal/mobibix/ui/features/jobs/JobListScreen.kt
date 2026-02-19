package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.model.JobStatus

private val TealAccent = Color(0xFF00C896)

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
        floatingActionButton = {
            if (isOwner) {
                FloatingActionButton(
                    onClick = { navController.navigate("create_job") },
                    containerColor = TealAccent,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(Icons.Filled.Add, contentDescription = "Create Job")
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // ── Premium Header ──
            Surface(
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text(
                        "Job Cards",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Track and manage repair jobs",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // ── Search & Filter ──
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = viewModel::onSearchQueryChanged,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    placeholder = { Text("Search by No, Customer, Device") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp)
                )
                LazyRow(
                    contentPadding = PaddingValues(vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        FilterChip(
                            selected = uiState.statusFilter == null,
                            onClick = { viewModel.onStatusFilterChanged(null) },
                            label = { Text("All") },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = TealAccent.copy(alpha = 0.15f),
                                selectedLabelColor = TealAccent
                            )
                        )
                    }
                    items(JobStatus.values()) { status ->
                        FilterChip(
                            selected = uiState.statusFilter == status,
                            onClick = { viewModel.onStatusFilterChanged(status) },
                            label = { Text(status.name.replace("_", " ")) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = TealAccent.copy(alpha = 0.15f),
                                selectedLabelColor = TealAccent
                            )
                        )
                    }
                }
            }

            // ── Content ──
            Box(modifier = Modifier.fillMaxSize()) {
                if (uiState.loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                        color = TealAccent
                    )
                } else if (uiState.error != null) {
                    Text(
                        text = uiState.error!!,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.align(Alignment.Center).padding(16.dp)
                    )
                } else if (uiState.jobs.isEmpty()) {
                    Column(
                        modifier = Modifier.align(Alignment.Center),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("No jobs found", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(8.dp))
                        Text("Tap + to create a new job", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(uiState.jobs) { job ->
                            PremiumJobCard(
                                job = job,
                                onClick = { navController.navigate("job_detail/${job.id}") }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumJobCard(job: JobCardResponse, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
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
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                PremiumStatusChip(status = job.status)
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = job.customerName,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${job.deviceBrand} ${job.deviceModel} • ${job.deviceType}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = job.customerComplaint,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun PremiumStatusChip(status: String) {
    val (bgColor, textColor) = when (status.uppercase()) {
        "IN_PROGRESS", "RECEIVED" -> TealAccent.copy(alpha = 0.12f) to TealAccent
        "WAITING_FOR_PARTS" -> Color(0xFFF59E0B).copy(alpha = 0.12f) to Color(0xFFF59E0B)
        "READY", "COMPLETED" -> Color(0xFF3B82F6).copy(alpha = 0.12f) to Color(0xFF3B82F6)
        "DELIVERED" -> Color(0xFF8B5CF6).copy(alpha = 0.12f) to Color(0xFF8B5CF6)
        "CANCELLED" -> Color(0xFFEF4444).copy(alpha = 0.12f) to Color(0xFFEF4444)
        else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.12f) to MaterialTheme.colorScheme.outline
    }
    Surface(
        color = bgColor,
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            status.replace("_", " "),
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = textColor
        )
    }
}
