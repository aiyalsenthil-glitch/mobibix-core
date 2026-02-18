package com.aiyal.mobibix.ui.features.print

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.print.PrintAttributes
import android.print.pdf.PrintedPdfDocument
import java.io.File
import java.io.FileOutputStream

fun createPrintablePdf(
    context: Context,
    bitmap: Bitmap,
    jobNumber: String
): File {

    val attributes = PrintAttributes.Builder()
        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
        .build()

    val pdf = PrintedPdfDocument(context, attributes)
    val page = pdf.startPage(0)
    val canvas = page.canvas

    val scale = minOf(
        canvas.width.toFloat() / bitmap.width,
        canvas.height.toFloat() / bitmap.height
    )

    val matrix = Matrix().apply {
        postScale(scale, scale)
        postTranslate(
            (canvas.width - bitmap.width * scale) / 2f,
            (canvas.height - bitmap.height * scale) / 2f
        )
    }

    canvas.drawBitmap(bitmap, matrix, null)
    pdf.finishPage(page)

    val file = File(context.cacheDir, "JobCard-$jobNumber.pdf")
    pdf.writeTo(FileOutputStream(file))
    pdf.close()

    return file
}
