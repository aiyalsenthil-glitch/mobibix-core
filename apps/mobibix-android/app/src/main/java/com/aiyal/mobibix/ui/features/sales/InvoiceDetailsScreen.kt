package com.aiyal.mobibix.ui.features.sales

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.widget.FrameLayout
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.aiyal.mobibix.BuildConfig
import com.aiyal.mobibix.core.shop.ShopContextProvider
import com.aiyal.mobibix.data.network.InvoiceDetails
import com.aiyal.mobibix.ui.features.print.InvoicePrintData
import com.aiyal.mobibix.ui.features.print.InvoicePrintItem
import com.aiyal.mobibix.ui.features.print.InvoicePrintLayout
import com.aiyal.mobibix.ui.features.print.captureViewToBitmap
import com.aiyal.mobibix.ui.features.print.createPrintablePdf
import com.aiyal.mobibix.util.PdfPrintAdapter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailsScreen(
    invoiceId: String,
    shopId: String,
    navController: NavController,
    viewModel: SalesViewModel = hiltViewModel(),
    canCancel: Boolean
) {
    val state by viewModel.invoiceWithShop.collectAsState()
    val cancelError by viewModel.cancelError.collectAsState()
    val actionLoading by viewModel.actionLoading.collectAsState()
    val actionError by viewModel.actionError.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var showPaymentDialog by remember { mutableStateOf(false) }

    LaunchedEffect(cancelError) {
        cancelError?.let { snackbarHostState.showSnackbar(it); viewModel.clearCancelError() }
    }
    LaunchedEffect(actionError) {
        actionError?.let { snackbarHostState.showSnackbar(it); viewModel.clearActionError() }
    }
    LaunchedEffect(invoiceId) {
        viewModel.loadInvoiceDetails(invoiceId, shopId)
    }

    if (state == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        }
        return
    }

    val invoice = state!!.invoice
    val shop = state!!.shop
    val context = LocalContext.current
    val isUnpaid = invoice.balanceAmount > 0 || invoice.status == "CREDIT" || invoice.status == "PARTIALLY_PAID"

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Invoice #${invoice.invoiceNumber}", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Status + Date card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.DateRange, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Text(
                            formatInvoiceDate(invoice.invoiceDate),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Surface(
                        color = invoiceStatusColor(invoice.status).copy(alpha = 0.12f),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            invoice.status.replace("_", " "),
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                            color = invoiceStatusColor(invoice.status),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Customer card
            if (!invoice.customerName.isNullOrBlank()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Person, null, modifier = Modifier.size(22.dp), tint = MaterialTheme.colorScheme.primary)
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("Customer", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                            Text(invoice.customerName, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyLarge)
                            if (!invoice.customerPhone.isNullOrBlank()) {
                                Text(invoice.customerPhone, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (!invoice.customerGstin.isNullOrBlank()) {
                                Text("GSTIN: ${invoice.customerGstin}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            // Items card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.ShoppingCart, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                        Text("Items", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    invoice.items.forEachIndexed { idx, item ->
                        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.Top) {
                            Column(Modifier.weight(1f).padding(end = 8.dp)) {
                                Text(
                                    item.productName?.takeIf { it.isNotBlank() } ?: "Custom Item",
                                    fontWeight = FontWeight.Medium,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    "${item.quantity} × ₹${"%.2f".format(item.rate)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                if (!item.imeis.isNullOrEmpty()) {
                                    Text("S/N: ${item.imeis.joinToString()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                                }
                            }
                            Text("₹${"%.2f".format(item.lineTotal)}", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                        }
                        if (idx < invoice.items.size - 1) {
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    InvoiceTotalsRow("Sub Total", invoice.subTotal)
                    if (invoice.gstAmount > 0) InvoiceTotalsRow("GST", invoice.gstAmount)
                    Spacer(Modifier.height(2.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            Text("₹${"%.2f".format(invoice.totalAmount)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    if (invoice.balanceAmount > 0) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.error.copy(alpha = 0.08f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp).fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Balance Due", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                                Text("₹${"%.2f".format(invoice.balanceAmount)}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                            }
                        }
                    }
                }
            }

            // Actions
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (isUnpaid && invoice.status != "CANCELLED") {
                    Button(
                        onClick = { showPaymentDialog = true },
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        enabled = !actionLoading,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.CreditCard, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Collect Payment", fontWeight = FontWeight.SemiBold)
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { navController.navigate("invoice_print_preview/$invoiceId/$shopId?autoShare=true") },
                        modifier = Modifier.weight(1f).height(46.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
                    ) {
                        Icon(Icons.Default.Share, null, Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Share PDF")
                    }
                    OutlinedButton(
                        onClick = { navController.navigate("invoice_print_preview/$invoiceId/$shopId") },
                        modifier = Modifier.weight(1f).height(46.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
                    ) {
                        Icon(Icons.Default.Print, null, Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Print")
                    }
                }

                if (!invoice.customerPhone.isNullOrBlank()) {
                    OutlinedButton(
                        onClick = {
                            viewModel.sendInvoiceWhatsApp(
                                invoice = invoice,
                                shopId = shopId,
                                shopName = shop?.name ?: "",
                                onSuccess = { scope.launch { snackbarHostState.showSnackbar("WhatsApp sent!") } },
                                onError = { msg -> scope.launch { snackbarHostState.showSnackbar(msg) } }
                            )
                        },
                        modifier = Modifier.fillMaxWidth().height(46.dp),
                        enabled = !actionLoading && !invoice.whatsappSent,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF25D366)),
                        border = BorderStroke(1.dp, Color(0xFF25D366).copy(alpha = 0.5f))
                    ) {
                        if (actionLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.Phone, null, Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(if (invoice.whatsappSent) "WhatsApp Sent" else "Send WhatsApp", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }

                if (canCancel && invoice.status != "CANCELLED") {
                    TextButton(
                        onClick = { viewModel.cancelInvoice(invoice.id) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error)
                    ) {
                        Icon(Icons.Default.Cancel, null, Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Cancel Invoice")
                    }
                }
            }
        }
    }

    if (showPaymentDialog) {
        CollectPaymentDialog(
            balance = invoice.balanceAmount.takeIf { it > 0 } ?: invoice.totalAmount,
            isSaving = actionLoading,
            onDismiss = { showPaymentDialog = false },
            onConfirm = { amount, method, ref ->
                viewModel.collectPayment(invoice.id, amount, method, ref) {
                    showPaymentDialog = false
                    scope.launch { snackbarHostState.showSnackbar("Payment recorded") }
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CollectPaymentDialog(
    balance: Double,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (amount: Double, method: String, ref: String?) -> Unit
) {
    var amountText by remember { mutableStateOf("%.2f".format(balance)) }
    var selectedMethod by remember { mutableStateOf("CASH") }
    var reference by remember { mutableStateOf("") }
    var methodExpanded by remember { mutableStateOf(false) }
    val methods = listOf("CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Collect Payment") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Balance: ₹${"%.2f".format(balance)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Amount (₹)") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )
                ExposedDropdownMenuBox(expanded = methodExpanded, onExpandedChange = { methodExpanded = it }) {
                    OutlinedTextField(
                        value = selectedMethod,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Method") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(methodExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable)
                    )
                    ExposedDropdownMenu(expanded = methodExpanded, onDismissRequest = { methodExpanded = false }) {
                        methods.forEach { m -> DropdownMenuItem(text = { Text(m) }, onClick = { selectedMethod = m; methodExpanded = false }) }
                    }
                }
                OutlinedTextField(
                    value = reference,
                    onValueChange = { reference = it },
                    label = { Text("Transaction Ref (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { amountText.toDoubleOrNull()?.let { onConfirm(it, selectedMethod, reference.ifBlank { null }) } },
                enabled = !isSaving && (amountText.toDoubleOrNull() ?: 0.0) > 0
            ) {
                if (isSaving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Text("Confirm")
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun InvoiceTotalsRow(label: String, amount: Double, bold: Boolean = false, color: androidx.compose.ui.graphics.Color = androidx.compose.ui.graphics.Color.Unspecified) {
    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
        Text(label, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal)
        Text("₹${"%.2f".format(amount)}", fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal, color = color)
    }
}

private fun formatInvoiceDate(isoDate: String): String = try {
    val inputFmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
    val outputFmt = java.text.SimpleDateFormat("dd MMM yyyy", java.util.Locale.getDefault())
    val d = inputFmt.parse(isoDate.take(10))
    if (d != null) outputFmt.format(d) else isoDate.take(10)
} catch (_: Exception) { isoDate.take(10) }

private fun invoiceStatusColor(status: String): Color = when (status.uppercase()) {
    "PAID"           -> Color(0xFF00C896)
    "PARTIALLY_PAID" -> Color(0xFFF59E0B)
    "CREDIT"         -> Color(0xFF8B5CF6)
    "CANCELLED", "VOIDED" -> Color(0xFFEF4444)
    "FINAL"          -> Color(0xFF3B82F6)
    else             -> Color(0xFF6B7280)
}

private fun shareInvoiceText(context: android.content.Context, invoice: InvoiceDetails) {
    val itemsText = invoice.items.joinToString("\n") { "${it.quantity} x ${it.productName?.takeIf { n -> n.isNotBlank() } ?: "Item"} @ ₹${it.rate} = ₹${it.lineTotal}" }
    val text = """
🧾 INVOICE #${invoice.invoiceNumber}
📅 Date: ${formatInvoiceDate(invoice.invoiceDate)}

👤 Customer: ${invoice.customerName ?: "N/A"}
📞 Phone: ${invoice.customerPhone ?: "N/A"}

🛒 ITEMS:
$itemsText

--------------------------------
Sub Total: ₹${"%.2f".format(invoice.subTotal)}
GST: ₹${"%.2f".format(invoice.gstAmount)}
--------------------------------
💰 GRAND TOTAL: ₹${"%.2f".format(invoice.totalAmount)}

Thank you for your business!
    """.trimIndent()
    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(android.content.Intent.EXTRA_TEXT, text)
    }
    context.startActivity(android.content.Intent.createChooser(intent, "Share Invoice"))
}

// ─────────────────────────────────────────────
// Invoice Print Preview — uses InvoicePrintLayout to render + export PDF
// ─────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoicePrintPreviewScreen(
    invoiceId: String,
    shopId: String,
    navController: NavController,
    autoShare: Boolean = false,
    viewModel: SalesViewModel = hiltViewModel()
) {
    val state by viewModel.invoiceWithShop.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity ?: return

    LaunchedEffect(invoiceId) {
        viewModel.loadInvoiceDetails(invoiceId, shopId)
    }

    if (state == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }

    val invoice = state!!.invoice
    val shop = state!!.shop

    val printData = remember(invoice, shop) {
        InvoicePrintData(
            invoiceNumber = invoice.invoiceNumber,
            date = formatInvoiceDate(invoice.invoiceDate),
            shopName = shop?.name ?: "",
            shopAddress = shop?.address ?: "",
            shopPhone = shop?.phone ?: "",
            shopGstin = shop?.gstNumber ?: invoice.shopGstin,
            customerName = invoice.customerName,
            customerPhone = invoice.customerPhone,
            items = invoice.items.map { InvoicePrintItem(it.productName?.takeIf { n -> n.isNotBlank() } ?: "Item", it.quantity, it.rate, it.lineTotal) },
            subTotal = invoice.subTotal,
            gstAmount = invoice.gstAmount,
            totalAmount = invoice.totalAmount,
            invoiceFooter = "Thank you for your business!",
            terms = emptyList()
        )
    }

    val printableView = remember { mutableStateOf<FrameLayout?>(null) }
    val autoShareTriggered = remember { mutableStateOf(false) }

    fun generateAndUsePdf(onPdfReady: (File) -> Unit) {
        val targetView = printableView.value ?: return
        captureViewToBitmap(activity, targetView) { bitmap ->
            val pdfFile = createPrintablePdf(context, bitmap, invoice.invoiceNumber)
            onPdfReady(pdfFile)
        }
    }

    // Auto-trigger PDF share when navigated here from Share button
    LaunchedEffect(printableView.value) {
        if (autoShare && !autoShareTriggered.value && printableView.value != null) {
            autoShareTriggered.value = true
            delay(500) // allow the view to fully render
            generateAndUsePdf { pdfFile -> shareInvoicePdf(context, pdfFile) }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoice Preview", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Preview render (captured for PDF)
            AndroidView(
                factory = { ctx -> FrameLayout(ctx).apply { printableView.value = this } },
                modifier = Modifier.fillMaxWidth(),
                update = { frame ->
                    frame.removeAllViews()
                    frame.addView(ComposeView(frame.context).apply {
                        setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
                        setContent { InvoicePrintLayout(data = printData) }
                    })
                }
            )

            Spacer(Modifier.height(8.dp))

            Button(
                onClick = { generateAndUsePdf { pdfFile -> printInvoicePdf(context, pdfFile) } },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Print, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Print Invoice")
            }

            OutlinedButton(
                onClick = { generateAndUsePdf { pdfFile -> shareInvoicePdf(context, pdfFile) } },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Share, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Share as PDF")
            }
        }
    }
}

private fun printInvoicePdf(context: Context, file: File) {
    val printManager = context.getSystemService(Context.PRINT_SERVICE) as android.print.PrintManager
    val attributes = android.print.PrintAttributes.Builder()
        .setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4)
        .build()
    printManager.print("Invoice", PdfPrintAdapter(context, file), attributes)
}

private fun shareInvoicePdf(context: Context, file: File) {
    val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.provider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Share Invoice"))
}
