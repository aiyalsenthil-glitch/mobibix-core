package com.aiyal.mobibix.ui.features.products

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.core.utils.CsvUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImportProductsScreen(
    navController: NavController,
    viewModel: ImportExportViewModel = hiltViewModel()
) {
    val importState by viewModel.importState.collectAsState()
    val context = LocalContext.current

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
        onResult = { uri: Uri? ->
            uri?.let {
                val inputStream = context.contentResolver.openInputStream(it)
                inputStream?.let { stream -> viewModel.parseCsv(stream) }
            }
        }
    )

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Import Products") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            when (val state = importState) {
                is ImportState.Idle -> {
                    Spacer(Modifier.height(32.dp))
                    Icon(
                        imageVector = Icons.Default.UploadFile,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "Upload CSV File",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "Required columns: Name, SalePrice, StockQty",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(24.dp))
                    Button(onClick = { filePicker.launch(arrayOf("text/csv", "text/comma-separated-values", "application/csv")) }) {
                        Text("Pick CSV File")
                    }
                }
                is ImportState.Parsing -> {
                    CircularProgressIndicator()
                    Text("Reading CSV file...", modifier = Modifier.padding(top = 16.dp))
                }
                is ImportState.Preview -> {
                    Text(
                        "Found ${state.rows.size} products",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Spacer(Modifier.height(8.dp))
                    Divider()
                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(state.rows) { row ->
                            ListItem(
                                headlineContent = { Text(row.name) },
                                supportingContent = { Text("Price: ${row.salePrice} • Stock: ${row.stockQty}") }
                            )
                        }
                    }
                    Button(
                        onClick = { viewModel.confirmImport() },
                        modifier = Modifier.fillMaxWidth().padding(top = 16.dp)
                    ) {
                        Text("Import ${state.rows.size} Products")
                    }
                }
                is ImportState.Importing -> {
                    LinearProgressIndicator(
                        progress = state.progress.toFloat() / state.total.toFloat(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text(
                        "Importing ${state.progress}/${state.total}",
                        modifier = Modifier.padding(top = 16.dp)
                    )
                }
                is ImportState.Success -> {
                    Icon(
                        imageVector = Icons.Default.UploadFile, // Should checkMark but using default for now
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        "Import Complete!",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text("Successfully imported: ${state.successCount}")
                    if (state.failCount > 0) {
                        Text("Failed: ${state.failCount}", color = MaterialTheme.colorScheme.error)
                    }
                    Spacer(Modifier.height(24.dp))
                    Button(onClick = { navController.popBackStack() }) {
                        Text("Done")
                    }
                }
                is ImportState.Error -> {
                    Text(
                        text = state.message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Button(onClick = { viewModel.resetImport() }, modifier = Modifier.padding(top = 16.dp)) {
                        Text("Try Again")
                    }
                }
            }
        }
    }
}
