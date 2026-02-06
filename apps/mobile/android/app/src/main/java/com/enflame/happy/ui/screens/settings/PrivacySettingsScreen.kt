package com.enflame.happy.ui.screens.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PersonSearch
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.enflame.happy.R
import com.enflame.happy.domain.model.FriendRequestPermission
import com.enflame.happy.domain.model.ProfileVisibility
import com.enflame.happy.ui.theme.HappyTheme
import com.enflame.happy.ui.viewmodel.PrivacySettingsUiState
import com.enflame.happy.ui.viewmodel.PrivacySettingsViewModel

/**
 * Privacy Settings screen for controlling social feature visibility.
 *
 * Accessible from the Settings navigation. Allows users to control:
 * - Online status visibility to friends
 * - Profile visibility (everyone/friends-only)
 * - Friend request permissions (everyone/friends-of-friends/none)
 *
 * Each change is persisted immediately via PATCH /v1/users/me/privacy (HAP-794).
 *
 * @param viewModel The [PrivacySettingsViewModel] providing state and actions.
 * @param onNavigateBack Callback for the back navigation button.
 */
@Composable
fun PrivacySettingsScreen(
    viewModel: PrivacySettingsViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    PrivacySettingsScreenContent(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onOnlineStatusVisibleChanged = viewModel::setOnlineStatusVisible,
        onProfileVisibilityChanged = viewModel::setProfileVisibility,
        onFriendRequestPermissionChanged = viewModel::setFriendRequestPermission,
        onDismissError = viewModel::dismissError,
        onDismissSuccess = viewModel::dismissSuccess
    )
}

