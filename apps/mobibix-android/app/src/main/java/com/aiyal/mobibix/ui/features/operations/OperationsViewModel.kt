package com.aiyal.mobibix.ui.features.operations

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiyal.mobibix.core.util.MobiError
import com.aiyal.mobibix.data.network.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── Expense State ────────────────────────────────────────────────────────────

data class ExpenseState(
    val loading: Boolean = true,
    val expenses: List<Expense> = emptyList(),
    val categories: List<ExpenseCategory> = emptyList(),
    val totalAmount: Double = 0.0,
    val categoryBreakdown: List<ExpenseCategoryBreakdown> = emptyList(),
    val error: String? = null,
    val saving: Boolean = false
)

// ─── Daily Closing State ──────────────────────────────────────────────────────

data class DailyClosingState(
    val loading: Boolean = true,
    val history: List<DailyClosing> = emptyList(),
    val error: String? = null,
    val submitting: Boolean = false,
    val submitSuccess: Boolean = false
)

// ─── Stock Verification State ─────────────────────────────────────────────────

data class StockVerificationState(
    val loading: Boolean = true,
    val sessions: List<StockVerificationSession> = emptyList(),
    val activeSession: StockVerificationSession? = null,
    val error: String? = null,
    val saving: Boolean = false
)

// ─── Monthly Report State ─────────────────────────────────────────────────────

data class MonthlyReportState(
    val loading: Boolean = true,
    val report: MonthlyReport? = null,
    val trend: List<MonthlyProfit> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class OperationsViewModel @Inject constructor(
    private val operationsApi: OperationsApi
) : ViewModel() {

    private val _expenseState = MutableStateFlow(ExpenseState())
    val expenseState = _expenseState.asStateFlow()

    private val _dailyClosingState = MutableStateFlow(DailyClosingState())
    val dailyClosingState = _dailyClosingState.asStateFlow()

    private val _stockVerificationState = MutableStateFlow(StockVerificationState())
    val stockVerificationState = _stockVerificationState.asStateFlow()

    private val _monthlyReportState = MutableStateFlow(MonthlyReportState())
    val monthlyReportState = _monthlyReportState.asStateFlow()

    // ── Expenses ────────────────────────────────────────────────────────────────

    fun loadExpenses(shopId: String, startDate: String? = null, endDate: String? = null) {
        viewModelScope.launch {
            _expenseState.value = _expenseState.value.copy(loading = true)
            try {
                val expenseResp = operationsApi.listExpenses(shopId, startDate, endDate)
                val categories = operationsApi.listExpenseCategories(shopId)
                val breakdown = try { operationsApi.getExpenseCategoryBreakdown(shopId, startDate, endDate).data } catch (_: Exception) { emptyList() }
                _expenseState.value = ExpenseState(
                    loading = false,
                    expenses = expenseResp.data,
                    totalAmount = expenseResp.total,
                    categories = categories,
                    categoryBreakdown = breakdown
                )
            } catch (e: Exception) {
                _expenseState.value = ExpenseState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun createExpense(dto: CreateExpenseDto, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _expenseState.value = _expenseState.value.copy(saving = true)
            try {
                operationsApi.createExpense(dto)
                onSuccess()
            } catch (e: Exception) {
                onError(MobiError.extractMessage(e))
            } finally {
                _expenseState.value = _expenseState.value.copy(saving = false)
            }
        }
    }

    // ── Daily Closing ───────────────────────────────────────────────────────────

    fun loadDailyHistory(shopId: String) {
        viewModelScope.launch {
            _dailyClosingState.value = DailyClosingState(loading = true)
            try {
                val history = operationsApi.getDailyHistory(shopId)
                _dailyClosingState.value = DailyClosingState(loading = false, history = history)
            } catch (e: Exception) {
                _dailyClosingState.value = DailyClosingState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun submitDailyClosing(shopId: String, reportedCash: Double, notes: String?, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _dailyClosingState.value = _dailyClosingState.value.copy(submitting = true)
            try {
                operationsApi.submitDailyClosing(SubmitDailyClosingDto(shopId, reportedCash, notes))
                _dailyClosingState.value = _dailyClosingState.value.copy(submitting = false, submitSuccess = true)
                onSuccess()
            } catch (e: Exception) {
                _dailyClosingState.value = _dailyClosingState.value.copy(submitting = false, error = MobiError.extractMessage(e))
            }
        }
    }

    // ── Stock Verification ──────────────────────────────────────────────────────

    fun loadStockVerifications(shopId: String) {
        viewModelScope.launch {
            _stockVerificationState.value = StockVerificationState(loading = true)
            try {
                val sessions = operationsApi.listStockVerifications(shopId)
                val active = sessions.firstOrNull { it.status == "DRAFT" }
                _stockVerificationState.value = StockVerificationState(loading = false, sessions = sessions, activeSession = active)
            } catch (e: Exception) {
                _stockVerificationState.value = StockVerificationState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun startStockVerification(shopId: String) {
        viewModelScope.launch {
            _stockVerificationState.value = _stockVerificationState.value.copy(saving = true)
            try {
                val session = operationsApi.startStockVerification(StartStockVerificationDto(shopId))
                _stockVerificationState.value = _stockVerificationState.value.copy(
                    saving = false,
                    activeSession = session,
                    sessions = listOf(session) + _stockVerificationState.value.sessions
                )
            } catch (e: Exception) {
                _stockVerificationState.value = _stockVerificationState.value.copy(saving = false, error = MobiError.extractMessage(e))
            }
        }
    }

    fun confirmStockVerification(sessionId: String, onDone: () -> Unit) {
        viewModelScope.launch {
            try {
                operationsApi.confirmStockVerification(sessionId)
                _stockVerificationState.value = _stockVerificationState.value.copy(activeSession = null)
                onDone()
            } catch (e: Exception) {
                _stockVerificationState.value = _stockVerificationState.value.copy(error = MobiError.extractMessage(e))
            }
        }
    }

    // ── Monthly Report ──────────────────────────────────────────────────────────

    fun loadMonthlyReport(shopId: String) {
        viewModelScope.launch {
            _monthlyReportState.value = MonthlyReportState(loading = true)
            try {
                val report = operationsApi.getMonthlyReport(shopId)
                val trend = try { operationsApi.getMonthlyTrend(shopId) } catch (_: Exception) { emptyList() }
                _monthlyReportState.value = MonthlyReportState(loading = false, report = report, trend = trend)
            } catch (e: Exception) {
                _monthlyReportState.value = MonthlyReportState(loading = false, error = MobiError.extractMessage(e))
            }
        }
    }
}
