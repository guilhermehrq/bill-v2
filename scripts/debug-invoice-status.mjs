// Lists every invoice with status='open' whose closing_date is already in
// the past — these should be 'closed' but no cron is migrating them.
//
// Usage: node scripts/debug-invoice-status.mjs <email>

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
  console.error("Usage: node scripts/debug-invoice-status.mjs <email>");
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const sql = postgres(connectionString, { prepare: false });

const fmt = (cents) =>
  (Number(cents) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const [user] = await sql`select id from auth.users where email = ${email} limit 1`;
if (!user) {
  console.error(`User not found: ${email}`);
  await sql.end();
  process.exit(1);
}

const cards = await sql`
  select id, name, closing_day, due_day
  from credit_cards
  where user_id = ${user.id}
  order by name
`;

console.log("Cartões:");
for (const c of cards) {
  console.log(
    `  ${c.name.padEnd(28)}  closing_day=${String(c.closing_day).padStart(2)}  due_day=${String(c.due_day).padStart(2)}`,
  );
}
console.log();

const stale = await sql`
  select
    c.name as card_name,
    c.closing_day,
    to_char(i.reference_month, 'YYYY-MM') as ref_month,
    i.closing_date,
    i.due_date,
    i.status,
    (i.total_cents - i.paid_cents) as remaining
  from credit_card_invoices i
  join credit_cards c on c.id = i.credit_card_id
  where i.user_id = ${user.id}
    and i.status = 'open'
    and i.closing_date < current_date
  order by c.name, i.reference_month
`;

if (stale.length === 0) {
  console.log("✅ Nenhuma fatura 'open' com closing_date no passado.");
} else {
  console.log(
    "⚠️  Faturas com status='open' mas closing_date já passou (deveriam estar 'closed' ou 'overdue'):\n",
  );
  for (const r of stale) {
    console.log(
      `${r.card_name.padEnd(28)}  ref=${r.ref_month}  closing=${r.closing_date.toISOString().slice(0, 10)}  due=${r.due_date.toISOString().slice(0, 10)}  resta=${fmt(r.remaining)}`,
    );
  }
}

await sql.end();
