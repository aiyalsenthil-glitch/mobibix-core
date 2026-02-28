package com.aiyal.mobibix.model

enum class JobStatus {
    RECEIVED,
    DIAGNOSING,      // Added: device being diagnosed before repair
    IN_PROGRESS,
    READY,           // Repair complete, ready for pickup
    DELIVERED,       // Terminal: delivered to customer
    CANCELLED,       // Terminal: job cancelled
    RETURNED,        // Terminal: returned without repair
    SCRAPPED,        // Terminal: device scrapped/abandoned (added in git pull Feb 28)
    UNKNOWN          // Safe fallback — prevents crash on future backend status additions
}
