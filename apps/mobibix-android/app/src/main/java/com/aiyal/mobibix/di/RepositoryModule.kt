package com.aiyal.mobibix.di

import com.aiyal.mobibix.data.repository.DashboardRepositoryImpl
import com.aiyal.mobibix.domain.DashboardRepository
import com.aiyal.mobibix.data.repository.CustomerRepositoryImpl
import com.aiyal.mobibix.domain.CustomerRepository
import com.aiyal.mobibix.data.repository.JobRepositoryImpl
import com.aiyal.mobibix.domain.JobRepository
import com.aiyal.mobibix.data.repository.PurchaseRepositoryImpl
import com.aiyal.mobibix.data.repository.ReceiptRepositoryImpl
import com.aiyal.mobibix.data.repository.ReportRepositoryImpl
import com.aiyal.mobibix.data.repository.ShopRepositoryImpl
import com.aiyal.mobibix.data.repository.StaffRepositoryImpl
import com.aiyal.mobibix.data.repository.SupplierRepositoryImpl
import com.aiyal.mobibix.data.repository.VoucherRepositoryImpl
import com.aiyal.mobibix.domain.PurchaseRepository
import com.aiyal.mobibix.domain.ReceiptRepository
import com.aiyal.mobibix.domain.ReportRepository
import com.aiyal.mobibix.domain.ShopRepository
import com.aiyal.mobibix.domain.StaffRepository
import com.aiyal.mobibix.domain.SupplierRepository
import com.aiyal.mobibix.domain.VoucherRepository
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
        productRepositoryImpl: com.aiyal.mobibix.data.repository.ProductRepositoryImpl
    ): com.aiyal.mobibix.domain.ProductRepository

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
}
