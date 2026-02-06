package com.enflame.happy.ui.viewmodel

import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.domain.model.Artifact
import com.enflame.happy.domain.model.ArtifactType
import com.enflame.happy.domain.repository.SessionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Filter options for the artifact list by type.
 */
enum class ArtifactTypeFilter(val label: String) {
    ALL("All"),
    CODE("Code"),
    DOCUMENTS("Docs"),
    CONFIG("Config")
}

/**
 * UI state for the artifact list screen.
 */
data class ArtifactListUiState(
    val isLoading: Boolean = false,
    val hasLoaded: Boolean = false,
    val errorMessage: String? = null,
    val searchQuery: String = "",
    val typeFilter: ArtifactTypeFilter = ArtifactTypeFilter.ALL,
    val totalCount: Int = 0,
    val codeCount: Int = 0,
    val documentCount: Int = 0,
    val configCount: Int = 0
)

/**
 * ViewModel for the Artifact List screen.
 *
 * Manages artifact loading, filtering, and searching for a specific session.
 * The [sessionId] is extracted from the [SavedStateHandle] navigation argument.
 *
 * Artifacts are loaded from the repository and then filtered/searched based
 * on user interaction. The ViewModel exposes both the UI state and the
 * filtered artifact list as reactive [StateFlow] values.
 */
@HiltViewModel
class ArtifactViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val sessionRepository: SessionRepository
) : ViewModel() {

    /**
     * The session ID extracted from the navigation argument.
     */
    val sessionId: String = checkNotNull(savedStateHandle["sessionId"]) {
        "sessionId navigation argument is required"
    }

    private val _uiState = MutableStateFlow(ArtifactListUiState())
    val uiState: StateFlow<ArtifactListUiState> = _uiState.asStateFlow()

    /**
     * All artifacts for the session, loaded from the repository.
     */
    private val _allArtifacts = MutableStateFlow<List<Artifact>>(emptyList())

    /**
     * Filtered and searched artifacts for display.
     * Combines the raw artifact list with the current filter and search query.
     */
    val filteredArtifacts: StateFlow<List<Artifact>> = combine(
        _allArtifacts,
        _uiState
    ) { artifacts, state ->
        var result = artifacts

        // Apply type filter
        result = when (state.typeFilter) {
            ArtifactTypeFilter.ALL -> result
            ArtifactTypeFilter.CODE -> result.filter { it.type == ArtifactType.CODE }
            ArtifactTypeFilter.DOCUMENTS -> result.filter { it.type == ArtifactType.DOCUMENT }
            ArtifactTypeFilter.CONFIG -> result.filter { it.type == ArtifactType.CONFIG }
        }

        // Apply search filter
        if (state.searchQuery.isNotBlank()) {
            val query = state.searchQuery.lowercase()
            result = result.filter { artifact ->
                artifact.title.lowercase().contains(query) ||
                    (artifact.filePath?.lowercase()?.contains(query) == true) ||
                    (artifact.language?.displayName?.lowercase()?.contains(query) == true)
            }
        }

        // Sort by most recent activity
        result.sortedByDescending { it.updatedAt ?: it.createdAt }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        loadArtifacts()
    }

    /**
     * Load artifacts from the repository for the session.
     */
    fun loadArtifacts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val artifacts = sessionRepository.getArtifacts(sessionId)
                _allArtifacts.value = artifacts
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        hasLoaded = true,
                        totalCount = artifacts.size,
                        codeCount = artifacts.count { a -> a.type == ArtifactType.CODE },
                        documentCount = artifacts.count { a -> a.type == ArtifactType.DOCUMENT },
                        configCount = artifacts.count { a -> a.type == ArtifactType.CONFIG }
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to load artifacts for session: $sessionId", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        hasLoaded = true,
                        errorMessage = e.message ?: "Failed to load artifacts"
                    )
                }
            }
        }
    }

    /**
     * Refresh artifacts from the repository.
     */
    fun refreshArtifacts() {
        loadArtifacts()
    }

    /**
     * Update the search query for filtering artifacts.
     */
    fun onSearchQueryChanged(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    /**
     * Update the type filter.
     */
    fun onFilterChanged(filter: ArtifactTypeFilter) {
        _uiState.update { it.copy(typeFilter = filter) }
    }

    /**
     * Dismiss the current error message.
     */
    fun dismissError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    /**
     * Find an artifact by ID from the loaded artifacts.
     *
     * @param artifactId The artifact ID to find.
     * @return The artifact if found, null otherwise.
     */
    fun findArtifact(artifactId: String): Artifact? {
        return _allArtifacts.value.find { it.id == artifactId }
    }

    companion object {
        private const val TAG = "ArtifactViewModel"
    }
}
