package com.aiyal.mobibix.ui.features.products

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.navigation.NavController
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.google.zxing.common.BitMatrix
import java.io.File
import java.io.FileOutputStream

/**
 * Barcode Label Screen — Generate and print/share product barcode labels.
 * Uses ZXing (already a dependency) to render Code-128 barcodes.
 * Supports A4 sheet (4x2 grid) and individual label PDF export.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BarcodeLabelScreen(
    navController: NavController,
    productId: String? = null,
    viewModel: ProductViewModel = androidx.hilt.navigation.compose.hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    var barcodeValue by remember { mutableStateOf("") }
    var productLabel by remember { mutableStateOf("") }
    var priceLabel by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("1") }
    var labelSize by remember { mutableStateOf("SMALL") } // SMALL, MEDIUM, LARGE
    var barcodeBitmap by remember { mutableStateOf<Bitmap?>(null) }

    // Pre-fill from product if navigated with productId
    LaunchedEffect(productId, uiState.products) {
        if (productId != null) {
            uiState.products.find { it.id == productId }?.let { p ->
                productLabel = p.name
                barcodeValue = p.sku ?: p.id.take(12).uppercase()
                priceLabel = p.salePrice?.div(100.0)?.let { "₹${String.format("%.2f", it)}" } ?: ""
            }
        }
    }

    // Generate barcode whenever value changes
    LaunchedEffect(barcodeValue) {
        if (barcodeValue.isNotBlank()) {
            barcodeBitmap = generateBarcode(barcodeValue, 400, 100)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Barcode Labels", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Input section
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Label Content", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    OutlinedTextField(
                        value = barcodeValue,
                        onValueChange = { barcodeValue = it },
                        label = { Text("Barcode / SKU *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp)
                    )
                    OutlinedTextField(
                        value = productLabel,
                        onValueChange = { productLabel = it },
                        label = { Text("Product Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp)
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedTextField(
                            value = priceLabel,
                            onValueChange = { priceLabel = it },
                            label = { Text("Price") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp)
                        )
                        OutlinedTextField(
                            value = quantity,
                            onValueChange = { quantity = it },
                            label = { Text("Copies") },
                            modifier = Modifier.weight(0.6f),
                            singleLine = true,
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                }
            }

            // Label size
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Label Size", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("SMALL" to "38×19mm", "MEDIUM" to "50×25mm", "LARGE" to "70×40mm").forEach { (key, label) ->
                            FilterChip(
                                selected = labelSize == key,
                                onClick = { labelSize = key },
                                label = { Text(label, fontSize = 12.sp) }
                            )
                        }
                    }
                }
            }

            // Preview
            if (barcodeBitmap != null && barcodeValue.isNotBlank()) {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("Label Preview", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(4.dp))
                        Box(
                            modifier = Modifier
                                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(6.dp))
                                .padding(10.dp)
                                .background(androidx.compose.ui.graphics.Color.White, RoundedCornerShape(4.dp))
                                .padding(8.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                if (productLabel.isNotBlank()) {
                                    Text(productLabel, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = androidx.compose.ui.graphics.Color.Black)
                                }
                                Image(
                                    bitmap = barcodeBitmap!!.asImageBitmap(),
                                    contentDescription = "Barcode",
                                    modifier = Modifier.height(50.dp).width(200.dp)
                                )
                                Text(barcodeValue, fontSize = 9.sp, color = androidx.compose.ui.graphics.Color.Black)
                                if (priceLabel.isNotBlank()) {
                                    Text(priceLabel, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = androidx.compose.ui.graphics.Color.Black)
                                }
                            }
                        }
                    }
                }

                // Actions
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(
                        onClick = {
                            shareBarcodePdf(context, barcodeValue, productLabel, priceLabel, quantity.toIntOrNull() ?: 1)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Share PDF")
                    }
                    Button(
                        onClick = {
                            printLabels(context, barcodeValue, productLabel, priceLabel, quantity.toIntOrNull() ?: 1)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Print")
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

fun generateBarcode(value: String, width: Int, height: Int): Bitmap? {
    return try {
        val writer = MultiFormatWriter()
        val matrix: BitMatrix = writer.encode(value, BarcodeFormat.CODE_128, width, height)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
        for (x in 0 until width) {
            for (y in 0 until height) {
                bitmap.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        bitmap
    } catch (e: Exception) {
        null
    }
}

fun createLabelBitmap(
    barcodeValue: String,
    productLabel: String,
    priceLabel: String
): Bitmap {
    val width = 400
    val height = 160
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.WHITE)

    val textPaint = Paint().apply {
        color = Color.BLACK
        isAntiAlias = true
    }

    var yOffset = 16f

    // Product name
    if (productLabel.isNotBlank()) {
        textPaint.textSize = 18f
        textPaint.isFakeBoldText = true
        canvas.drawText(productLabel.take(40), 10f, yOffset + textPaint.textSize, textPaint)
        yOffset += textPaint.textSize + 4f
        textPaint.isFakeBoldText = false
    }

    // Barcode
    val barcodeBitmap = generateBarcode(barcodeValue, 380, 60)
    if (barcodeBitmap != null) {
        canvas.drawBitmap(barcodeBitmap, 10f, yOffset, null)
        yOffset += 64f
    }

    // Barcode value text
    textPaint.textSize = 12f
    val barcodeTextX = (width - textPaint.measureText(barcodeValue)) / 2f
    canvas.drawText(barcodeValue, barcodeTextX, yOffset + 14f, textPaint)
    yOffset += 18f

    // Price
    if (priceLabel.isNotBlank()) {
        textPaint.textSize = 20f
        textPaint.isFakeBoldText = true
        val priceX = (width - textPaint.measureText(priceLabel)) / 2f
        canvas.drawText(priceLabel, priceX, yOffset + textPaint.textSize, textPaint)
    }

    return bitmap
}

private fun shareBarcodePdf(
    context: Context,
    barcodeValue: String,
    productLabel: String,
    priceLabel: String,
    copies: Int
) {
    try {
        val labelBitmap = createLabelBitmap(barcodeValue, productLabel, priceLabel)
        val file = File(context.cacheDir, "barcode-label-${barcodeValue.take(12)}.pdf")

        val attributes = android.print.PrintAttributes.Builder()
            .setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4)
            .setMinMargins(android.print.PrintAttributes.Margins.NO_MARGINS)
            .build()
        val pdf = android.print.pdf.PrintedPdfDocument(context, attributes)
        val page = pdf.startPage(0)
        val canvas = page.canvas

        // Draw labels in a 4x2 grid
        val labelW = canvas.width / 4f
        val labelH = canvas.height / 6f
        val maxCopies = minOf(copies, 8)
        for (i in 0 until maxCopies) {
            val col = i % 4
            val row = i / 4
            val scaled = Bitmap.createScaledBitmap(labelBitmap, labelW.toInt(), labelH.toInt(), true)
            canvas.drawBitmap(scaled, col * labelW, row * labelH, null)
        }

        pdf.finishPage(page)
        pdf.writeTo(FileOutputStream(file))
        pdf.close()

        val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "application/pdf"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share Barcode Labels"))
    } catch (e: Exception) {
        // Silently fail — in production, show a toast
    }
}

private fun printLabels(
    context: Context,
    barcodeValue: String,
    productLabel: String,
    priceLabel: String,
    copies: Int
) {
    shareBarcodePdf(context, barcodeValue, productLabel, priceLabel, copies)
}
