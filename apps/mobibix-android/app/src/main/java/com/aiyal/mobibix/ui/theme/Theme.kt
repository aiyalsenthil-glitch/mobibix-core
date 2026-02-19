package com.aiyal.mobibix.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF00C896),
    onPrimary = Color.White,
    primaryContainer = Color(0xFF00503C),
    onPrimaryContainer = Color(0xFF89F8D4),
    secondary = Color(0xFF00C896),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF00382A),
    onSecondaryContainer = Color(0xFF6FF8D4),
    background = Color(0xFF1E1B26),
    onBackground = Color(0xFFE6E1E5),
    surface = Color(0xFF1E1B26),
    onSurface = Color(0xFFE6E1E5),
    surfaceVariant = Color(0xFF2A2634),
    onSurfaceVariant = Color(0xFFCAC4D0),
    outline = Color(0xFF49454F),
    error = Color(0xFFF2B8B5),
    tertiaryContainer = Color(0xFF16A34A),
    onTertiaryContainer = Color.White,
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF00C896),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFCCFBF1),
    onPrimaryContainer = Color(0xFF065F46),
    secondary = Color(0xFF00C896),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFCCFBF1),
    onSecondaryContainer = Color(0xFF065F46),
    background = Color(0xFFF8FAFC),
    onBackground = Color(0xFF1C1B1F),
    surface = Color.White,
    onSurface = Color(0xFF1C1B1F),
    surfaceVariant = Color(0xFFE5E7EB),
    outline = Color(0xFFCBD5E1),
    error = Color(0xFFEF4444),
    tertiaryContainer = Color(0xFFD1FAE5),
    onTertiaryContainer = Color(0xFF064E3B),
)

@Composable
fun MobiBixTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MobiBixTypography,
        shapes = Shapes,
        content = content
    )
}
