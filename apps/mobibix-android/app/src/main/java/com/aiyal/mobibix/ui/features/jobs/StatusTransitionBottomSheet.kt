package com.aiyal.mobibix.ui.features.jobs

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.model.JobStatus

/**
 * StatusTransitionBottomSheet
 *
 * Shows only the valid next statuses for a given current status.
 * If the job has an advance balance and the target is a terminal status,
 * it signals the caller to show a refund dialog first.
 */

private data class NextStatusOption(
    val status: JobStatus,
    val label: String,
    val description: String,
    val icon: ImageVector,
    val isDestructive: Boolean = false
)

private val VALID_TRANSITIONS: Map<JobStatus, List<JobStatus>> = mapOf(
    JobStatus.RECEIVED       to listOf(JobStatus.ASSIGNED, JobStatus.DIAGNOSING, JobStatus.CANCELLED),
    JobStatus.ASSIGNED       to listOf(JobStatus.DIAGNOSING, JobStatus.CANCELLED),
    JobStatus.DIAGNOSING     to listOf(JobStatus.WAITING_APPROVAL, JobStatus.IN_PROGRESS, JobStatus.CANCELLED),
    JobStatus.WAITING_APPROVAL to listOf(JobStatus.APPROVED, JobStatus.CANCELLED),
    JobStatus.APPROVED       to listOf(JobStatus.WAITING_FOR_PARTS, JobStatus.IN_PROGRESS, JobStatus.CANCELLED),
    JobStatus.WAITING_FOR_PARTS to listOf(JobStatus.IN_PROGRESS, JobStatus.CANCELLED),
    JobStatus.IN_PROGRESS    to listOf(JobStatus.READY, JobStatus.WAITING_FOR_PARTS, JobStatus.CANCELLED, JobStatus.SCRAPPED),
    JobStatus.READY          to listOf(JobStatus.DELIVERED, JobStatus.RETURNED, JobStatus.IN_PROGRESS, JobStatus.SCRAPPED),
    JobStatus.CANCELLED      to listOf(), // Reopen is a separate action
    JobStatus.DELIVERED      to listOf(),
    JobStatus.RETURNED       to listOf(),
    JobStatus.SCRAPPED       to listOf()
)

private fun statusOption(status: JobStatus): NextStatusOption = when (status) {
    JobStatus.RECEIVED        -> NextStatusOption(status, "Received", "Device received at shop", Icons.Outlined.Inbox)
    JobStatus.ASSIGNED        -> NextStatusOption(status, "Assign Technician", "Assign to a technician", Icons.Outlined.Person)
    JobStatus.DIAGNOSING      -> NextStatusOption(status, "Start Diagnosis", "Begin fault diagnosis", Icons.Outlined.Search)
    JobStatus.WAITING_APPROVAL -> NextStatusOption(status, "Awaiting Approval", "Send estimate to customer", Icons.Outlined.HourglassEmpty)
    JobStatus.APPROVED        -> NextStatusOption(status, "Customer Approved", "Proceed with repair", Icons.Outlined.CheckCircle)
    JobStatus.WAITING_FOR_PARTS -> NextStatusOption(status, "Waiting for Parts", "Parts on order", Icons.Outlined.Inventory2)
    JobStatus.IN_PROGRESS     -> NextStatusOption(status, "In Progress", "Repair underway", Icons.Outlined.Build)
    JobStatus.READY           -> NextStatusOption(status, "Mark as Ready", "Device fixed, ready to collect", Icons.Outlined.Done)
    JobStatus.DELIVERED       -> NextStatusOption(status, "Mark Delivered", "Hand over to customer", Icons.Outlined.DeliveryDining)
    JobStatus.RETURNED        -> NextStatusOption(status, "Return to Customer", "Returning unrepaired", Icons.Outlined.Undo, isDestructive = true)
    JobStatus.CANCELLED       -> NextStatusOption(status, "Cancel Job", "Void this job", Icons.Outlined.Cancel, isDestructive = true)
    JobStatus.SCRAPPED        -> NextStatusOption(status, "Scrap Device", "Device cannot be repaired", Icons.Outlined.Delete, isDestructive = true)
    JobStatus.UNKNOWN         -> NextStatusOption(status, "Unknown", "Unknown status", Icons.Outlined.QuestionMark)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatusTransitionBottomSheet(
    currentStatus: JobStatus,
    advancePaid: Double,
    onDismiss: () -> Unit,
    onStatusSelected: (JobStatus) -> Unit,     // called when no refund needed
    onStatusWithRefund: (JobStatus) -> Unit     // called when advance > 0 + terminal status
) {
    val options = (VALID_TRANSITIONS[currentStatus] ?: emptyList()).map { statusOption(it) }

    if (options.isEmpty()) {
        onDismiss(); return
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(modifier = Modifier.padding(bottom = 32.dp)) {
            // Handle
            Box(
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .padding(bottom = 16.dp)
                    .size(width = 40.dp, height = 4.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.outlineVariant)
            )

            Text(
                text = "Move Job to…",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            LazyColumn {
                items(options) { option ->
                    val isTerminal = option.status in listOf(
                        JobStatus.CANCELLED, JobStatus.RETURNED, JobStatus.SCRAPPED
                    )
                    val needsRefund = isTerminal && advancePaid > 0

                    StatusOptionRow(
                        option = option,
                        needsRefundWarning = needsRefund,
                        advancePaid = advancePaid,
                        onClick = {
                            if (needsRefund) {
                                onStatusWithRefund(option.status)
                            } else {
                                onStatusSelected(option.status)
                            }
                            onDismiss()
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusOptionRow(
    option: NextStatusOption,
    needsRefundWarning: Boolean,
    advancePaid: Double,
    onClick: () -> Unit
) {
    val tint = if (option.isDestructive) MaterialTheme.colorScheme.error
               else MaterialTheme.colorScheme.primary

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Surface(
            shape = CircleShape,
            color = tint.copy(alpha = 0.1f),
            modifier = Modifier.size(44.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(option.icon, contentDescription = null, tint = tint, modifier = Modifier.size(22.dp))
            }
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(option.label, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, color = tint)
            Text(
                text = if (needsRefundWarning) "Refund ₹$advancePaid advance first" else option.description,
                style = MaterialTheme.typography.bodySmall,
                color = if (needsRefundWarning) MaterialTheme.colorScheme.error
                        else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Icon(
            Icons.Outlined.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
    }
}
