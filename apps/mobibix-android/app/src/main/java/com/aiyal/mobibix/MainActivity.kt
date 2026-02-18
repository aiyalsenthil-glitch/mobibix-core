package com.aiyal.mobibix

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import com.aiyal.mobibix.ui.features.login.GoogleSignInViewModel
import com.aiyal.mobibix.ui.features.login.SignInViewModel
import com.aiyal.mobibix.ui.navigation.AppNavGraph
import com.aiyal.mobibix.ui.theme.MobiBixTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val googleSignInViewModel: GoogleSignInViewModel by viewModels()
    private lateinit var googleSignInLauncher: ActivityResultLauncher<android.content.Intent>
    lateinit var printContainer: FrameLayout


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        printContainer = FrameLayout(this).apply {
            visibility = View.GONE
        }
        addContentView(
            printContainer,
            ViewGroup.LayoutParams(0, 0)
        )

        googleSignInLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val data = result.data
            if (data != null) {
                googleSignInViewModel.onSignInResult(
                    data = data,
                    onSuccess = { idToken ->
                        val signInViewModel: SignInViewModel by viewModels()
                        signInViewModel.signInWithGoogle(idToken)
                    },
                    onError = {
                        // TODO: Handle error
                    }
                )
            }
        }

        setContent {
            MobiBixTheme {
                AppNavGraph(googleSignInLauncher = googleSignInLauncher)
            }
        }
    }
}
