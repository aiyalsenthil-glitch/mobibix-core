package com.aiyal.mobibix.ui.features.suppliers

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.aiyal.mobibix.data.network.Supplier

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditSupplierSheet(
    supplier: Supplier?,
    onDismiss: () -> Unit,
    onSave: (name: String, phone: String, email: String, address: String, gstin: String) -> Unit,
    isSaving: Boolean,
    saveError: String?
) {
    var name by remember { mutableStateOf(supplier?.name ?: "") }
    var phone by remember { mutableStateOf(supplier?.phone ?: "") }
    var email by remember { mutableStateOf(supplier?.email ?: "") }
    var address by remember { mutableStateOf(supplier?.address ?: "") }
    var gstin by remember { mutableStateOf(supplier?.gstin ?: "") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp) // Add padding for navigation bar
                .navigationBarsPadding() // Ensure it respects system bars
        ) {
            Text(
                text = if (supplier == null) "Add Supplier" else "Edit Supplier",
                style = MaterialTheme.typography.headlineSmall
            )
            Spacer(modifier = Modifier.height(16.dp))

            if (saveError != null) {
                Text(
                    text = saveError,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Business Name*") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Phone") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                )
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = gstin,
                onValueChange = { gstin = it },
                label = { Text("GSTIN") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = address,
                onValueChange = { address = it },
                label = { Text("Address") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2,
                maxLines = 3
            )
            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = { onSave(name, phone, email, address, gstin) },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSaving && name.isNotBlank()
            ) {
                if (isSaving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Saving...")
                } else {
                    Text(if (supplier == null) "Create Supplier" else "Update Supplier")
                }
            }
        }
    }
}
