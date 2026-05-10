// Imports the Organizze XLS export end-to-end:
//   - Wipes prior accounts, credit_cards, credit_card_invoices, transactions, recurrences, budgets
//   - Creates accounts (one per non-card sheet, except 'Teste')
//   - Creates credit_cards (closing/due day derived from sheet data)
//   - Creates credit_card_invoices (one per (card, month) found in 'Fatura' column)
//   - Imports card transactions linked to invoiceId (skips synthetic 'Fatura Mês/Ano' close-rows)
//   - Imports account transactions:
//       'Transferências' -> type=transfer, paired conservatively
//       'Pagamento de fatura' -> categoryId=null, invoiceId=<invoice>
//       (account-side 'Fatura Mês/Ano' rows are de-duplicated against 'Pagamento de fatura' siblings)
//   - Detects installments via /(\d+)\/(\d+)$/ regex and links via installmentOfId
//
// Categorias.json import must run first; this script depends on the existing categories rows.
//
// Usage: node scripts/import-organizze-movements.mjs [--dry-run]

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { execSync } from "node:child_process";
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

const XLS_PATH = resolve(
  projectRoot,
  "importacao/movimentacoes_guilherme_20200101_20301231 (1).xls",
);
const sql = postgres(connectionString, { prepare: false });

// ─── Static config — derived from XLS analysis ──────────────────────────────────

// Sheets to import (skip 'Teste'). Sheet name -> account/card config.
const SHEETS = {
  "Reserva de emergência (Alícia)": { kind: "account", type: "savings", institution: "Nubank" },
  "Hospedagem Murphy": { kind: "account", type: "savings", institution: null },
  "NuConta - Alícia": { kind: "account", type: "checking", institution: "Nubank" },
  "Floriano 1680": { kind: "account", type: "savings", institution: null },
  "Reserva de emergência": { kind: "account", type: "savings", institution: null },
  "Bradesco Prime": { kind: "account", type: "checking", institution: "Bradesco" },
  "Nu PJ": { kind: "account", type: "checking", institution: "Nubank" },
  "Itaú Personnalité": { kind: "account", type: "checking", institution: "Itaú" },
  "NuConta - Guilherme": { kind: "account", type: "checking", institution: "Nubank" },
  Carteira: { kind: "account", type: "cash", institution: null },
  "Nubank Alícia": {
    kind: "card",
    brand: "Nubank",
    closingDay: 17,
    dueDay: 24,
    paidByAccount: "NuConta - Alícia",
  },
  "Itaú Black": {
    kind: "card",
    brand: "Itaú",
    closingDay: 9,
    dueDay: 16,
    paidByAccount: "Itaú Personnalité",
  },
  Ultravioleta: {
    kind: "card",
    brand: "Nubank",
    closingDay: 11,
    dueDay: 18,
    paidByAccount: "NuConta - Guilherme",
  },
  "Bradesco Black": {
    kind: "card",
    brand: "Bradesco",
    closingDay: 8,
    dueDay: 15,
    paidByAccount: "Bradesco Prime",
  },
};

