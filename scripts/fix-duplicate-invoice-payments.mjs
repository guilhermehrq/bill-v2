// Removes duplicate invoice-payment rows imported from Organizze:
// when a synthetic "Fatura Mês/Ano" row (cat null) AND a "Pagamento de fatura"
// (category "Pagamento de fatura") both exist on the same account in the same
// calendar month, the synthetic "Fatura ..." row is a duplicate of the user's
// actual payment record and must be removed.
//
// The import script's dedup matched by exact amount (±R$0,01); when a fatura
// was paid with interest/fees the amounts diverge and both rows survive,
// double-counting the debit on the bank account balance.
//
// Usage:
//   node scripts/fix-duplicate-invoice-payments.mjs            # dry run
//   node scripts/fix-duplicate-invoice-payments.mjs --execute  # apply

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
config({ path: resolve(projectRoot, ".env.local") });
config({ path: resolve(projectRoot, ".env") });

const EXECUTE = process.argv.includes("--execute");

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL must be set");
const sql = postgres(connectionString, { prepare: false });

const fmt = (cents) =>
  (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

console.log(`Mode: ${EXECUTE ? "EXECUTE (will delete)" : "DRY RUN"}`);

// Find candidate duplicates: paid "Fatura Mês/Ano" rows that have a sibling
// paid "Pagamento de fatura" on the same account in the same calendar month.
// We additionally require both to be paid (is_paid = true) — only paid rows
// affect the account balance, so unpaid future "Fatura ..." rows are not
// duplicates of anything and must stay.
// In the import, both "Fatura X" and "Pagamento de fatura" rows are inserted
// with category_id = NULL — we identify them by description.
const candidates = await sql`
  with fatura_rows as (
    select t.id, t.user_id, t.account_id, t.date, t.amount_cents, t.description,
           a.name as account_name,
           date_trunc('month', t.date)::date as month_start
    from transactions t
    join accounts a on a.id = t.account_id
    where t.account_id is not null
      and t.is_paid = true
      and t.description ilike 'Fatura %'
      and t.description not ilike 'Pagamento%'
      and t.category_id is null
  ),
  pagamento_rows as (
    select t.account_id, date_trunc('month', t.date)::date as month_start,
           sum(t.amount_cents)::bigint as total_cents,
           count(*)::int as cnt
    from transactions t
    where t.account_id is not null
      and t.is_paid = true
      and t.description ilike 'Pagamento%fatura%'
    group by t.account_id, date_trunc('month', t.date)::date
  )
  select f.id, f.user_id, f.account_id, f.account_name, f.date,
         f.amount_cents as fatura_cents,
         f.description,
         p.total_cents as pagamento_cents,
         p.cnt as pagamento_count
  from fatura_rows f
  join pagamento_rows p
    on p.account_id = f.account_id
   and p.month_start = f.month_start
  order by f.account_name, f.date
`;

if (candidates.length === 0) {
  console.log("Nenhum duplicado encontrado.");
  await sql.end();
  process.exit(0);
}

console.log(`\nDuplicatas encontradas: ${candidates.length}`);
console.log("");
console.log(
  `${"account".padEnd(28)} ${"date".padEnd(11)} ${"fatura".padStart(13)} ${"pagamento".padStart(13)} ${"description".padEnd(30)}`,
);
console.log("-".repeat(100));
let totalToDelete = 0n;
for (const r of candidates) {
  console.log(
    `${r.account_name.padEnd(28)} ${r.date.toString().slice(0, 10).padEnd(11)} ${fmt(r.fatura_cents).padStart(13)} ${fmt(r.pagamento_cents).padStart(13)} ${r.description.padEnd(30)}`,
  );
  totalToDelete += BigInt(r.fatura_cents);
}
console.log("");
console.log(`Total expense a remover: ${fmt(totalToDelete)}`);

if (!EXECUTE) {
  console.log(`\nDRY RUN — passe --execute pra aplicar.`);
  await sql.end();
  process.exit(0);
}

const ids = candidates.map((c) => c.id);
const deleted = await sql`
  delete from transactions
  where id = any(${ids}::uuid[])
  returning id
`;
console.log(`\n${deleted.length} linhas deletadas.`);

await sql.end();
