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
        JobStatus.ASSIGNED -> Color(0xFF6610F2) // Indigo
        JobStatus.DIAGNOSING -> Color(0xFF6F42C1) // Purple
        JobStatus.WAITING_APPROVAL -> Color(0xFFE83E8C) // Pink
        JobStatus.APPROVED -> Color(0xFF20C997) // Teal
        JobStatus.WAITING_FOR_PARTS -> Color(0xFFFD7E14) // Yellow/Orange
        JobStatus.IN_PROGRESS -> Color(0xFFFFA500) // Orange
        JobStatus.READY -> Color(0xFF28A745) // Green
        JobStatus.DELIVERED -> Color(0xFF6C757D) // Gray
        JobStatus.CANCELLED -> Color(0xFFDC3545) // Red
        JobStatus.RETURNED -> Color(0xFFF8D7DA) // Light Red/Pink
        JobStatus.SCRAPPED -> Color(0xFF343A40) // Dark Gray/Black
        else -> Color.Gray
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
