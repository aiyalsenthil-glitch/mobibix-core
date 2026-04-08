package com.aiyal.mobibix

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.datastore.preferences.core.edit
import androidx.lifecycle.lifecycleScope
import com.aiyal.mobibix.core.data.PrefKeys
import com.aiyal.mobibix.core.data.dataStore
import com.aiyal.mobibix.ui.navigation.AppNavGraph
import com.aiyal.mobibix.ui.theme.MobiBixTheme
import com.aiyal.mobibix.ui.theme.ThemeState
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    lateinit var printContainer: FrameLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        printContainer = FrameLayout(this).apply {
            visibility = View.GONE
        }
        addContentView(
            printContainer,
            ViewGroup.LayoutParams(0, 0)
        )

        // Restore saved dark mode preference before first render
        lifecycleScope.launch {
            val saved = dataStore.data.map { it[PrefKeys.DARK_MODE] }.first()
            if (saved != null) ThemeState.isDarkMode = saved
        }

        setContent {
            val isDark = ThemeState.isDarkMode

            // Persist theme preference whenever it changes
            LaunchedEffect(isDark) {
                if (isDark != null) {
                    dataStore.edit { it[PrefKeys.DARK_MODE] = isDark }
                }
            }

            MobiBixTheme(darkTheme = isDark ?: isSystemInDarkTheme()) {
                AppNavGraph()
            }
        }
    }
}
