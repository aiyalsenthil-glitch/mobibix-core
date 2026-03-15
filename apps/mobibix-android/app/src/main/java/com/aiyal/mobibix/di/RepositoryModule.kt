package com.aiyal.mobibix.di

import com.aiyal.mobibix.data.repository.*
import com.aiyal.mobibix.domain.*
import com.aiyal.mobibix.domain.repository.*
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindDashboardRepository(
        dashboardRepositoryImpl: DashboardRepositoryImpl
    ): DashboardRepository

    @Binds
    @Singleton
    abstract fun bindCustomerRepository(
        customerRepositoryImpl: CustomerRepositoryImpl
    ): CustomerRepository

    @Binds
    @Singleton
    abstract fun bindJobRepository(
        jobRepositoryImpl: JobRepositoryImpl
    ): JobRepository

    @Binds
    @Singleton
    abstract fun bindShopRepository(
        shopRepositoryImpl: ShopRepositoryImpl
    ): ShopRepository

    @Binds
    @Singleton
    abstract fun bindProductRepository(
        productRepositoryImpl: ProductRepositoryImpl
    ): ProductRepository

    @Binds
    @Singleton
    abstract fun bindReportRepository(
        reportRepositoryImpl: ReportRepositoryImpl
    ): ReportRepository

    @Binds
    @Singleton
    abstract fun bindPurchaseRepository(
        purchaseRepositoryImpl: PurchaseRepositoryImpl
    ): PurchaseRepository

    @Binds
    @Singleton
    abstract fun bindSupplierRepository(
        supplierRepositoryImpl: SupplierRepositoryImpl
    ): SupplierRepository

    @Binds
    @Singleton
    abstract fun bindReceiptRepository(
        receiptRepositoryImpl: ReceiptRepositoryImpl
    ): ReceiptRepository

    @Binds
    @Singleton
    abstract fun bindVoucherRepository(
        voucherRepositoryImpl: VoucherRepositoryImpl
    ): VoucherRepository

    @Binds
    @Singleton
    abstract fun bindStaffRepository(
        staffRepositoryImpl: StaffRepositoryImpl
    ): StaffRepository

    @Binds
    @Singleton
    abstract fun bindRolesRepository(
        rolesRepositoryImpl: RolesRepositoryImpl
    ): RolesRepository

    @Binds
    @Singleton
    abstract fun bindApprovalRepository(
        approvalRepositoryImpl: ApprovalRepositoryImpl
    ): ApprovalRepository

    @Binds
    @Singleton
    abstract fun bindWhatsappRepository(
        whatsappRepositoryImpl: WhatsappRepositoryImpl
    ): WhatsappRepository

    @Binds
    @Singleton
    abstract fun bindLoyaltyRepository(
        loyaltyRepositoryImpl: LoyaltyRepositoryImpl
    ): LoyaltyRepository

    @Binds
    @Singleton
    abstract fun bindBillingRepository(
        billingRepositoryImpl: BillingRepositoryImpl
    ): BillingRepository
}
