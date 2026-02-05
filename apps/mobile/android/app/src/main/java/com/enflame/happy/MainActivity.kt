package com.enflame.happy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.enflame.happy.ui.HappyApp
import com.enflame.happy.ui.theme.HappyTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * Main activity for Happy Android.
 *
 * This is the single activity in the application, following the single-activity
 * architecture pattern with Jetpack Compose for navigation.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HappyTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    HappyApp()
                }
            }
        }
    }
}
