/**
 * One-time migration: adds 7 nullable JSONB columns to the `topics` table
 * for per-feature content slots. Safe to run multiple times — IF NOT EXISTS
 * guards prevent duplicate column errors.
 *
 * Usage on VPS (after pulling latest code):
 *   node scripts/add-feature-slot-columns.js
 */

const db = require("../src/config/db");

const COLUMNS = [
  "explanationContent",
  "revisionRecallContent",
  "hiddenLinksContent",
  "exerciseRevivalContent",
  "masterExemplarContent",
  "pyqContent",
  "chapterCheckpointContent",
];

(async () => {
  try {
    await db.authenticate();
    console.log("DB connected. Adding feature slot columns to topics...");

    for (const col of COLUMNS) {
      // Postgres-friendly idempotent add. Quoted to preserve camelCase.
      const sql = `ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "${col}" JSONB NULL;`;
      await db.query(sql);
      console.log(`  ✓ ${col}`);
    }

    console.log("Done. All columns ensured.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
})();
