package com.aiyal.mobibix.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

// ── Global theme toggle state ──
object ThemeState {
    var isDarkMode by mutableStateOf<Boolean?>(null) // null = follow system
    fun toggleDarkMode() {
        isDarkMode = !(isDarkMode ?: true)
    }
}

// ── Catchy Dark Mode (Premium Dashboard Style) ──
private val DarkColorScheme = darkColorScheme(
    primary = PremiumTeal,
    onPrimary = Color.Black,
    primaryContainer = Color(0xFF134E4A),
    onPrimaryContainer = PremiumTeal,
    secondary = Color(0xFF6366F1), // Modern Indigo
    onSecondary = Color.White,
    background = DarkBackground,   // Deep Charcoal
    surface = DarkSurface,         // Card BG
    onBackground = DarkTextPrimary,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurface,
    onSurfaceVariant = DarkTextSecondary,
    outline = Color.White.copy(alpha = 0.1f),
    error = RedError,
    inverseSurface = LightSurface,
    inverseOnSurface = LightTextPrimary,
)

// ── Refresh Clean Light Mode ──
private val LightColorScheme = lightColorScheme(
    primary = TealPrimary,
    onPrimary = OnTealPrimary,
    primaryContainer = Color(0xFFCCFBF1),
    onPrimaryContainer = TealPrimary,
    secondary = Color(0xFF6366F1),
    onSecondary = Color.White,
    background = LightBackground,
    surface = LightSurface,
    onBackground = LightTextPrimary,
    onSurface = LightTextPrimary,
    surfaceVariant = Color(0xFFE5E7EB),
    onSurfaceVariant = LightTextSecondary,
    outline = LightTextSecondary.copy(alpha = 0.5f),
    error = RedError,
    inverseSurface = DarkSurface,
    inverseOnSurface = DarkTextPrimary,
)

@Composable
fun MobiBixTheme(
    darkTheme: Boolean = ThemeState.isDarkMode ?: isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MobiBixTypography,
        shapes = Shapes,
        content = content
    )
}
