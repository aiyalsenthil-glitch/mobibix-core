package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.model.JobStatus
import java.text.NumberFormat
import java.util.Locale

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
                ExtendedFloatingActionButton(
                    onClick = { navController.navigate("create_job") },
                    containerColor = TealAccent,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    icon = { Icon(Icons.Filled.Add, null) },
                    text = { Text("New Job", fontWeight = FontWeight.Bold) }
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            // ── Header ──
            Surface(color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text("Job Cards", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text(
                        "Track and manage repair jobs",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // ── Search ──
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = viewModel::onSearchQueryChanged,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search by No., Customer, Device") },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp)
            )

            // ── Status filter chips with count badges ──
            val jobCountByStatus = uiState.jobs.groupBy { it.status }.mapValues { it.value.size }
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = uiState.statusFilter == null,
                        onClick = { viewModel.onStatusFilterChanged(null) },
                        label = { Text("All (${uiState.jobs.size})") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = TealAccent.copy(alpha = 0.15f),
                            selectedLabelColor = TealAccent
                        )
                    )
                }
                items(JobStatus.entries.toTypedArray()) { status ->
                    val count = jobCountByStatus[status] ?: 0
                    FilterChip(
                        selected = uiState.statusFilter == status,
                        onClick = { viewModel.onStatusFilterChanged(status) },
                        label = {
                            Text(
                                if (count > 0) "${status.name.replace("_", " ")} ($count)"
                                else status.name.replace("_", " ")
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = TealAccent.copy(alpha = 0.15f),
                            selectedLabelColor = TealAccent
                        )
                    )
                }
            }

            // ── Content ──
            PullToRefreshBox(
                isRefreshing = uiState.loading,
                onRefresh = { viewModel.loadJobs(shopId) },
                modifier = Modifier.fillMaxSize()
            ) {
                when {
                    uiState.loading -> {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(5) { ShimmerJobCard() }
                        }
                    }
                    uiState.error != null -> {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Outlined.CloudOff, null, Modifier.size(48.dp), tint = MaterialTheme.colorScheme.outlineVariant)
                            Spacer(Modifier.height(12.dp))
                            Text("Couldn't load jobs", style = MaterialTheme.typography.titleMedium)
                            Text(uiState.error ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(16.dp))
                            Button(onClick = { viewModel.loadJobs(shopId) }) { Text("Retry") }
                        }
                    }
                    uiState.filteredJobs.isEmpty() -> {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(Icons.Outlined.Inbox, null, Modifier.size(56.dp), tint = MaterialTheme.colorScheme.outlineVariant)
                            Spacer(Modifier.height(12.dp))
                            Text(
                                if (uiState.statusFilter != null || uiState.searchQuery.isNotBlank()) "No jobs match your filter"
                                else "No jobs yet",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text("Tap + to create a new job", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                        }
                    }
                    else -> {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp, bottom = 88.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(uiState.filteredJobs, key = { it.id }) { job ->
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
}

// ─── Shimmer skeleton ────────────────────────
@Composable
private fun ShimmerJobCard() {
    val shimmerColors = listOf(
        MaterialTheme.colorScheme.surfaceVariant.copy(0.8f),
        MaterialTheme.colorScheme.surfaceVariant.copy(0.4f),
        MaterialTheme.colorScheme.surfaceVariant.copy(0.8f)
    )
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val offsetX by infiniteTransition.animateFloat(
        initialValue = 0f, targetValue = 1000f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing)), label = "shimmer"
    )
    val brush = Brush.linearGradient(
        shimmerColors,
        start = Offset(offsetX, 0f), end = Offset(offsetX + 300f, 0f)
    )
    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                Box(Modifier.height(18.dp).width(80.dp).background(brush, RoundedCornerShape(4.dp)))
                Box(Modifier.height(18.dp).width(60.dp).background(brush, RoundedCornerShape(8.dp)))
            }
            Box(Modifier.height(16.dp).fillMaxWidth(0.6f).background(brush, RoundedCornerShape(4.dp)))
            Box(Modifier.height(14.dp).fillMaxWidth(0.45f).background(brush, RoundedCornerShape(4.dp)))
            Box(Modifier.height(12.dp).fillMaxWidth(0.8f).background(brush, RoundedCornerShape(4.dp)))
        }
    }
}

// ─── Job card with financials row ────────────
@Composable
fun PremiumJobCard(job: JobCardResponse, onClick: () -> Unit) {
    val formatter = NumberFormat.getCurrencyInstance(Locale.Builder().setLanguage("en").setRegion("IN").build())

    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // ── Top row: job number + status chip ──
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "#${job.jobNumber}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                JobStatusChip(job.status)
            }

            // ── Customer & device ──
            Text(
                job.customerName,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                "${job.deviceBrand} ${job.deviceModel} · ${job.deviceType}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                job.customerComplaint,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // ── Financial summary row ──
            val hasFinancials = (job.estimatedCost ?: 0.0) > 0 || job.advancePaid > 0
            if (hasFinancials) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(0.5f))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    job.estimatedCost?.let { cost ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Outlined.CurrencyRupee, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(formatter.format(cost), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    if (job.advancePaid > 0) {
                        Surface(
                            color = TealAccent.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(6.dp)
                        ) {
                            Text(
                                "Adv: ${formatter.format(job.advancePaid)}",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = TealAccent,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                    job.estimatedDelivery?.takeIf { it.isNotBlank() }?.let { del ->
                        Spacer(Modifier.weight(1f))
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Outlined.CalendarToday, null, Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(del.take(10), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
