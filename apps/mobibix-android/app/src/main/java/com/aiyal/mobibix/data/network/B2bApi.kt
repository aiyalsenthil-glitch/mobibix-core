package com.aiyal.mobibix.data.network

import retrofit2.http.*

// ─── B2B Models ───────────────────────────────────────────────────────────────

data class B2bCustomer(
    val id: String,
    val businessName: String,
    val contactPerson: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val gstin: String? = null,
    val address: String? = null,
    val creditLimit: Double = 0.0,
    val outstandingBalance: Double = 0.0,
    val totalPurchases: Double = 0.0,
    val status: String = "ACTIVE",
    val createdAt: String? = null
)

data class CreateB2bCustomerDto(
    val businessName: String,
    val contactPerson: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val gstin: String? = null,
    val address: String? = null,
    val creditLimit: Double = 0.0
)

data class B2bInvoice(
    val id: String,
    val invoiceNumber: String,
    val date: String,
    val dueDate: String? = null,
    val customerId: String,
    val customerName: String,
    val totalAmount: Double,
    val paidAmount: Double = 0.0,
    val status: String, // DRAFT, CONFIRMED, PARTIALLY_PAID, PAID, OVERDUE
    val paymentStatus: String,
    val gstin: String? = null,
    val items: List<B2bInvoiceItem>? = null
)

data class B2bInvoiceItem(
    val description: String,
    val quantity: Int,
    val rate: Double,
    val gstRate: Double = 0.0,
    val hsnCode: String? = null,
    val lineTotal: Double
)

data class B2bDashboardStats(
    val totalCustomers: Int = 0,
    val activeCustomers: Int = 0,
    val totalOutstanding: Double = 0.0,
    val overdueAmount: Double = 0.0,
    val thisMonthRevenue: Double = 0.0,
    val totalRevenue: Double = 0.0
)

data class CreateB2bInvoiceDto(
    val customerId: String,
    val dueDate: String? = null,
    val items: List<B2bInvoiceItemDto>,
    val notes: String? = null
)

data class B2bInvoiceItemDto(
    val description: String,
    val quantity: Int,
    val rate: Double,
    val gstRate: Double = 0.0,
    val hsnCode: String? = null
)

// ─── API ─────────────────────────────────────────────────────────────────────

interface B2bApi {

    @GET("api/mobileshop/shops/{shopId}/b2b/stats")
    suspend fun getDashboardStats(
        @Path("shopId") shopId: String
    ): B2bDashboardStats

    @GET("api/mobileshop/shops/{shopId}/b2b/customers")
    suspend fun listCustomers(
        @Path("shopId") shopId: String,
        @Query("search") search: String? = null,
        @Query("status") status: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): List<B2bCustomer>

    @GET("api/mobileshop/shops/{shopId}/b2b/customers/{customerId}")
    suspend fun getCustomer(
        @Path("shopId") shopId: String,
        @Path("customerId") customerId: String
    ): B2bCustomer

    @POST("api/mobileshop/shops/{shopId}/b2b/customers")
    suspend fun createCustomer(
        @Path("shopId") shopId: String,
        @Body dto: CreateB2bCustomerDto
    ): B2bCustomer

    @PATCH("api/mobileshop/shops/{shopId}/b2b/customers/{customerId}")
    suspend fun updateCustomer(
        @Path("shopId") shopId: String,
        @Path("customerId") customerId: String,
        @Body dto: CreateB2bCustomerDto
    ): B2bCustomer

    @GET("api/mobileshop/shops/{shopId}/b2b/invoices")
    suspend fun listInvoices(
        @Path("shopId") shopId: String,
        @Query("customerId") customerId: String? = null,
        @Query("status") status: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): List<B2bInvoice>

    @POST("api/mobileshop/shops/{shopId}/b2b/invoices")
    suspend fun createInvoice(
        @Path("shopId") shopId: String,
        @Body dto: CreateB2bInvoiceDto
    ): B2bInvoice

    @POST("api/mobileshop/shops/{shopId}/b2b/invoices/{invoiceId}/record-payment")
    suspend fun recordPayment(
        @Path("shopId") shopId: String,
        @Path("invoiceId") invoiceId: String,
        @Query("amount") amount: Double
    ): B2bInvoice
}
