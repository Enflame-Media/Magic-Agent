package com.enflame.happy.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import com.enflame.happy.data.local.dao.MessageDao
import com.enflame.happy.data.local.dao.SessionDao
import com.enflame.happy.data.local.entity.MessageEntity
import com.enflame.happy.data.local.entity.SessionEntity

/**
 * Room database for the Happy Android app.
 *
 * Provides local persistence for sessions and messages.
 * Uses [Converters] for mapping complex types to SQLite-compatible
 * column types.
 *
 * Database version history:
 * - v1: Initial schema with sessions and messages tables
 */
@Database(
    entities = [
        SessionEntity::class,
        MessageEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class HappyDatabase : RoomDatabase() {

    abstract fun sessionDao(): SessionDao
    abstract fun messageDao(): MessageDao

    companion object {
        const val DATABASE_NAME = "happy_database"

        /**
         * All database migrations.
         *
         * Migrations are applied sequentially to upgrade the database
         * from one version to the next. Add new migrations here as
         * the schema evolves.
         */
        val MIGRATIONS: Array<Migration> = arrayOf(
            // Future migrations go here, e.g.:
            // MIGRATION_1_2
        )

        // Example migration template:
        // val MIGRATION_1_2 = object : Migration(1, 2) {
        //     override fun migrate(db: SupportSQLiteDatabase) {
        //         db.execSQL("ALTER TABLE sessions ADD COLUMN new_column TEXT")
        //     }
        // }
    }
}
