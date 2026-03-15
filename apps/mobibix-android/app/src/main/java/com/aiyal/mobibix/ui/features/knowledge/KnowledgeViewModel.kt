package com.aiyal.mobibix.ui.features.knowledge

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KnowledgeState(
    val loading: Boolean = false,
    val faultTypes: List<FaultType> = emptyList(),
    val notes: List<RepairNote> = emptyList(),
    val checklist: FaultDiagnosis? = null,
    val selectedFaultType: FaultType? = null,
    val error: String? = null,
    val submitting: Boolean = false,
    val submitSuccess: Boolean = false
)

data class JobKnowledgeState(
    val loading: Boolean = true,
    val data: KnowledgeForJobResponse? = null,
    val error: String? = null
)

@HiltViewModel
class KnowledgeViewModel @Inject constructor(
    private val knowledgeApi: KnowledgeApi
) : ViewModel() {

    private val _state = MutableStateFlow(KnowledgeState())
    val state = _state.asStateFlow()

    private val _jobState = MutableStateFlow(JobKnowledgeState())
    val jobState = _jobState.asStateFlow()

    fun loadFaultTypes() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            try {
                val types = knowledgeApi.listFaultTypes()
                _state.value = _state.value.copy(loading = false, faultTypes = types)
            } catch (e: Exception) {
                _state.value = _state.value.copy(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun selectFaultType(faultType: FaultType) {
        _state.value = _state.value.copy(selectedFaultType = faultType, notes = emptyList(), checklist = null)
        viewModelScope.launch {
            try {
                val notes = knowledgeApi.getRepairNotes(faultTypeId = faultType.id)
                val checklist = try { knowledgeApi.getChecklist(faultType.id) } catch (_: Exception) { null }
                _state.value = _state.value.copy(notes = notes, checklist = checklist)
            } catch (e: Exception) {
                _state.value = _state.value.copy(error = MobiError.extractMessage(e))
            }
        }
    }

    fun voteNote(noteId: String, helpful: Boolean) {
        viewModelScope.launch {
            try {
                knowledgeApi.voteOnNote(noteId, VoteNoteDto(if (helpful) "helpful" else "notHelpful"))
                // Optimistic update
                _state.value = _state.value.copy(notes = _state.value.notes.map { n ->
                    if (n.id == noteId) n.copy(
                        helpfulCount = if (helpful) n.helpfulCount + 1 else n.helpfulCount,
                        notHelpfulCount = if (!helpful) n.notHelpfulCount + 1 else n.notHelpfulCount
                    ) else n
                })
            } catch (_: Exception) {}
        }
    }

    fun submitNote(faultTypeId: String, content: String, onDone: () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(submitting = true)
            try {
                val note = knowledgeApi.submitRepairNote(SubmitRepairNoteDto(faultTypeId = faultTypeId, content = content))
                _state.value = _state.value.copy(
                    submitting = false, submitSuccess = true,
                    notes = _state.value.notes + note
                )
                onDone()
            } catch (e: Exception) {
                _state.value = _state.value.copy(submitting = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun loadJobKnowledge(jobCardId: String) {
        viewModelScope.launch {
            _jobState.value = JobKnowledgeState(loading = true)
            try {
                val data = knowledgeApi.getKnowledgeForJob(jobCardId)
                _jobState.value = JobKnowledgeState(loading = false, data = data)
            } catch (e: Exception) {
                _jobState.value = JobKnowledgeState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }
}
