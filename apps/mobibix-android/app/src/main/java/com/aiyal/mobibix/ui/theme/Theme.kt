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

// ── Catchy Dark Mode ──
private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF14B8A6),       // Brand Teal (Matched to Web)
    onPrimary = Color(0xFF00382A),
    primaryContainer = Color(0xFF004D3A),
    onPrimaryContainer = Color(0xFF89F8D4),
    secondary = Color(0xFF7C3AED),     // Vivid purple accent
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF2D1B69),
    onSecondaryContainer = Color(0xFFD4BBFF),
    tertiary = Color(0xFF3B82F6),      // Blue accent
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFF16A34A),
    onTertiaryContainer = Color.White,
    background = Color(0xFF0F0D15),    // Deep dark purple-black
    onBackground = Color(0xFFF1F0F5),
    surface = Color(0xFF1A1725),       // Slightly lighter surface
    onSurface = Color(0xFFF1F0F5),
    surfaceVariant = Color(0xFF252233), // Card backgrounds
    onSurfaceVariant = Color(0xFFB8B3C0),
    surfaceContainerHighest = Color(0xFF2A2634),
    outline = Color(0xFF3D3852),
    outlineVariant = Color(0xFF2D2940),
    error = Color(0xFFFF6B6B),
    inverseSurface = Color(0xFFF1F0F5),
    inverseOnSurface = Color(0xFF1A1725),
)

// ── Premium Glass Light Mode ──
private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF14B8A6),       // Brand Teal (Matched to Web)
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE0FFF5),
    onPrimaryContainer = Color(0xFF002E22),
    secondary = Color(0xFF7C3AED),     // Purple accent
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFF3EBFF),
    onSecondaryContainer = Color(0xFF2D0A6E),
    tertiary = Color(0xFF3B82F6),      // Blue accent
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFD1FAE5),
    onTertiaryContainer = Color(0xFF064E3B),
    background = Color(0xFFF7F8FC),    // Soft gray-blue
    onBackground = Color(0xFF111827),
    surface = Color(0xFFFFFFFF),       // Pure white
    onSurface = Color(0xFF111827),
    surfaceVariant = Color(0xFFF3F4F6), // Cleaner soft gray
    onSurfaceVariant = Color(0xFF374151), // Darker for better visibility
    surfaceContainerHighest = Color(0xFFE5E7EB),
    outline = Color(0xFF9CA3AF), // Darker outline for better contrast
    outlineVariant = Color(0xFFD1D5DB),
    error = Color(0xFFDC2626),
    inverseSurface = Color(0xFF1F2937),
    inverseOnSurface = Color(0xFFF9FAFB),
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
