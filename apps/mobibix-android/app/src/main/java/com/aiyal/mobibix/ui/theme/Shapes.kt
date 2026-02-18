package com.aiyal.mobibix.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val Shapes = Shapes(
    small = RoundedCornerShape(8.dp), // For chips
    medium = RoundedCornerShape(16.dp), // For most cards
    large = RoundedCornerShape(20.dp), // For hero cards
    extraLarge = RoundedCornerShape(50.dp) // For pill-shaped buttons
)