const PT_MONTHS = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function parseDate(s) {
  // dd.mm.yyyy
  const m = String(s).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toCents(value) {
  return Math.round(Math.abs(Number(value)) * 100);
}

function parseFatura(s) {
  // "Janeiro/2025" -> { year: 2025, month: 1, refDate: '2025-01-01' }
  const m = String(s).match(/^([^/]+)\/(\d{4})$/);
  if (!m) return null;
  const month = PT_MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const year = parseInt(m[2], 10);
  return { year, month, refDate: `${year}-${String(month).padStart(2, "0")}-01` };
}

function parseInstallment(desc) {
  // " 3/12" at the end. Returns { base, n, total } or null.
  const m = String(desc).match(/^(.+?)\s+(\d+)\/(\d+)\s*$/);
  if (!m) return null;
  const n = parseInt(m[2], 10);
  const total = parseInt(m[3], 10);
  if (total <= 1 || n < 1 || n > total) return null;
  return { base: m[1].trim(), n, total };
}

function diffDays(a, b) {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

// ─── Read XLS via Python helper ─────────────────────────────────────────────────
// node has no stable xls reader; we delegate to xlrd via a compact python script.

function readXls() {
  const py = `
import xlrd, json, sys
wb = xlrd.open_workbook(sys.argv[1])
out = {}
for sn in wb.sheet_names():
    sh = wb.sheet_by_name(sn)
    rows = []
    for r in range(sh.nrows):
        rows.append([sh.cell_value(r, c) for c in range(sh.ncols)])
    out[sn] = rows
print(json.dumps(out, ensure_ascii=False))
`;
  const json = execSync(`python3 -c "${py.replace(/"/g, '\\"')}" "${XLS_PATH}"`, {
    maxBuffer: 256 * 1024 * 1024,
  }).toString("utf-8");
  return JSON.parse(json);
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function resolveUserId() {
  if (process.env.USER_ID) return process.env.USER_ID;
  const rows = await sql`select id from auth.users`;
  if (rows.length !== 1) throw new Error(`Expected 1 user, got ${rows.length}`);
  return rows[0].id;
}

async function loadCategoryLookup(userId) {
  // name -> id; if duplicate, prefer first (will warn).
  const rows = await sql`
    select id, name, parent_id, type from categories where user_id = ${userId}
  `;
  const byName = new Map();
  const dupes = new Set();
  for (const r of rows) {
    if (byName.has(r.name)) {
      dupes.add(r.name);
    } else {
      byName.set(r.name, r);
    }
  }
  return { byName, dupes };
}

function pickCategoryId(catLookup, name, type) {
  if (!name) return null;
  // Special-cased categories without an id in our schema:
  if (name === "Transferências" || name === "Pagamento de fatura") return null;
  const r = catLookup.byName.get(name);
  if (!r) return null;
  // type compatibility: if requested 'expense' and category is 'income' (or vice versa), null
  if (type && r.type !== type) return null;
  return r.id;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "EXECUTE"}`);
  const userId = await resolveUserId();
  console.log(`User: ${userId}`);

  const wb = readXls();
  console.log(`XLS sheets: ${Object.keys(wb).length}`);

  // ─── Wipe (transactions, recurrences, budgets, invoices, cards, accounts) ──
  if (!DRY_RUN) {
    console.log(`\nLimpando tabelas (mantendo categorias)…`);
    await sql.begin(async (tx) => {
      await tx`delete from transactions where user_id = ${userId}`;
      await tx`delete from recurrences where user_id = ${userId}`;
      await tx`delete from budgets where user_id = ${userId}`;
      await tx`delete from credit_card_invoices where user_id = ${userId}`;
      await tx`delete from credit_cards where user_id = ${userId}`;
      await tx`delete from accounts where user_id = ${userId}`;
    });
  }

  // ─── Create accounts ────────────────────────────────────────────────────────
  const accountIdByName = new Map();
  const cardIdByName = new Map();

  const accountsToCreate = Object.entries(SHEETS).filter(([, c]) => c.kind === "account");
  console.log(`\nCriando ${accountsToCreate.length} contas…`);

  if (!DRY_RUN) {
    for (const [name, cfg] of accountsToCreate) {
      const [row] = await sql`
        insert into accounts (user_id, name, type, institution, initial_balance_cents, currency, archived)
        values (${userId}, ${name}, ${cfg.type}, ${cfg.institution}, ${0}, ${"BRL"}, ${false})
        returning id
      `;
      accountIdByName.set(name, row.id);
    }
  }

  // ─── Create credit cards (defaultAccountId = paidByAccount) ────────────────
  const cardsToCreate = Object.entries(SHEETS).filter(([, c]) => c.kind === "card");
  console.log(`Criando ${cardsToCreate.length} cartões…`);
  if (!DRY_RUN) {
    for (const [name, cfg] of cardsToCreate) {
      const defaultAccountId = accountIdByName.get(cfg.paidByAccount) ?? null;
      const [row] = await sql`
        insert into credit_cards
          (user_id, name, brand, limit_cents, closing_day, due_day, default_account_id, archived)
        values
          (${userId}, ${name}, ${cfg.brand}, ${0}, ${cfg.closingDay}, ${cfg.dueDay},
           ${defaultAccountId}, ${false})
        returning id
      `;
      cardIdByName.set(name, row.id);
    }
  }

  // ─── Discover invoices: (card, ref_month) from "Fatura" column ──────────────
  // The synthetic "Fatura Mês/Ano" close-row in the card sheet has the exact
  // invoice net total (computed by Organizze). Use that as ground truth.
  // For invoices with no synthetic row (rare), fall back to summing real txns.
  const invoicesByCard = new Map(); // cardName -> Map(refDate -> { closingDate, dueDate, totalCents })
  for (const [name, cfg] of cardsToCreate) {
    const sheet = wb[name];
    if (!sheet) continue;
    const map = new Map();
    invoicesByCard.set(name, map);

    // First pass: register every (refDate) seen and record close-row total when found.
    for (let r = 1; r < sheet.length; r++) {
      const [, desc, , val, fatura] = sheet[r];
      if (val === 0) continue;
      const inv = parseFatura(fatura);
      if (!inv) continue;

      let entry = map.get(inv.refDate);
      if (!entry) {
        const close = new Date(Date.UTC(inv.year, inv.month - 1, cfg.closingDay));
        const due = new Date(Date.UTC(inv.year, inv.month - 1, cfg.dueDay));
        entry = {
          refDate: inv.refDate,
          closingDate: close.toISOString().slice(0, 10),
          dueDate: due.toISOString().slice(0, 10),
          totalCents: 0,
          netSum: 0,
          haveSynthetic: false,
        };
        map.set(inv.refDate, entry);
      }
      const isSynthetic = typeof desc === "string" && desc.startsWith("Fatura ");
      if (isSynthetic) {
        entry.totalCents = toCents(val);
        entry.haveSynthetic = true;
      } else {
        // sum signed values to get net invoice
        entry.netSum += Number(val);
      }
    }
    // Fallback for any invoice without a synthetic row
    for (const entry of map.values()) {
      if (!entry.haveSynthetic) entry.totalCents = toCents(entry.netSum);
    }
  }

  // Insert invoices
  const invoiceIdByCardAndRef = new Map(); // `${cardName}|${refDate}` -> id
  let totalInvoices = 0;
  if (!DRY_RUN) {
    for (const [cardName, map] of invoicesByCard) {
      const cardId = cardIdByName.get(cardName);
      for (const [refDate, inv] of map) {
        const [row] = await sql`
          insert into credit_card_invoices
            (user_id, credit_card_id, reference_month, closing_date, due_date, status, total_cents, paid_cents)
          values
            (${userId}, ${cardId}, ${refDate}, ${inv.closingDate}, ${inv.dueDate},
             ${"open"}, ${inv.totalCents}, ${0})
          returning id
        `;
        invoiceIdByCardAndRef.set(`${cardName}|${refDate}`, row.id);
        totalInvoices++;
      }
    }
  } else {
    for (const [, map] of invoicesByCard) totalInvoices += map.size;
  }
  console.log(`Faturas geradas: ${totalInvoices}`);

  // ─── Load category lookup ───────────────────────────────────────────────────
  const catLookup = await loadCategoryLookup(userId);
  if (catLookup.dupes.size > 0) {
    console.log(
      `Aviso: ${catLookup.dupes.size} categorias com nome duplicado — pegamos a 1ª:`,
      [...catLookup.dupes].slice(0, 5).join(", "),
      catLookup.dupes.size > 5 ? `… (+${catLookup.dupes.size - 5})` : "",
    );
  }

  // ─── Build flat row stream from each sheet, with sourceExternalId ──────────
  /** @type {Array<{sheet:string, rowIdx:number, data:string, desc:string, cat:string, val:number, status:string, tags:string, notes:string}>} */
  const allRows = [];
  for (const [sheetName, cfg] of Object.entries(SHEETS)) {
    const sheet = wb[sheetName];
    if (!sheet || sheet.length < 2) continue;
    for (let r = 1; r < sheet.length; r++) {
      const [data, desc, cat, val, statusOrFatura, tags, notes] = sheet[r];
      if (val === 0) continue;
      allRows.push({
        sheet: sheetName,
        rowIdx: r,
        data,
        desc: String(desc ?? ""),
        cat: String(cat ?? ""),
        val: Number(val),
        statusOrFatura: String(statusOrFatura ?? ""),
        tags: String(tags ?? ""),
        notes: String(notes ?? ""),
        kind: cfg.kind,
        sheetCfg: cfg,
      });
    }
  }
  console.log(`Total de linhas reais (todas as abas): ${allRows.length}`);

  // ─── Prepare transactions to insert ─────────────────────────────────────────
  // Layered approach:
  //   1. Card sheets: skip synthetic "Fatura X" rows
  //   2. Account sheets: dedupe "Pagamento de fatura" vs "Fatura X" same-amount-near-date
  //   3. Pair transferências
  //   4. Detect installments and resolve installmentOfId (after first inserts)

  // Phase 1 dedup (account-side invoice payments)
  // For each account row "Fatura Mês/Ano" (cat empty), if there's a same-account "Pagamento de fatura"
  // row within ±5 days with the SAME absolute amount, skip the "Fatura X" one.
  const skip = new Set(); // unique key sheet:rowIdx
  const isInvoicePaymentDescOnly = (row) =>
    row.kind === "account" && /^Fatura\s+/i.test(row.desc) && row.cat === "";
  const isInvoicePaymentCat = (row) => row.kind === "account" && row.cat === "Pagamento de fatura";

  const accountRowsByAccount = new Map();
  for (const r of allRows) {
    if (r.kind !== "account") continue;
    if (!accountRowsByAccount.has(r.sheet)) accountRowsByAccount.set(r.sheet, []);
    accountRowsByAccount.get(r.sheet).push(r);
  }
  let dedupedAccountInvoicePay = 0;
  for (const rows of accountRowsByAccount.values()) {
    const cats = rows.filter(isInvoicePaymentCat);
    for (const synthetic of rows.filter(isInvoicePaymentDescOnly)) {
      const sd = parseDate(synthetic.data);
      const match = cats.find(
        (c) =>
          Math.abs(c.val - synthetic.val) < 0.01 &&
          parseDate(c.data) &&
          diffDays(parseDate(c.data), sd) <= 7,
      );
      if (match) {
        skip.add(`${synthetic.sheet}:${synthetic.rowIdx}`);
        dedupedAccountInvoicePay++;
      }
    }
  }
  console.log(`Linhas "Fatura X" duplicadas (lado conta) puladas: ${dedupedAccountInvoicePay}`);

  // Skip synthetic close-rows on card side too (already handled in invoice totals)
  let cardSyntheticSkipped = 0;
  for (const r of allRows) {
    if (r.kind === "card" && /^Fatura\s+/i.test(r.desc) && r.cat === "") {
      skip.add(`${r.sheet}:${r.rowIdx}`);
      cardSyntheticSkipped++;
    }
  }
  console.log(`Linhas sintéticas "Fatura X" no cartão puladas: ${cardSyntheticSkipped}`);

  // ─── Pair transferências (account-side only, conservative) ─────────────────
  const transferRows = allRows.filter(
    (r) =>
      r.kind === "account" && r.cat === "Transferências" && !skip.has(`${r.sheet}:${r.rowIdx}`),
  );
  const out = transferRows.filter((r) => r.val < 0);
  const inc = transferRows.filter((r) => r.val > 0);
  /** @type {Map<string,string>} key: sheet:rowIdx -> matched key */
  const transferPairKey = new Map();
  const matched = new Set();
  for (const o of out) {
    const oKey = `${o.sheet}:${o.rowIdx}`;
    if (matched.has(oKey)) continue;
    const od = parseDate(o.data);
    const cands = inc.filter(
      (i) =>
        !matched.has(`${i.sheet}:${i.rowIdx}`) &&
        i.sheet !== o.sheet &&
        Math.abs(i.val + o.val) < 0.01 &&
        parseDate(i.data) &&
        diffDays(parseDate(i.data), od) <= 2,
    );
    if (cands.length === 0) continue;
    // pick closest by date
    cands.sort((a, b) => diffDays(parseDate(a.data), od) - diffDays(parseDate(b.data), od));
    const c = cands[0];
    const cKey = `${c.sheet}:${c.rowIdx}`;
    matched.add(oKey);
    matched.add(cKey);
    transferPairKey.set(oKey, cKey);
    transferPairKey.set(cKey, oKey);
  }
  const pairsCount = matched.size / 2;
  const unpairedTransfers = transferRows.filter((r) => !matched.has(`${r.sheet}:${r.rowIdx}`));
  console.log(
    `Transferências: ${pairsCount} pares (${pairsCount * 2} rows) + ${unpairedTransfers.length} sem par = ${transferRows.length} total`,
  );

  // ─── Pair invoice payments to invoices ─────────────────────────────────────
  // Strategy: for each "Pagamento de fatura" row in the paying account, find the
  // invoice on the corresponding card whose reference month closing-date is closest
  // to the payment date (±7 days) AND amount equals invoice total.
  // Same for the synthetic "Fatura Mês/Ano" rows that survived dedup.
  const paymentRowToInvoice = new Map(); // sheet:rowIdx -> invoiceId

  // Build reverse index: account -> cards paying it
  const cardsByPayer = new Map();
  for (const [cardName, cfg] of cardsToCreate) {
    const payer = cfg.paidByAccount;
    if (!cardsByPayer.has(payer)) cardsByPayer.set(payer, []);
    cardsByPayer.get(payer).push(cardName);
  }

  let invoicePaymentsLinked = 0;
  for (const r of allRows) {
    const key = `${r.sheet}:${r.rowIdx}`;
    if (skip.has(key)) continue;
    if (r.kind !== "account") continue;
    const isPay = r.cat === "Pagamento de fatura" || (/^Fatura\s+/i.test(r.desc) && r.cat === "");
    if (!isPay) continue;

    // Find invoice on cards paid by this account with matching amount near date
    const cards = cardsByPayer.get(r.sheet) ?? [];
    const payDate = parseDate(r.data);
    let best = null;
    for (const cardName of cards) {
      const map = invoicesByCard.get(cardName);
      if (!map) continue;
      for (const [refDate, inv] of map) {
        if (Math.abs(inv.totalCents - toCents(r.val)) > 1) continue; // exact match (1 cent slack)
        const d = diffDays(inv.closingDate, payDate);
        if (d > 15) continue;
        if (!best || d < best.d) best = { cardName, refDate, d };
      }
    }
    if (best) {
      const id = invoiceIdByCardAndRef.get(`${best.cardName}|${best.refDate}`);
      if (id) {
        paymentRowToInvoice.set(key, id);
        invoicePaymentsLinked++;
      }
    }
  }
  console.log(`Pagamentos de fatura ligados a invoices: ${invoicePaymentsLinked}`);

  // ─── Insert transactions (cards first, then accounts; finally installments) ─
  if (DRY_RUN) {
    console.log("\nDry run — não inserindo transações.");
    await sql.end();
    return;
  }

  // Map: source key -> inserted transaction id (used for installmentOfId + transferPairId)
  const txIdByKey = new Map();

  console.log(`\nInserindo transações de cartão…`);
  let cardTxCount = 0;
  for (const r of allRows) {
    const key = `${r.sheet}:${r.rowIdx}`;
    if (skip.has(key)) continue;
    if (r.kind !== "card") continue;
    const cardId = cardIdByName.get(r.sheet);
    const inv = parseFatura(r.statusOrFatura);
    const invoiceId = inv ? (invoiceIdByCardAndRef.get(`${r.sheet}|${inv.refDate}`) ?? null) : null;

    // Type: positive vals on a card sheet are typically reimbursements / refunds (income)
    const type = r.val < 0 ? "expense" : "income";
    const categoryId = pickCategoryId(catLookup, r.cat, type);
    const inst = parseInstallment(r.desc);

    const date = parseDate(r.data);
    const tagsArr = r.tags
      ? r.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const [row] = await sql`
      insert into transactions
        (user_id, description, amount_cents, type, date, purchase_date,
         account_id, credit_card_id, category_id, invoice_id,
         is_paid, paid_at,
         installment_number, installment_total,
         tags, notes, source_external_id)
      values
        (${userId}, ${r.desc}, ${toCents(r.val)}, ${type}, ${date}, ${date},
         ${null}, ${cardId}, ${categoryId}, ${invoiceId},
         ${true}, ${date},
         ${inst ? inst.n : null}, ${inst ? inst.total : null},
         ${tagsArr}, ${r.notes || null}, ${`xls:${r.sheet}:${r.rowIdx}`})
      returning id
    `;
    txIdByKey.set(key, row.id);
    cardTxCount++;
  }
  console.log(`  inseridas: ${cardTxCount}`);

  console.log(`Inserindo transações de conta…`);
  let acctTxCount = 0;
  for (const r of allRows) {
    const key = `${r.sheet}:${r.rowIdx}`;
    if (skip.has(key)) continue;
    if (r.kind !== "account") continue;
    const accountId = accountIdByName.get(r.sheet);
    const date = parseDate(r.data);
    const isPaid = r.statusOrFatura === "Pago";
    const tagsArr = r.tags
      ? r.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const isTransfer = r.cat === "Transferências";
    const isPaired = isTransfer && transferPairKey.has(key);
    const isInvoicePay = paymentRowToInvoice.has(key);

    let type;
    let transferDir = null;
    if (isPaired) {
      type = "transfer";
      transferDir = r.val > 0 ? "in" : "out";
    } else {
      type = r.val < 0 ? "expense" : "income";
    }

    let categoryId;
    if (isPaired) categoryId = null;
    else if (isInvoicePay) categoryId = null;
    else categoryId = pickCategoryId(catLookup, r.cat, type);

    // Mark invoice-payment rows so reports/dashboard can exclude them as
    // duplicates of the underlying card purchases.
    if (isInvoicePay && !tagsArr.includes("pagamento-fatura")) {
      tagsArr.push("pagamento-fatura");
    }

    const inst = parseInstallment(r.desc);
    // Bank-side invoice payments do NOT set invoice_id (otherwise the recalc
    // trigger double-counts them). We track the (paymentTx -> invoice) link
    // separately and update paid_cents below.
    const linkedInvoiceId = paymentRowToInvoice.get(key) ?? null;

    let notes = r.notes || null;
    if (isTransfer && !isPaired) {
      notes = (notes ? notes + " · " : "") + "Transferência Organizze sem par";
    }
    if (linkedInvoiceId) {
      notes = (notes ? notes + " · " : "") + `invoice:${linkedInvoiceId}`;
    }

    const [row] = await sql`
      insert into transactions
        (user_id, description, amount_cents, type, date, purchase_date,
         account_id, credit_card_id, category_id,
         transfer_direction,
         is_paid, paid_at,
         installment_number, installment_total,
         tags, notes, source_external_id)
      values
        (${userId}, ${r.desc}, ${toCents(r.val)}, ${type}, ${date}, ${date},
         ${accountId}, ${null}, ${categoryId},
         ${transferDir},
         ${isPaid}, ${isPaid ? date : null},
         ${inst ? inst.n : null}, ${inst ? inst.total : null},
         ${tagsArr}, ${notes}, ${`xls:${r.sheet}:${r.rowIdx}`})
      returning id
    `;
    txIdByKey.set(key, row.id);
    acctTxCount++;
  }
  console.log(`  inseridas: ${acctTxCount}`);

  // Track which bank-side transaction paid each invoice (used below for paid_cents).
  // Only count payments that actually happened (statusOrFatura === "Pago"); future
  // "Não pago" rows must NOT contribute to paid_cents (otherwise the invoice would
  // be marked paid before the cash actually left the account).
  const paymentByInvoice = new Map(); // invoiceId -> [{ txId, paidCents, paidAt }]
  for (const r of allRows) {
    const key = `${r.sheet}:${r.rowIdx}`;
    const invId = paymentRowToInvoice.get(key);
    if (!invId) continue;
    if (r.statusOrFatura !== "Pago") continue; // skip unpaid/future
    const txId = txIdByKey.get(key);
    if (!txId) continue;
    const list = paymentByInvoice.get(invId) ?? [];
    list.push({ txId, paidCents: toCents(r.val), paidAt: parseDate(r.data) });
    paymentByInvoice.set(invId, list);
  }

  // ─── Set transferPairId on paired transfers ─────────────────────────────────
  console.log(`Pareando transferências…`);
  let pairs = 0;
  const pairedKeys = [...transferPairKey.keys()];
  for (const k of pairedKeys) {
    const otherK = transferPairKey.get(k);
    if (!otherK) continue;
    const id = txIdByKey.get(k);
    const otherId = txIdByKey.get(otherK);
    if (!id || !otherId) continue;
    await sql`update transactions set transfer_pair_id = ${otherId} where id = ${id}`;
    pairs++;
  }
  console.log(`  pares atualizados: ${pairs} (cada perna conta 1)`);

  // ─── Resolve installmentOfId ───────────────────────────────────────────────
  // Group by (sheet, base description, installmentTotal) — typical for cards
  // and credit-card-like accounts. Pick parcel with lowest installmentNumber as parent.
  console.log(`Linkando parcelas…`);
  const installmentGroups = new Map();
  for (const r of allRows) {
    const key = `${r.sheet}:${r.rowIdx}`;
    if (skip.has(key)) continue;
    const inst = parseInstallment(r.desc);
    if (!inst) continue;
    const groupKey = `${r.sheet}|${inst.base}|${inst.total}`;
    if (!installmentGroups.has(groupKey)) installmentGroups.set(groupKey, []);
    installmentGroups.get(groupKey).push({ key, n: inst.n });
  }
  let installmentLinks = 0;
  for (const group of installmentGroups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.n - b.n);
    const parentTxId = txIdByKey.get(group[0].key);
    if (!parentTxId) continue;
    for (let i = 1; i < group.length; i++) {
      const childId = txIdByKey.get(group[i].key);
      if (!childId) continue;
      await sql`update transactions set installment_of_id = ${parentTxId} where id = ${childId}`;
      installmentLinks++;
    }
  }
  console.log(`  filhos linkados: ${installmentLinks}`);

  // ─── Mark fully paid invoices using payment-by-invoice map ──────────────────
  console.log(`Atualizando status das faturas…`);
  let invoicesPaid = 0;
  for (const [invId, payments] of paymentByInvoice) {
    const totalPaid = payments.reduce((a, p) => a + p.paidCents, 0);
    const [row] = await sql`
      select total_cents from credit_card_invoices where id = ${invId} and user_id = ${userId}
    `;
    if (!row) continue;
    const total = Number(row.total_cents);
    const status = totalPaid >= total && total > 0 ? "paid" : totalPaid > 0 ? "partial" : "open";
    await sql`
      update credit_card_invoices
      set paid_cents = ${totalPaid}, status = ${status}::invoice_status
      where id = ${invId} and user_id = ${userId}
    `;
    if (status === "paid") invoicesPaid++;
  }
  console.log(`  faturas marcadas como paid: ${invoicesPaid}`);

  // ─── Final summary ──────────────────────────────────────────────────────────
  const [{ tx }] = await sql`
    select count(*)::int as tx from transactions where user_id = ${userId}
  `;
  const [{ acc }] = await sql`select count(*)::int as acc from accounts where user_id = ${userId}`;
  const [{ cc }] =
    await sql`select count(*)::int as cc from credit_cards where user_id = ${userId}`;
  const [{ inv }] =
    await sql`select count(*)::int as inv from credit_card_invoices where user_id = ${userId}`;
  const [{ paid }] =
    await sql`select count(*)::int as paid from credit_card_invoices where user_id = ${userId} and status = 'paid'`;
  console.log(`\nResumo final:`);
  console.log(`  contas: ${acc}, cartões: ${cc}`);
  console.log(`  faturas: ${inv} (${paid} marcadas como pagas)`);
  console.log(`  transações: ${tx}`);

  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end().catch(() => {});
  process.exit(1);
});
