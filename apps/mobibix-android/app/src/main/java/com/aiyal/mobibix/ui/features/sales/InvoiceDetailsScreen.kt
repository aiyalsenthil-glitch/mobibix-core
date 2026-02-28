package com.aiyal.mobibix.ui.features.sales

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.data.network.InvoiceDetails

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailsScreen(
    invoiceId: String,
    shopId: String,          // A7 FIX: needed to load shop for invoice print
    navController: NavController,
    viewModel: SalesViewModel = hiltViewModel(),
    canCancel: Boolean
) {
    val state by viewModel.invoiceWithShop.collectAsState()
    val cancelError by viewModel.cancelError.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(cancelError) {
        cancelError?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearCancelError()
        }
    }

    LaunchedEffect(invoiceId) {
        viewModel.loadInvoiceDetails(invoiceId, shopId) // A7: pass shopId for print
    }

    if (state == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val invoice = state!!.invoice
    val context = LocalContext.current

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Invoice #${invoice.invoiceNumber}") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(Modifier.padding(padding).padding(16.dp)) {
            Text("Status: ${invoice.status}", style = MaterialTheme.typography.bodyMedium)
            Text("Date: ${invoice.invoiceDate}", style = MaterialTheme.typography.bodyMedium)
            
            Spacer(Modifier.height(16.dp))
            
            if (!invoice.customerName.isNullOrBlank()) {
                Text("Customer: ${invoice.customerName}")
                Text("Phone: ${invoice.customerPhone ?: "N/A"}")
                Spacer(Modifier.height(8.dp))
            }

            HorizontalDivider()
            Spacer(Modifier.height(8.dp))

            invoice.items.forEach { item ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("${item.productName}", style = MaterialTheme.typography.bodyLarge)
                Text("${item.quantity} x ₹${"%,.2f".format(item.rate)}", style = MaterialTheme.typography.bodySmall)
                    }
                    Text("₹${"%,.2f".format(item.lineTotal)}", style = MaterialTheme.typography.bodyLarge)
                }
                Spacer(Modifier.height(4.dp))
            }

            Spacer(Modifier.height(8.dp))
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                 Text("Sub Total:")
                 Text("₹${"%,.2f".format(invoice.subTotal)}")
            }
            if (invoice.gstAmount > 0) {
                 Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                     Text("GST:")
                     Text("₹${"%,.2f".format(invoice.gstAmount)}")
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                 Text("Total:", style = MaterialTheme.typography.titleMedium)
                 Text("₹${"%,.2f".format(invoice.totalAmount)}", style = MaterialTheme.typography.titleMedium)
            }

            Spacer(Modifier.height(24.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { shareInvoice(context, invoice) },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Share Text")
                }

                Button(
                    onClick = { 
                        navController.navigate("invoice_print_preview/${invoice.id}")
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                ) {
                    Text("Print PDF")
                }
                
                if (canCancel && invoice.status != "CANCELLED") {
                    Button(
                        onClick = { viewModel.cancelInvoice(invoice.id) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                    ) {
                        Text("Cancel")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoicePrintPreviewScreen(
    invoiceId: String,
    navController: NavController,
    viewModel: SalesViewModel = hiltViewModel()
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoice Print Preview") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            Text("PDF Generation coming in next update. Use 'Share Text' for now.")
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = { navController.popBackStack() }) {
                Text("Back")
            }
        }
    }
}

private fun shareInvoice(context: android.content.Context, invoice: com.aiyal.mobibix.data.network.InvoiceDetails) {
    val itemsText = invoice.items.joinToString("\n") { 
        "${it.quantity} x ${it.productName} @ ₹${it.rate} = ₹${it.lineTotal}" 
    }
    
    val text = """
        🧾 INVOICE #${invoice.invoiceNumber}
        📅 Date: ${invoice.invoiceDate}
        
        👤 Customer: ${invoice.customerName ?: "N/A"}
        📞 Phone: ${invoice.customerPhone ?: "N/A"}
        
        🛒 ITEMS:
        $itemsText
        
        --------------------------------
        Sub Total: ₹${invoice.subTotal}
        GST: ₹${invoice.gstAmount}
        --------------------------------
        💰 GRAND TOTAL: ₹${invoice.totalAmount}
        
        Thank you for your business!
    """.trimIndent()

    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(android.content.Intent.EXTRA_TEXT, text)
    }
    context.startActivity(android.content.Intent.createChooser(intent, "Share Receipt"))
}
