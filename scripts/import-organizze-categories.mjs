// Wipes the user's transactions, recurrences, budgets and categories,
// then imports the categories from importacao/categorias.json (Organizze export).
//
// Usage:
//   USER_ID=<uuid> node scripts/import-organizze-categories.mjs [--dry-run]
//
// If USER_ID is not set and exactly one user exists in auth.users, that user is used.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

config({ path: resolve(projectRoot, ".env.local") });
config({ path: resolve(projectRoot, ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL or DATABASE_URL must be set");
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

function mapKind(kind) {
  if (kind === "expenses") return "expense";
  if (kind === "earnings") return "income";
  return null;
}

async function resolveUserId() {
  if (process.env.USER_ID) return process.env.USER_ID;
  const rows = await sql`select id from auth.users`;
  if (rows.length === 0) throw new Error("No users in auth.users");
  if (rows.length > 1) {
    throw new Error(`Multiple users found (${rows.length}). Set USER_ID env var to disambiguate.`);
  }
  return rows[0].id;
}

async function main() {
  const userId = await resolveUserId();
  console.log(`User: ${userId}`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "EXECUTE"}`);

  const json = JSON.parse(
    await readFile(resolve(projectRoot, "importacao/categorias.json"), "utf-8"),
  );

  // Filter out kind="none" (transferências, pagamento de fatura) — those are modeled separately.
  const importable = json.filter((c) => mapKind(c.kind) !== null);

  // Preserve insertion order: roots first, then children, so parent FKs resolve.
  const roots = importable.filter((c) => !c.parent_uuid);
  const children = importable.filter((c) => c.parent_uuid);

  console.log(
    `Categorias no JSON: ${json.length} (${importable.length} importáveis, ${json.length - importable.length} ignoradas por kind=none)`,
  );
  console.log(`  Raízes: ${roots.length}`);
  console.log(`  Filhas: ${children.length}`);

  // Sanity: every child's parent must be in `importable`.
  const importableUuids = new Set(importable.map((c) => c.uuid));
  const orphans = children.filter((c) => !importableUuids.has(c.parent_uuid));
  if (orphans.length > 0) {
    console.warn(
      `Aviso: ${orphans.length} subcategorias têm parent fora do importável — serão promovidas a raiz:`,
      orphans.map((c) => c.name),
    );
  }

  if (DRY_RUN) {
    console.log("\nDry run — não escrevendo nada. Exemplos:");
    console.log(
      "  Raízes:",
      roots
        .slice(0, 5)
        .map((c) => c.name)
        .join(", "),
    );
    console.log(
      "  Filhas:",
      children
        .slice(0, 5)
        .map((c) => `${c.name}`)
        .join(", "),
    );
    await sql.end();
    return;
  }

  const orgUuidToDbId = new Map();

  await sql.begin(async (tx) => {
    // Order matters: transactions first (FK to category, account, etc), then dependents,
    // then categories themselves.
    const [{ count: txCount }] =
      await tx`select count(*)::int as count from transactions where user_id = ${userId}`;
    const [{ count: recCount }] =
      await tx`select count(*)::int as count from recurrences where user_id = ${userId}`;
    const [{ count: budCount }] =
      await tx`select count(*)::int as count from budgets where user_id = ${userId}`;
    const [{ count: catCount }] =
      await tx`select count(*)::int as count from categories where user_id = ${userId}`;

    console.log(
      `\nApagando: ${txCount} transações, ${recCount} recorrências, ${budCount} orçamentos, ${catCount} categorias…`,
    );

    await tx`delete from transactions where user_id = ${userId}`;
    await tx`delete from recurrences where user_id = ${userId}`;
    await tx`delete from budgets where user_id = ${userId}`;
    await tx`delete from categories where user_id = ${userId}`;

    // Insert roots first
    for (const c of roots) {
      const type = mapKind(c.kind);
      const archivedAt = c.available === false ? new Date() : null;
      const color = c.color ? `#${c.color}` : null;
      const [row] = await tx`
        insert into categories (user_id, name, type, parent_id, color, is_system, archived_at)
        values (${userId}, ${c.name}, ${type}, ${null}, ${color}, ${false}, ${archivedAt})
        returning id
      `;
      orgUuidToDbId.set(c.uuid, row.id);
    }

    // Insert children
    for (const c of children) {
      const type = mapKind(c.kind);
      const archivedAt = c.available === false ? new Date() : null;
      const color = c.color ? `#${c.color}` : null;
      const parentDbId = orgUuidToDbId.get(c.parent_uuid) ?? null;
      const [row] = await tx`
        insert into categories (user_id, name, type, parent_id, color, is_system, archived_at)
        values (${userId}, ${c.name}, ${type}, ${parentDbId}, ${color}, ${false}, ${archivedAt})
        returning id
      `;
      orgUuidToDbId.set(c.uuid, row.id);
    }

    console.log(`Inseridas: ${orgUuidToDbId.size} categorias`);
  });

  // Verify
  const [{ count: finalCount }] =
    await sql`select count(*)::int as count from categories where user_id = ${userId}`;
  const [{ count: rootsCount }] =
    await sql`select count(*)::int as count from categories where user_id = ${userId} and parent_id is null`;
  const [{ count: archivedCount }] =
    await sql`select count(*)::int as count from categories where user_id = ${userId} and archived_at is not null`;

  console.log(
    `\nResultado: ${finalCount} categorias (${rootsCount} raízes, ${archivedCount} arquivadas)`,
  );

  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end().catch(() => {});
  process.exit(1);
});
