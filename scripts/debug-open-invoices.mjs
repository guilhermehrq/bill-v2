// Reproduces the dashboard "Fatura acumulada" KPI query and lists every
// invoice it sums, broken down by card + reference month, so we can compare
// against a manual sum.
//
// Usage: node scripts/debug-open-invoices.mjs <email>

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
config({ path: resolve(projectRoot, ".env.local") });
config({ path: resolve(projectRoot, ".env") });

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/debug-open-invoices.mjs <email>");
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL must be set");
const sql = postgres(connectionString, { prepare: false });

const fmt = (cents) =>
  (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const [user] = await sql`
  select id from auth.users where email = ${email} limit 1
`;
if (!user) {
  console.error(`User not found: ${email}`);
  const others = await sql`
    select email from auth.users
    where email is not null
    order by created_at desc
    limit 20
  `;
  if (others.length > 0) {
    console.error("\nEmails disponíveis:");
    for (const o of others) console.error(`  - ${o.email}`);
  }
  await sql.end();
  process.exit(1);
}

const [today] = await sql`select current_date as d`;
console.log(`Hoje: ${today.d}\n`);

// Mirror the dashboard query exactly: unpaid (paid_cents = 0) AND
// reference_month <= current cycle of that card.
const rows = await sql`
  select
    c.name as card_name,
    c.closing_day,
    c.due_day,
    to_char(i.reference_month, 'YYYY-MM') as ref_month,
    i.closing_date,
    i.due_date,
    i.status as stored_status,
    i.total_cents,
    i.paid_cents,
    (i.total_cents - i.paid_cents) as remaining_cents,
    case
      when extract(day from current_date)::smallint <= c.closing_day
        then date_trunc('month', current_date)::date
      else (date_trunc('month', current_date) + interval '1 month')::date
    end as card_current_cycle
  from credit_card_invoices i
  join credit_cards c on c.id = i.credit_card_id
  where i.user_id = ${user.id}
    and i.total_cents > i.paid_cents
    and i.paid_cents = 0
  order by c.name, i.reference_month
`;

const included = [];
const excluded = [];
for (const r of rows) {
  const refMonthDate = `${r.ref_month}-01`;
  if (refMonthDate <= r.card_current_cycle.toISOString().slice(0, 10)) {
    included.push(r);
  } else {
    excluded.push(r);
  }
}

console.log("=".repeat(90));
console.log("INCLUÍDAS (até o ciclo atual de cada cartão)");
console.log("=".repeat(90));
let includedTotal = 0n;
for (const r of included) {
  console.log(
    `${r.card_name.padEnd(28)}  ${r.ref_month}  stored=${r.stored_status.padEnd(8)}  total=${fmt(r.total_cents).padStart(13)}  pago=${fmt(r.paid_cents).padStart(13)}  resta=${fmt(r.remaining_cents).padStart(13)}`,
  );
  includedTotal += BigInt(r.remaining_cents);
}
console.log("-".repeat(90));
console.log(`  Total dashboard: ${fmt(includedTotal)}  (${included.length} faturas)\n`);

if (excluded.length > 0) {
  console.log("=".repeat(90));
  console.log("EXCLUÍDAS (futuras, depois do ciclo atual)");
  console.log("=".repeat(90));
  let excludedTotal = 0n;
  for (const r of excluded) {
    console.log(
      `${r.card_name.padEnd(28)}  ${r.ref_month}  stored=${r.stored_status.padEnd(8)}  resta=${fmt(r.remaining_cents).padStart(13)}  (ciclo atual: ${r.card_current_cycle.toISOString().slice(0, 7)})`,
    );
    excludedTotal += BigInt(r.remaining_cents);
  }
  console.log("-".repeat(90));
  console.log(`  Total excluído: ${fmt(excludedTotal)}\n`);
}

// Sanity check: recompute total from raw transactions per invoice. If this
// disagrees with the stored totalCents, fn_recalculate_invoice is stale.
const drift = await sql`
  select
    c.name as card_name,
    to_char(i.reference_month, 'YYYY-MM') as ref_month,
    i.total_cents as stored_total,
    coalesce(sum(
      case when t.type = 'expense' then t.amount_cents
           when t.type = 'income'  then -t.amount_cents
           else 0
      end
    ), 0) as computed_total
  from credit_card_invoices i
  join credit_cards c on c.id = i.credit_card_id
  left join transactions t on t.invoice_id = i.id
  where i.user_id = ${user.id}
    and i.status in ('open','closed','partial','overdue')
  group by c.name, i.reference_month, i.total_cents
  having i.total_cents <> coalesce(sum(
    case when t.type = 'expense' then t.amount_cents
         when t.type = 'income'  then -t.amount_cents
         else 0
    end
  ), 0)
  order by c.name, i.reference_month
`;

if (drift.length > 0) {
  console.log("=".repeat(90));
  console.log("⚠️  Faturas com total_cents divergente do somatório das transações");
  console.log("=".repeat(90));
  for (const d of drift) {
    console.log(
      `${d.card_name.padEnd(28)}  ${d.ref_month}  stored=${fmt(d.stored_total).padStart(13)}  computed=${fmt(d.computed_total).padStart(13)}  drift=${fmt(BigInt(d.stored_total) - BigInt(d.computed_total))}`,
    );
  }
  console.log();
}

await sql.end();
