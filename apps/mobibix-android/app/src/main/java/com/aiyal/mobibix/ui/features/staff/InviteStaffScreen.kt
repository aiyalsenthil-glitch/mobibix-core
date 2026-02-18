package com.aiyal.mobibix.ui.features.staff

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.data.network.InviteStaffRequest
import com.aiyal.mobibix.data.network.StaffApi
import dagger.hilt.android.EntryPointAccessors
import kotlinx.coroutines.launch

@Composable
fun InviteStaffScreen(
    staffApi: StaffApi,
    activeShopId: String,
    onDone: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text("Invite Staff", style = MaterialTheme.typography.headlineMedium)

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email or Phone") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(Modifier.height(16.dp))

        if (error != null) {
            Text(error!!, color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.height(8.dp))
        }

        Button(
            enabled = !loading && email.isNotBlank(),
            onClick = {
                loading = true
                error = null
                scope.launch {
                    try {
                        staffApi.invite(
                            InviteStaffRequest(
                                email = email,
                                role = "STAFF",
                                shopId = activeShopId
                            )
                        )
                        onDone()
                    } catch (e: Exception) {
                        error = e.message ?: "Invite failed"
                    } finally {
                        loading = false
                    }
                }
            }
        ) {
            Text(if (loading) "Inviting..." else "Invite")
        }
    }
}
