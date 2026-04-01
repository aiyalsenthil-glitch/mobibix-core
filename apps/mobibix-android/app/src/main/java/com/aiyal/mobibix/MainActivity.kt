package com.aiyal.mobibix

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.aiyal.mobibix.ui.navigation.AppNavGraph
import com.aiyal.mobibix.ui.theme.MobiBixTheme
import dagger.hilt.android.AndroidEntryPoint

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

        setContent {
            MobiBixTheme {
                AppNavGraph()
            }
        }
    }
}
