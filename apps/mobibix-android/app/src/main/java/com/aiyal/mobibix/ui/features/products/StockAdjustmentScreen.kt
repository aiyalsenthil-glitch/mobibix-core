package com.aiyal.mobibix.ui.features.products

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.StockCorrectionRequest

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StockAdjustmentScreen(
    navController: NavController,
    productId: String,
    viewModel: ProductViewModel = hiltViewModel()
) {
    var quantity by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("Stock Check Update") } // Default Reason
    var note by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var saveError by remember { mutableStateOf<String?>(null) }
    
    // We could load product details here if we want to show current stock
    // For now assuming user knows what they are correcting

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stock Adjustment") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text(
                "Correct Stock Level",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))

            if (saveError != null) {
                Text(
                    text = saveError!!,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }

            OutlinedTextField(
                value = quantity,
                onValueChange = { quantity = it },
                label = { Text("New Quantity (+/- Adjustment)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                supportingText = { Text("Enter positive to add, negative to remove") }
            )
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = reason,
                onValueChange = { reason = it },
                label = { Text("Reason") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = note,
                onValueChange = { note = it },
                label = { Text("Note (Optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3
            )
            Spacer(modifier = Modifier.height(24.dp))

            val uiState by viewModel.uiState.collectAsState()
            
            LaunchedEffect(uiState.actionSuccess) {
                if (uiState.actionSuccess) {
                    viewModel.resetActionSuccess()
                    navController.popBackStack()
                }
            }

            Button(
                onClick = {
                    val qty = quantity.toIntOrNull()
                    if (qty == null || qty == 0) {
                        saveError = "Please enter a valid non-zero quantity"
                        return@Button
                    }
                    
                    isSaving = true
                    saveError = null
                    
                    viewModel.correctStock(productId, qty, reason, note)
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Updating...")
                } else {
                    Text("Update Stock")
                }
            }
        }
    }
}
