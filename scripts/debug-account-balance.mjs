// Diagnoses an account's balance by breaking down transactions by category
// and by description prefix to find double-counting.
//
// Usage: node scripts/debug-account-balance.mjs "NuConta - Alícia"

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
config({ path: resolve(projectRoot, ".env.local") });
config({ path: resolve(projectRoot, ".env") });

const accountName = process.argv[2];
if (!accountName) {
  console.error('Usage: node scripts/debug-account-balance.mjs "<account name>"');
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL must be set");
const sql = postgres(connectionString, { prepare: false });

const fmt = (cents) =>
  (Number(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const [acc] = await sql`
  select id, name from accounts where name = ${accountName} limit 1
`;
if (!acc) {
  console.error(`Account not found: ${accountName}`);
  await sql.end();
  process.exit(1);
}

console.log(`\nAccount: ${acc.name} (${acc.id})`);

// 1. Breakdown by category for paid transactions
console.log(`\n=== Paid transactions by category ===`);
const byCategory = await sql`
  select
    coalesce(c.name, '(no category)') as category,
    t.type,
    count(*)::int as cnt,
    sum(case
      when t.type = 'income'  then t.amount_cents
      when t.type = 'expense' then -t.amount_cents
      when t.type = 'transfer' and t.transfer_direction = 'in'  then t.amount_cents
      when t.type = 'transfer' and t.transfer_direction = 'out' then -t.amount_cents
      else 0
    end)::bigint as delta
  from transactions t
  left join categories c on c.id = t.category_id
  where t.account_id = ${acc.id} and t.is_paid = true
  group by 1, 2
  order by 4
`;
console.log("category                        type      cnt        delta");
console.log("-".repeat(70));
for (const r of byCategory) {
  console.log(
    `${r.category.padEnd(31)} ${r.type.padEnd(9)} ${String(r.cnt).padStart(4)} ${fmt(r.delta).padStart(20)}`,
  );
}

// 2. Look for "Fatura " prefix descriptions (synthetic invoice rows that may not have been deduped)
console.log(`\n=== "Fatura ..." rows (potential duplicate invoice payments) ===`);
const faturaRows = await sql`
  select date, description, type, amount_cents, is_paid, category_id
  from transactions
  where account_id = ${acc.id} and description ilike 'Fatura %'
  order by date
`;
let faturaTotalPaid = 0n;
for (const r of faturaRows) {
  const paid = r.is_paid ? "Pago" : "NPag";
  const cat = r.category_id ? "cat" : "---";
  console.log(
    `  ${r.date}  ${paid}  ${cat}  ${r.type.padEnd(8)} ${fmt(r.amount_cents).padStart(15)}  ${r.description}`,
  );
  if (r.is_paid && r.type === "expense") faturaTotalPaid += BigInt(-r.amount_cents);
}
console.log(`  Total expense impact (paid only): ${fmt(faturaTotalPaid)}`);

// 3. "Pagamento de fatura" rows
console.log(`\n=== "Pagamento de fatura" category rows ===`);
const pagRows = await sql`
  select t.date, t.description, t.type, t.amount_cents, t.is_paid
  from transactions t
  left join categories c on c.id = t.category_id
  where t.account_id = ${acc.id}
    and (c.name = 'Pagamento de fatura' or t.description ilike 'Pagamento%fatura%')
  order by t.date
`;
let pagTotalPaid = 0n;
for (const r of pagRows) {
  const paid = r.is_paid ? "Pago" : "NPag";
  console.log(
    `  ${r.date}  ${paid}  ${r.type.padEnd(8)} ${fmt(r.amount_cents).padStart(15)}  ${r.description}`,
  );
  if (r.is_paid && r.type === "expense") pagTotalPaid += BigInt(-r.amount_cents);
}
console.log(`  Total expense impact (paid only): ${fmt(pagTotalPaid)}`);

// 4. Top 20 largest paid expenses
console.log(`\n=== Top 20 largest paid expenses ===`);
const topExpenses = await sql`
  select date, description, amount_cents
  from transactions
  where account_id = ${acc.id} and is_paid = true and type = 'expense'
  order by amount_cents desc
  limit 20
`;
for (const r of topExpenses) {
  console.log(`  ${r.date}  ${fmt(r.amount_cents).padStart(15)}  ${r.description}`);
}

// 5. Unpaired "Transferências" that became expense/income
console.log(`\n=== Transferências paid but type != transfer (unpaired) ===`);
const unpairedTransfers = await sql`
  select t.date, t.description, t.type, t.amount_cents
  from transactions t
  left join categories c on c.id = t.category_id
  where t.account_id = ${acc.id}
    and t.is_paid = true
    and t.type != 'transfer'
    and (c.name = 'Transferências' or t.notes ilike '%Transferência Organizze sem par%')
  order by t.date
`;
let unpairedNet = 0n;
for (const r of unpairedTransfers) {
  console.log(
    `  ${r.date}  ${r.type.padEnd(8)} ${fmt(r.amount_cents).padStart(15)}  ${r.description}`,
  );
  unpairedNet += BigInt(r.type === "income" ? r.amount_cents : -r.amount_cents);
}
console.log(`  Net impact: ${fmt(unpairedNet)}`);

await sql.end();
