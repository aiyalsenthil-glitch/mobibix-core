package com.aiyal.mobibix.ui.features.jobs

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.print.PrintAttributes
import android.print.PrintManager
import android.widget.FrameLayout
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiyal.mobibix.BuildConfig
import com.aiyal.mobibix.data.network.JobCardResponse
import com.aiyal.mobibix.data.network.ShopInfo
import com.aiyal.mobibix.ui.components.generateQrBitmap
import com.aiyal.mobibix.ui.features.print.JobCardPrintData
import com.aiyal.mobibix.ui.features.print.JobCardPrintLayout
import com.aiyal.mobibix.ui.features.print.captureViewToBitmap
import com.aiyal.mobibix.ui.features.print.createPrintablePdf
import com.aiyal.mobibix.util.PdfPrintAdapter
import java.io.File

private fun JobCardResponse.toPrintData(
    shop: ShopInfo,
    qrBitmap: Bitmap
): JobCardPrintData {
    // Estimated cost is Double?, print data might expect Int. 
    // Usually currency values should be Double/BigDecimal.
    // If JobCardPrintData expects Int, we check existing code.
    // Assuming JobCardPrintData was using Int based on previous code review which showed toInt().
    // Ideally we should update JobCardPrintData to Double as well, but for now let's cast if needed.
    val est = this.estimatedCost ?: 0.0
    val adv = this.advancePaid
    return JobCardPrintData(
        jobNumber = this.jobNumber,
        createdAt = "", // backend doesn’t send yet, keep blank
        createdBy = this.createdByName,
        customerName = this.customerName,
        customerPhone = this.customerPhone,
        customerAltPhone = this.customerAltPhone ?: "",
        deviceType = this.deviceType,
        deviceBrand = this.deviceBrand,
        deviceModel = this.deviceModel,
        deviceSerial = this.deviceSerial ?: "",
        complaint = this.customerComplaint,
        physicalCondition = this.physicalCondition ?: "",
        estimatedCost = est,
        advancePaid = adv,
        balanceDue = est - adv,
        estimatedDelivery = this.estimatedDelivery ?: "",
        shopName = shop.name,
        shopPhone = shop.phone,
        terms = emptyList(), // shop terms later
        qrBitmap = qrBitmap
    )
}

@Composable
fun JobCardPrintPreviewScreen(
    jobId: String,
    shopId: String,
    viewModel: JobCardPrintPreviewViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(jobId, shopId) {
        viewModel.loadPreviewData(shopId, jobId)
    }

    when (val currentState = state) {
        is PrintPreviewState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        is PrintPreviewState.Success -> {
            PrintPreviewContent(job = currentState.job, shop = currentState.shop)
        }

        is PrintPreviewState.Error -> {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(currentState.message)
            }
        }
    }
}


@Composable
private fun PrintPreviewContent(job: JobCardResponse, shop: ShopInfo) {
    val context = LocalContext.current
    val activity = context as? Activity ?: return
    val qrUrl = "${BuildConfig.PUBLIC_BASE_URL}/public/job/${job.publicToken}"
    val qrBitmap = remember { generateQrBitmap(qrUrl) }
    val printableView = remember { mutableStateOf<FrameLayout?>(null) }
    val printData = remember(job, shop, qrBitmap) {
        job.toPrintData(shop, qrBitmap)
    }

    fun generateAndUsePdf(onPdfGenerated: (File) -> Unit) {
        val targetView = printableView.value ?: return
        captureViewToBitmap(activity, targetView) { bitmap ->
            val pdfFile = createPrintablePdf(
                context = context,
                bitmap = bitmap,
                jobNumber = job.jobNumber
            )
            onPdfGenerated(pdfFile)
        }
    }

    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AndroidView(
            factory = { ctx ->
                FrameLayout(ctx).apply {
                    printableView.value = this
                }
            },
            modifier = Modifier.fillMaxWidth(),
            update = {
                it.removeAllViews()
                it.addView(ComposeView(it.context).apply {
                    setViewCompositionStrategy(
                        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
                    )
                    setContent {
                        JobCardPrintLayout(
                            printData = printData
                        )
                    }

                })

            }
        )

        Spacer(Modifier.height(8.dp))

        Button(onClick = {
            generateAndUsePdf { pdfFile ->
                printPdf(context, pdfFile)
            }
        }) {
            Text("Print Job Card")
        }

        Button(onClick = {
            generateAndUsePdf { pdfFile ->
                sharePdf(context, pdfFile)
            }
        }) {
            Text("Share Job Card")
        }
    }
}

fun printPdf(context: Context, file: File) {
    val printManager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
    printManager.print(
        "JobCard",
        PdfPrintAdapter(context, file),
        PrintAttributes.Builder().build()
    )
}

fun sharePdf(context: Context, file: File) {
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.provider",
        file
    )

    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }

    context.startActivity(Intent.createChooser(intent, "Share Job Card"))
}
