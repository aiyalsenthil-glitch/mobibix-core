package com.aiyal.mobibix.domain.repository

import com.aiyal.mobibix.domain.model.Role
import com.aiyal.mobibix.domain.model.PermissionModule

interface RolesRepository {
    suspend fun listRoles(): List<Role>
    suspend fun getRole(id: String): Role
    suspend fun createRole(name: String, description: String, permissions: List<String>): Role
    suspend fun updateRole(id: String, name: String, description: String, permissions: List<String>): Role
    suspend fun deleteRole(id: String)
    suspend fun getPermissionModules(): List<PermissionModule>
}
