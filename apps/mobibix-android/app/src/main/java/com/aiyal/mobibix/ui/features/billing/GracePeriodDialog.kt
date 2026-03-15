package com.aiyal.mobibix.ui.features.billing

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog

/**
 * GracePeriodDialog — shown on app launch when subscription is PAST_DUE or nearing expiry (≤ 3 days).
 * Guides the user to the Billing screen immediately.
 *
 * Sprint 1 — Day 1 item from Cross-App Implementation Plan.
 */
@Composable
fun GracePeriodDialog(
    daysLeft: Int,
    isPastDue: Boolean,
    onGoToBilling: () -> Unit,
    onDismiss: () -> Unit
) {
    val isExpiringSoon = daysLeft in 1..3
    val isExpiredOrPastDue = isPastDue || daysLeft <= 0

    val accentColor = if (isExpiredOrPastDue) Color(0xFFEF4444) else Color(0xFFF59E0B)
    val accentLight = if (isExpiredOrPastDue) Color(0xFFFEE2E2) else Color(0xFFFEF3C7)

    val title = when {
        isExpiredOrPastDue -> "Payment Past Due"
        isExpiringSoon -> "Subscription Expiring Soon"
        else -> "Action Required"
    }

    val body = when {
        isExpiredOrPastDue ->
            "Your subscription payment is overdue. Some features are in read-only mode. Renew now to restore full access."
        isExpiringSoon ->
            "Your subscription expires in $daysLeft day${if (daysLeft == 1) "" else "s"}. Renew now to avoid any interruption."
        else ->
            "Your subscription needs attention. Please visit Billing to continue uninterrupted access."
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(28.dp),
            tonalElevation = 8.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Icon
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(accentColor, accentColor.copy(alpha = 0.7f))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isExpiredOrPastDue) Icons.Default.Warning else Icons.Default.CreditCard,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Status pill
                Surface(
                    color = accentLight,
                    shape = CircleShape
                ) {
                    Text(
                        text = if (isExpiredOrPastDue) "PAST DUE" else "${daysLeft}d LEFT",
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.ExtraBold,
                        color = accentColor
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = body,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    lineHeight = 22.sp
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Primary CTA
                Button(
                    onClick = {
                        onGoToBilling()
                        onDismiss()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = accentColor)
                ) {
                    Text(
                        text = "Renew Subscription",
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Secondary dismiss
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (isExpiredOrPastDue) "Continue in Read-Only" else "Remind Me Later",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
