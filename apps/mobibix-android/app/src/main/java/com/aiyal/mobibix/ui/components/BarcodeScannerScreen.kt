package com.aiyal.mobibix.ui.components

import android.util.Log
import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.unit.dp
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun BarcodeScannerScreen(
    onBarcodeScanned: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    
    val cameraPermissionState = rememberPermissionState(android.Manifest.permission.CAMERA)
    
    LaunchedEffect(Unit) {
        if (!cameraPermissionState.status.isGranted) {
            cameraPermissionState.launchPermissionRequest()
        }
    }

    if (cameraPermissionState.status.isGranted) {
        Box(modifier = Modifier.fillMaxSize()) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    val previewView = PreviewView(ctx).apply {
                        scaleType = PreviewView.ScaleType.FILL_CENTER
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    }

                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

                    cameraProviderFuture.addListener({
                        val cameraProvider = cameraProviderFuture.get()

                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }

                        val imageAnalyzer = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                            .also {
                                it.setAnalyzer(cameraExecutor, BarcodeAnalyzer(onBarcodeScanned))
                            }

                        val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                cameraSelector,
                                preview,
                                imageAnalyzer
                            )
                        } catch (exc: Exception) {
                            Log.e("BarcodeScanner", "Use case binding failed", exc)
                        }
                    }, ContextCompat.getMainExecutor(ctx))

                    previewView
                }
            )
            
            // Overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(50.dp),
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                 androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
                     val width = size.width
                     val height = size.height
                     val borderLength = 50.dp.toPx()
                     
                     drawLine(
                        color = androidx.compose.ui.graphics.Color.White,
                        start = androidx.compose.ui.geometry.Offset(0f, 0f),
                        end = androidx.compose.ui.geometry.Offset(borderLength, 0f),
                        strokeWidth = 10f
                     )
                     drawLine(
                        color = androidx.compose.ui.graphics.Color.White,
                        start = androidx.compose.ui.geometry.Offset(0f, 0f),
                        end = androidx.compose.ui.geometry.Offset(0f, borderLength),
                        strokeWidth = 10f
                     )
                     
                     // Top Right
                      drawLine(
                        color = androidx.compose.ui.graphics.Color.White,
                        start = androidx.compose.ui.geometry.Offset(width - borderLength, 0f),
                        end = androidx.compose.ui.geometry.Offset(width, 0f),
                        strokeWidth = 10f
                     )
                     drawLine(
                        color = androidx.compose.ui.graphics.Color.White,
                        start = androidx.compose.ui.geometry.Offset(width, 0f),
                        end = androidx.compose.ui.geometry.Offset(width, borderLength),
                        strokeWidth = 10f
                     )
                     
                     // Bottom Left
                     drawLine(
                        color = androidx.compose.ui.graphics.Color.White,
                        start = androidx.compose.ui.geometry.Offset(0f, height - borderLength),
                        end = androidx.compose.ui.geometry.Offset(0f, height),
                        strokeWidth = 10f
                     )
                     drawLine(
                        color = androidx.compose.ui.graphics.Color.White,
                        start = androidx.compose.ui.geometry.Offset(0f, height),
                        end = androidx.compose.ui.geometry.Offset(borderLength, height),
                        strokeWidth = 10f
                     )
                     
                     // Bottom Right
                     drawLine(
                        color = androidx.compose.ui.graphics.Color.White,
                        start = androidx.compose.ui.geometry.Offset(width - borderLength, height),
                        end = androidx.compose.ui.geometry.Offset(width, height),
                        strokeWidth = 10f
                     )
                     drawLine(
                        color = androidx.compose.ui.graphics.Color.White,
                        start = androidx.compose.ui.geometry.Offset(width, height),
                        end = androidx.compose.ui.geometry.Offset(width, height - borderLength),
                        strokeWidth = 10f
                     )
                 }
            }
        }
    } else {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
            androidx.compose.material3.Text("Camera permission required to scan barcodes")
            androidx.compose.material3.Button(onClick = { cameraPermissionState.launchPermissionRequest() }) {
                androidx.compose.material3.Text("Grant Permission")
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }
}

class BarcodeAnalyzer(private val onBarcodeDetected: (String) -> Unit) : ImageAnalysis.Analyzer {
    private val scanner = BarcodeScanning.getClient()

    @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    for (barcode in barcodes) {
                        barcode.rawValue?.let { value ->
                            onBarcodeDetected(value)
                        }
                    }
                }
                .addOnFailureListener {
                    // Handle failure
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }
}
