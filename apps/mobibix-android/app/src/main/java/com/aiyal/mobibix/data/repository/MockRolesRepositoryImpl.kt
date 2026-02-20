package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.domain.model.Role
import com.aiyal.mobibix.domain.repository.RolesRepository
import kotlinx.coroutines.delay
import javax.inject.Inject

class MockRolesRepositoryImpl @Inject constructor() : RolesRepository {
    private val mockRoles = mutableListOf(
        Role(
            id = "system_owner",
            name = "System Owner",
            isSystem = true,
            description = "Full access to all modules and billing. Cannot be modified or deleted.",
            permissions = listOf("*")
        ),
        Role(
            id = "shop_manager",
            name = "Shop Manager",
            isSystem = true,
            description = "Can manage sales, inventory, and staff. Cannot view profit margins or export financial data.",
            permissions = listOf(
                "sale.create", "sale.view", "sale.refund",
                "inventory.view", "inventory.adjust", "inventory.create",
                "customer.view", "customer.create"
            )
        ),
        Role(
            id = "sales_executive",
            name = "Sales Executive",
            isSystem = true,
            description = "Can ring up sales and view basic inventory. No access to adjustments or refunds.",
            permissions = listOf("sale.create", "sale.view", "inventory.view", "customer.create", "customer.view")
        )
    )

    override suspend fun listRoles(): List<Role> {
        delay(600)
        return mockRoles.toList()
    }

    override suspend fun getRole(id: String): Role {
        delay(400)
        return mockRoles.find { it.id == id } ?: throw Exception("Role not found")
    }

    override suspend fun createRole(name: String, description: String, permissions: List<String>): Role {
        delay(600)
        val newRole = Role(
            id = "custom_" + System.currentTimeMillis(),
            name = name.ifEmpty { "Custom Role" },
            isSystem = false,
            description = description.ifEmpty { "Custom role created by user" },
            permissions = permissions
        )
        mockRoles.add(newRole)
        return newRole
    }

    override suspend fun updateRole(id: String, name: String, description: String, permissions: List<String>): Role {
        delay(600)
        val idx = mockRoles.indexOfFirst { it.id == id }
        if (idx == -1) throw Exception("Role not found")
        if (mockRoles[idx].isSystem) throw Exception("Cannot modify system roles")
        
        val updated = mockRoles[idx].copy(name = name, description = description, permissions = permissions)
        mockRoles[idx] = updated
        return updated
    }

    override suspend fun deleteRole(id: String) {
        delay(600)
        val idx = mockRoles.indexOfFirst { it.id == id }
        if (idx == -1) throw Exception("Role not found")
        if (mockRoles[idx].isSystem) throw Exception("Cannot delete system roles")
        
        mockRoles.removeAt(idx)
    }
}
