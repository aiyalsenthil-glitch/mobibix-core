package com.aiyal.mobibix.data.local

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * Migration 1 → 2: Added cached_invoices and cached_customers tables
 */
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS `cached_invoices` (
                `id` TEXT NOT NULL,
                `shopId` TEXT NOT NULL,
                `invoiceNumber` TEXT NOT NULL,
                `customerName` TEXT NOT NULL,
                `customerPhone` TEXT,
                `totalAmount` REAL NOT NULL,
                `paidAmount` REAL NOT NULL,
                `status` TEXT NOT NULL,
                `paymentStatus` TEXT NOT NULL,
                `invoiceDate` TEXT NOT NULL,
                `dueDate` TEXT,
                `itemsSummary` TEXT NOT NULL,
                `syncedAt` INTEGER NOT NULL,
                PRIMARY KEY(`id`)
            )
            """.trimIndent()
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS `index_cached_invoices_shopId` ON `cached_invoices` (`shopId`)"
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS `cached_customers` (
                `id` TEXT NOT NULL,
                `shopId` TEXT NOT NULL,
                `name` TEXT NOT NULL,
                `phone` TEXT,
                `email` TEXT,
                `gstin` TEXT,
                `totalPurchases` REAL NOT NULL,
                `outstandingBalance` REAL NOT NULL,
                `syncedAt` INTEGER NOT NULL,
                PRIMARY KEY(`id`)
            )
            """.trimIndent()
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS `index_cached_customers_shopId` ON `cached_customers` (`shopId`)"
        )
    }
}

/**
 * Migration 2 → 3: Schema version bump — no structural changes
 */
val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        // No structural changes in this version bump
    }
}
