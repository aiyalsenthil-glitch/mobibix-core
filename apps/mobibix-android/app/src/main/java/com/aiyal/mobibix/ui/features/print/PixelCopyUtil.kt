package com.aiyal.mobibix.ui.features.print

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
import android.view.View

fun captureViewToBitmap(
    activity: Activity,
    targetView: View,
    onResult: (Bitmap) -> Unit
) {
    val location = IntArray(2)
    targetView.getLocationInWindow(location)

    val bitmap = Bitmap.createBitmap(
        targetView.width,
        targetView.height,
        Bitmap.Config.ARGB_8888
    )

    PixelCopy.request(
        activity.window,
        Rect(
            location[0],
            location[1],
            location[0] + targetView.width,
            location[1] + targetView.height
        ),
        bitmap,
        { result ->
            if (result == PixelCopy.SUCCESS) {
                onResult(bitmap)
            }
        },
        Handler(Looper.getMainLooper())
    )
}

