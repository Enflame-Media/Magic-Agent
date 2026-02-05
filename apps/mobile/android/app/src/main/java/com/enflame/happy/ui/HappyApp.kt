package com.enflame.happy.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.rememberNavController
import com.enflame.happy.ui.navigation.HappyNavHost

/**
 * Root composable for the Happy app.
 *
 * Sets up the navigation controller and hosts the navigation graph.
 */
@Composable
fun HappyApp() {
    val navController = rememberNavController()
    HappyNavHost(navController = navController)
}
