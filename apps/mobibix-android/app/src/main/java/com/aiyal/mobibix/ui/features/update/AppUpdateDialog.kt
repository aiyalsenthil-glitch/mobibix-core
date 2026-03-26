package com.aiyal.mobibix.ui.features.update

import android.content.Intent
import android.net.Uri
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

/**
 * Non-dismissible dialog shown when the app version is below the backend's minVersionCode.
 * The user cannot proceed until they update.
 */
@Composable
fun ForceUpdateDialog(
    latestVersionName: String?,
    updateUrl: String?,
    releaseNotes: String?
) {
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = { /* Non-dismissible */ },
        title = { Text("Update Required") },
        text = {
            Text(
                "Version ${latestVersionName ?: "Latest"} is required to continue using MobiBix.\n\n${releaseNotes ?: ""}"
            )
        },
        confirmButton = {
            Button(
                onClick = {
                    if (!updateUrl.isNullOrBlank()) {
                        context.startActivity(
                            Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl))
                        )
                    }
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text("Update Now")
            }
        },
        // No dismiss button — user must update
    )
}

/**
 * Dismissible dialog shown when a newer version is available but not mandatory.
 */
@Composable
fun SoftUpdateDialog(
    latestVersionName: String?,
    updateUrl: String?,
    releaseNotes: String?,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Update Available") },
        text = {
            Text(
                "Version ${latestVersionName ?: "Latest"} is available.\n\n${releaseNotes ?: ""}"
            )
        },
        confirmButton = {
            Button(onClick = {
                if (!updateUrl.isNullOrBlank()) {
                context.startActivity(
                    Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl))
                )
                }
                onDismiss()
            }) {
                Text("Update")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Later")
            }
        }
    )
}
