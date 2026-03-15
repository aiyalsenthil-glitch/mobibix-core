package com.aiyal.mobibix.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

@Composable
fun AuroraBackground() {
    val infiniteTransition = rememberInfiniteTransition(label = "aurora")
    
    // Primary fluid motion
    val time by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 2 * Math.PI.toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(40000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "time"
    )

    // Determine if we are in light or dark mode based on background luminance
    // We can use the MaterialTheme current colorScheme
    val isLight = MaterialTheme.colorScheme.background.red > 0.5f

    val bgColor = if (isLight) Color(0xFFF0FDF4) else Color(0xFF020617)
    val blob1Color = if (isLight) Color(0xFF34D399).copy(alpha = 0.3f) else Color(0xFF10B981).copy(alpha = 0.12f)
    val blob2Color = if (isLight) Color(0xFF38BDF8).copy(alpha = 0.3f) else Color(0xFF0EA5E9).copy(alpha = 0.15f)
    val blob3Color = if (isLight) Color(0xFF2DD4BF).copy(alpha = 0.25f) else Color(0xFF14B8A6).copy(alpha = 0.08f)

    Box(modifier = Modifier.fillMaxSize().background(bgColor)) {
        // Blob 1 - Top Leftish - Emerald/Teal
        val x1 = (kotlin.math.sin(time.toDouble()) * 150).dp
        val y1 = (kotlin.math.cos(time.toDouble() * 0.8) * 100).dp
        Box(
            modifier = Modifier
                .offset(x = x1, y = y1)
                .size(600.dp)
                .blur(isLight.let { if(it) 100.dp else 150.dp })
                .background(blob1Color, CircleShape)
        )
        
        // Blob 2 - Bottom Rightish - Blue/Teal
        val x2 = (kotlin.math.cos(time.toDouble() * 1.2) * 200).dp
        val y2 = (kotlin.math.sin(time.toDouble() * 0.5) * 150).dp
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .offset(x = x2, y = y2)
                .size(500.dp)
                .blur(isLight.let { if(it) 120.dp else 180.dp })
                .background(blob2Color, CircleShape)
        )
        
        // Blob 3 - Moving Center - Primary Brand Teal
        val x3 = (kotlin.math.sin(time.toDouble() * 0.7) * 100).dp
        val y3 = (kotlin.math.sin(time.toDouble() * 1.1) * 80).dp
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .offset(x = x3, y = y3)
                .size(700.dp)
                .blur(isLight.let { if(it) 140.dp else 200.dp })
                .background(blob3Color, CircleShape)
        )
    }
}

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(24.dp),
    content: @Composable () -> Unit
) {
    val isLight = MaterialTheme.colorScheme.background.red > 0.5f

    // Liquid glass effect
    val containerColor = if (isLight) Color.White.copy(alpha = 0.85f) else Color.White.copy(alpha = 0.05f)
    val borderColorStart = if (isLight) Color.Black.copy(alpha = 0.05f) else Color.White.copy(alpha = 0.1f)
    val borderColorEnd = if (isLight) Color.Transparent else Color.Transparent

    Surface(
        modifier = modifier
            .border(
                1.dp,
                Brush.verticalGradient(
                    colors = listOf(borderColorStart, borderColorEnd)
                ),
                shape
            ),
        color = containerColor,
        shape = shape,
    ) {
        // We do not apply blur directly to the surface to avoid blurring the content inside.
        // Instead, the blur effect comes from the background (Aurora) shining through the semi-transparent surface.
        // For a true "liquid glass" background blur in Compose, we would need RenderEffect which is API 31+.
        // As a fallback for older versions, high transparency combined with gradient borders provides the glass look.
        content()
    }
}