/**
 * Stateless privacy settings screen content for testability and previews.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PrivacySettingsScreenContent(
    uiState: PrivacySettingsUiState,
    onNavigateBack: () -> Unit = {},
    onOnlineStatusVisibleChanged: (Boolean) -> Unit = {},
    onProfileVisibilityChanged: (ProfileVisibility) -> Unit = {},
    onFriendRequestPermissionChanged: (FriendRequestPermission) -> Unit = {},
    onDismissError: () -> Unit = {},
    onDismissSuccess: () -> Unit = {}
) {
    val snackbarHostState = remember { SnackbarHostState() }

    // Show error as snackbar
    val errorMessage = uiState.errorMessage
    LaunchedEffect(errorMessage) {
        if (errorMessage != null) {
            snackbarHostState.showSnackbar(
                message = errorMessage,
                duration = SnackbarDuration.Long
            )
            onDismissError()
        }
    }

    // Show success as snackbar
    val successMessage = uiState.successMessage
    LaunchedEffect(successMessage) {
        if (successMessage != null) {
            snackbarHostState.showSnackbar(
                message = successMessage,
                duration = SnackbarDuration.Short
            )
            onDismissSuccess()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.privacy_settings_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.close)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                ),
                actions = {
                    if (uiState.isSaving) {
                        CircularProgressIndicator(
                            modifier = Modifier
                                .size(24.dp)
                                .padding(end = 12.dp),
                            strokeWidth = 2.dp
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        if (uiState.isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CircularProgressIndicator()
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = stringResource(R.string.privacy_settings_loading),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // --- Online Status Section ---
                PrivacySectionHeader(
                    icon = Icons.Default.Visibility,
                    title = stringResource(R.string.privacy_online_status_title)
                )

                OnlineStatusCard(
                    isVisible = uiState.onlineStatusVisible,
                    onVisibleChanged = onOnlineStatusVisibleChanged
                )

                // --- Profile Visibility Section ---
                PrivacySectionHeader(
                    icon = Icons.Default.People,
                    title = stringResource(R.string.privacy_profile_visibility_title)
                )

                ProfileVisibilityCard(
                    currentVisibility = uiState.profileVisibility,
                    onVisibilityChanged = onProfileVisibilityChanged
                )

                // --- Friend Request Permissions Section ---
                PrivacySectionHeader(
                    icon = Icons.Default.PersonSearch,
                    title = stringResource(R.string.privacy_friend_requests_title)
                )

                FriendRequestPermissionCard(
                    currentPermission = uiState.friendRequestPermission,
                    onPermissionChanged = onFriendRequestPermissionChanged
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

// --- Section Header ---

@Composable
private fun PrivacySectionHeader(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 4.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.primary
        )
    }
}

// --- Online Status Card ---

@Composable
private fun OnlineStatusCard(
    isVisible: Boolean,
    onVisibleChanged: (Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = if (isVisible) Icons.Default.Visibility
                        else Icons.Default.VisibilityOff,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = stringResource(R.string.privacy_show_online_status),
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Text(
                            text = stringResource(R.string.privacy_show_online_status_description),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Switch(
                    checked = isVisible,
                    onCheckedChange = onVisibleChanged
                )
            }
        }
    }
}

// --- Profile Visibility Card ---

@Composable
private fun ProfileVisibilityCard(
    currentVisibility: ProfileVisibility,
    onVisibilityChanged: (ProfileVisibility) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.privacy_profile_visibility_description),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(12.dp))

            RadioOptionRow(
                label = stringResource(R.string.privacy_visibility_everyone),
                description = stringResource(R.string.privacy_visibility_everyone_description),
                isSelected = currentVisibility == ProfileVisibility.EVERYONE,
                onClick = { onVisibilityChanged(ProfileVisibility.EVERYONE) }
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

            RadioOptionRow(
                label = stringResource(R.string.privacy_visibility_friends_only),
                description = stringResource(R.string.privacy_visibility_friends_only_description),
                isSelected = currentVisibility == ProfileVisibility.FRIENDS_ONLY,
                onClick = { onVisibilityChanged(ProfileVisibility.FRIENDS_ONLY) }
            )
        }
    }
}

// --- Friend Request Permission Card ---

@Composable
private fun FriendRequestPermissionCard(
    currentPermission: FriendRequestPermission,
    onPermissionChanged: (FriendRequestPermission) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = stringResource(R.string.privacy_friend_requests_description),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(12.dp))

            RadioOptionRow(
                label = stringResource(R.string.privacy_requests_everyone),
                description = stringResource(R.string.privacy_requests_everyone_description),
                isSelected = currentPermission == FriendRequestPermission.EVERYONE,
                onClick = { onPermissionChanged(FriendRequestPermission.EVERYONE) }
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

            RadioOptionRow(
                label = stringResource(R.string.privacy_requests_friends_of_friends),
                description = stringResource(R.string.privacy_requests_friends_of_friends_description),
                isSelected = currentPermission == FriendRequestPermission.FRIENDS_OF_FRIENDS,
                onClick = { onPermissionChanged(FriendRequestPermission.FRIENDS_OF_FRIENDS) }
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))

            RadioOptionRow(
                label = stringResource(R.string.privacy_requests_none),
                description = stringResource(R.string.privacy_requests_none_description),
                isSelected = currentPermission == FriendRequestPermission.NONE,
                onClick = { onPermissionChanged(FriendRequestPermission.NONE) }
            )
        }
    }
}

// --- Reusable Radio Option Row ---

@Composable
private fun RadioOptionRow(
    label: String,
    description: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        RadioButton(
            selected = isSelected,
            onClick = onClick
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

// --- Previews ---

@Preview(showBackground = true)
@Composable
private fun PrivacySettingsScreenPreview() {
    HappyTheme {
        PrivacySettingsScreenContent(
            uiState = PrivacySettingsUiState(
                onlineStatusVisible = true,
                profileVisibility = ProfileVisibility.EVERYONE,
                friendRequestPermission = FriendRequestPermission.EVERYONE
            )
        )
    }
}

@Preview(showBackground = true, name = "Privacy - Restricted")
@Composable
private fun PrivacySettingsScreenRestrictedPreview() {
    HappyTheme {
        PrivacySettingsScreenContent(
            uiState = PrivacySettingsUiState(
                onlineStatusVisible = false,
                profileVisibility = ProfileVisibility.FRIENDS_ONLY,
                friendRequestPermission = FriendRequestPermission.NONE
            )
        )
    }
}

@Preview(showBackground = true, name = "Privacy - Loading")
@Composable
private fun PrivacySettingsScreenLoadingPreview() {
    HappyTheme {
        PrivacySettingsScreenContent(
            uiState = PrivacySettingsUiState(isLoading = true)
        )
    }
}
