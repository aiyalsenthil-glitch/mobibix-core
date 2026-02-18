package com.aiyal.mobibix.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiyal.mobibix.model.JobStatus

@Composable
fun StatusChip(status: JobStatus) {
    val backgroundColor = when (status) {
        JobStatus.RECEIVED -> Color(0xFF007BFF) // Blue
        JobStatus.IN_PROGRESS -> Color(0xFFFFA500) // Orange
        JobStatus.READY -> Color(0xFF28A745) // Green
        JobStatus.DELIVERED -> Color(0xFF6C757D) // Gray
        JobStatus.CANCELLED -> Color(0xFFDC3545) // Red
    }

    Text(
        text = status.name,
        color = Color.White,
        fontWeight = FontWeight.Bold,
        fontSize = 12.sp,
        modifier = Modifier
            .background(backgroundColor, RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}
