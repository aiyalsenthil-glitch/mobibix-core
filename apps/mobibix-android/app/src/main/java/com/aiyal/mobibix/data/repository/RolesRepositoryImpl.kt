package com.aiyal.mobibix.data.repository

import com.aiyal.mobibix.data.network.PermissionsApi
import com.aiyal.mobibix.data.network.dto.CreateRoleRequest
import com.aiyal.mobibix.data.network.dto.UpdateRoleRequest
import com.aiyal.mobibix.domain.model.PermissionModule
import com.aiyal.mobibix.domain.model.Role
import com.aiyal.mobibix.domain.model.buildPermissionModules
import com.aiyal.mobibix.domain.repository.RolesRepository
import javax.inject.Inject

class RolesRepositoryImpl @Inject constructor(
    private val api: PermissionsApi
) : RolesRepository {

    override suspend fun listRoles(): List<Role> =
        api.listRoles().map { it.toDomain() }

    override suspend fun getRole(id: String): Role =
        api.getRole(id).toDomain()

    override suspend fun createRole(name: String, description: String, permissions: List<String>): Role =
        api.createRole(CreateRoleRequest(name, description, permissions)).toDomain()

    override suspend fun updateRole(id: String, name: String, description: String, permissions: List<String>): Role =
        api.updateRole(id, UpdateRoleRequest(name, description, permissions)).toDomain()

    override suspend fun deleteRole(id: String) {
        api.deleteRole(id)
    }

    override suspend fun getPermissionModules(): List<PermissionModule> =
        buildPermissionModules(api.getPermissionModules())
}
