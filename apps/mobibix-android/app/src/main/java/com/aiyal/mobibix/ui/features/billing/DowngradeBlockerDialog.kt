package com.aiyal.mobibix.ui.features.billing

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun DowngradeBlockerDialog(
    blockers: List<String>,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Downgrade Not Eligible", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("You cannot downgrade to this plan yet. Please resolve the following blockers first:")
                Spacer(modifier = Modifier.height(12.dp))
                blockers.forEach { blocker ->
                    Text("• $blocker", style = MaterialTheme.typography.bodyMedium)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("GOT IT")
            }
        }
    )
}
