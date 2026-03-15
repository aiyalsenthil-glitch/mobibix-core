package com.aiyal.mobibix.model

enum class JobStatus {
    RECEIVED,
    ASSIGNED,
    DIAGNOSING,
    WAITING_APPROVAL,
    APPROVED,
    WAITING_FOR_PARTS,
    IN_PROGRESS,
    READY,
    DELIVERED,
    CANCELLED,
    RETURNED,
    SCRAPPED,
    UNKNOWN
}
