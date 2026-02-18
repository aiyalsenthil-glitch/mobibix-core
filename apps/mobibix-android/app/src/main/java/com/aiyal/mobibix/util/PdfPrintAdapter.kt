package com.aiyal.mobibix.util

import android.content.Context
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream

class PdfPrintAdapter(private val context: Context, private val file: File) : PrintDocumentAdapter() {

    override fun onLayout(
        oldAttributes: PrintAttributes?,
        newAttributes: PrintAttributes,
        cancellationSignal: CancellationSignal?,
        callback: LayoutResultCallback,
        extras: Bundle?
    ) {
        if (cancellationSignal?.isCanceled == true) {
            callback.onLayoutCancelled()
            return
        }

        val pdi = android.print.PrintDocumentInfo.Builder("JobCard.pdf")
            .setContentType(android.print.PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
            .build()

        callback.onLayoutFinished(pdi, true)
    }

    override fun onWrite(
        pages: Array<out PageRange>?,
        destination: ParcelFileDescriptor?,
        cancellationSignal: CancellationSignal?,
        callback: WriteResultCallback
    ) {
        var input: InputStream? = null
        var output: OutputStream? = null

        try {
            input = FileInputStream(file)
            output = FileOutputStream(destination?.fileDescriptor)

            input.copyTo(output)

            if (cancellationSignal?.isCanceled == true) {
                callback.onWriteCancelled()
                return
            }

            callback.onWriteFinished(arrayOf(PageRange.ALL_PAGES))

        } catch (e: Exception) {
            callback.onWriteFailed(e.toString())
        } finally {
            input?.close()
            output?.close()
        }
    }
}
