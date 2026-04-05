package com.aiyal.mobibix.domain.model

data class PermissionModule(
    val moduleType: String,
    val displayName: String,
    val resources: List<PermissionResource>
)

data class PermissionResource(
    val resourceName: String,
    val displayName: String,
    val actions: List<PermissionAction>
)

data class PermissionAction(
    val key: String,       // e.g. "sales.create"
    val label: String,     // e.g. "Create Sales"
    val isSensitive: Boolean
)

// Keys that indicate sensitive/financial permissions
private val SENSITIVE_ACTIONS = setOf(
    "view_profit", "refund", "view_financials", "export",
    "override", "delete", "void", "discount_override", "adjust"
)

fun buildPermissionModules(
    raw: List<com.aiyal.mobibix.data.network.dto.PermissionModuleResponse>
): List<PermissionModule> {
    val moduleDisplayNames = mapOf(
        "MOBILE_SHOP" to "Mobile Shop",
        "CORE" to "Core & Finance",
        "GYM" to "Gym Management",
        "WHATSAPP" to "WhatsApp CRM",
        "WHATSAPP_MASTER" to "WhatsApp Master"
    )
    val resourceDisplayNames = mapOf(
        "sales" to "Sales", "inventory" to "Inventory", "jobcard" to "Job Cards",
        "report" to "Reports", "customer" to "Customers", "staff" to "Staff",
        "approval" to "Approvals", "setting" to "Settings", "product" to "Products",
        "purchase" to "Purchases", "supplier" to "Suppliers", "loyalty" to "Loyalty",
        "quotation" to "Quotations", "voucher" to "Vouchers", "receipt" to "Receipts",
        "expense" to "Expenses", "b2b" to "B2B / Trade", "tradein" to "Trade-In",
        "commission" to "Commission", "creditnote" to "Credit Notes"
    )

    return raw.map { module ->
        PermissionModule(
            moduleType = module.moduleType,
            displayName = moduleDisplayNames[module.moduleType] ?: module.moduleType,
            resources = module.resources.map { res ->
                PermissionResource(
                    resourceName = res.resourceName,
                    displayName = resourceDisplayNames[res.resourceName]
                        ?: res.resourceName.replaceFirstChar { it.uppercase() },
                    actions = res.actions.map { action ->
                        val fullKey = "${res.resourceName}.$action"
                        PermissionAction(
                            key = fullKey,
                            label = action.split("_")
                                .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } },
                            isSensitive = SENSITIVE_ACTIONS.any { action.contains(it, ignoreCase = true) }
                        )
                    }
                )
            }
        )
    }
}
