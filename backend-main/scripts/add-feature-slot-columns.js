/**
 * One-time migration: adds 7 nullable TEXT columns to the `topics` table
 * for per-feature content slots. Idempotent — safe to run multiple times.
 *
 * Auto-detects PostgreSQL vs MySQL/MariaDB.
 *
 * Usage on VPS (after pulling latest code):
 *   node scripts/add-feature-slot-columns.js
 */

const db = require("../src/config/db");

const COLUMNS = [
  "explanationContent",
  "revisionContent",
  "hiddenLinksContent",
  "exerciseRevivalContent",
  "masterExemplarContent",
  "pyqContent",
  "chapterCheckpointContent",
];

const isMySQL = (dialect) => dialect === "mysql" || dialect === "mariadb";

const columnExistsMySQL = async (table, col) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    { replacements: [table, col] }
  );
  return rows[0].c > 0;
};

(async () => {
  try {
    await db.authenticate();
    const dialect = db.getDialect();
    console.log(`DB connected (${dialect}). Adding feature slot columns to topics...`);

    // Make legacy content columns nullable so feature-slot-only topics can be created.
    const LEGACY_NULLABLE = ["contentURL", "contentThumbnail", "contentId"];
    for (const col of LEGACY_NULLABLE) {
      try {
        if (dialect === "mysql" || dialect === "mariadb") {
          // For MySQL we need to know the type — TEXT for first two, VARCHAR(255) for contentId.
          const t = col === "contentId" ? "VARCHAR(255)" : "TEXT";
          await db.query(`ALTER TABLE \`topics\` MODIFY \`${col}\` ${t} NULL;`);
        } else {
          await db.query(`ALTER TABLE "topics" ALTER COLUMN "${col}" DROP NOT NULL;`);
        }
        console.log(`  ✓ ${col} -> NULL allowed`);
      } catch (e) {
        console.log(`  • ${col}: ${e.message.split("\n")[0]}`);
      }
    }

    for (const col of COLUMNS) {
      if (isMySQL(dialect)) {
        // MySQL has no "ADD COLUMN IF NOT EXISTS" pre-8.0 — check first.
        const exists = await columnExistsMySQL("topics", col);
        if (exists) {
          console.log(`  • ${col} already exists, skipping`);
          continue;
        }
        const sql = `ALTER TABLE \`topics\` ADD COLUMN \`${col}\` TEXT NULL;`;
        await db.query(sql);
      } else {
        // Postgres — idempotent native syntax.
        const sql = `ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "${col}" TEXT NULL;`;
        await db.query(sql);
      }
      console.log(`  ✓ ${col}`);
    }

    console.log("Done. All columns ensured.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
})();
