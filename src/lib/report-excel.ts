import writeExcelFile from "write-excel-file/universal";
import type { Cell, Sheet, SheetData } from "write-excel-file/universal";
import { format } from "date-fns";

import type { Invoice } from "./invoices";
import {
  CUSTOMER_HEADERS,
  customerReportInvoices,
  customerReportName,
  customerReportRow,
} from "./customer-report";
import {
  allPeriods,
  breakdown,
  invoicesInRange,
  summarize,
  type BreakdownRow,
  type PeriodRange,
  type ReportSummary,
} from "./reports";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const BRONZE = "#7e4401";
const CREAM = "#fdfaf3";
const PANEL = "#f3e7cf";

const MONEY = "#,##0.00";
const NUM2 = "0.00";
const PCT2 = '0.00"%"';

// Totals are written as values (not formulas) so phone viewers that don't recalculate still show them.
const head = (value: string): Cell => ({
  value,
  fontWeight: "bold",
  textColor: CREAM,
  backgroundColor: BRONZE,
  wrap: true,
  alignVertical: "center",
});
const num = (value: number | null | undefined, fmt = NUM2): Cell =>
  value === null || value === undefined ? null : { value, type: Number, format: fmt };
const bold = (c: Cell): Cell =>
  c && typeof c === "object" ? { ...c, fontWeight: "bold", backgroundColor: PANEL } : c;

const INVOICE_HEADERS = [
  "Invoice No.",
  "Date",
  "Time",
  "Seller",
  "Phone",
  "Gold type",
  "Top weight (g)",
  "Down / water (g)",
  "Pounds",
  "Density",
  "Karat used",
  "Purity (%)",
  "Price (GH₵)",
  "Price per pound (GH₵)",
  "Amount paid (GH₵)",
  "Notes",
];

/** One spreadsheet row per invoice, with the exact figures printed on that invoice. */
export function invoiceRowCells(inv: Invoice): Cell[] {
  const d = new Date(inv.createdAt);
  const ball = inv.input.goldType === "ball";
  return [
    { value: inv.number },
    { value: format(d, "dd/MM/yyyy") },
    { value: format(d, "HH:mm") },
    { value: inv.customerName || "" },
    { value: inv.customerPhone || "", type: String, format: "@" },
    { value: ball ? "Ball" : "Refined" },
    num(inv.input.topWeight),
    ball ? null : num(inv.input.downWeight),
    num(inv.result.pounds),
    ball ? null : num(inv.result.density),
    ball ? null : num(inv.result.karat),
    ball ? null : num(inv.result.purity, PCT2),
    num(inv.input.price, MONEY),
    ball ? null : num(inv.result.pricePerPound, MONEY),
    num(inv.result.amount, MONEY),
    { value: inv.notes || "", wrap: true },
  ];
}

function invoicesSheet(list: Invoice[]): SheetData {
  const s = summarize(list);
  const rows: SheetData = [INVOICE_HEADERS.map(head), ...list.map(invoiceRowCells)];
  if (list.length) {
    rows.push(
      [
        { value: `TOTAL (${s.count})` },
        null,
        null,
        null,
        null,
        null,
        num(s.totalWeight),
        null,
        num(s.totalPounds),
        null,
        null,
        null,
        null,
        null,
        num(s.totalAmount, MONEY),
        null,
      ].map(bold),
    );
  }
  return rows;
}

const PERIOD_HEADERS = [
  "Period",
  "Invoices",
  "Refined",
  "Ball",
  "Top weight (g)",
  "Pounds",
  "Avg karat (refined)",
  "Amount paid (GH₵)",
];

function periodRow(label: string, s: ReportSummary): Cell[] {
  return [
    { value: label },
    num(s.count, "0"),
    num(s.refinedCount, "0"),
    num(s.ballCount, "0"),
    num(s.totalWeight),
    num(s.totalPounds),
    s.refinedCount ? num(s.averageKarat) : null,
    num(s.totalAmount, MONEY),
  ];
}

function periodSheet(rows: BreakdownRow[]): SheetData {
  return [PERIOD_HEADERS.map(head), ...rows.map((r) => periodRow(r.label, r.summary))];
}

function summarySheet(
  title: string,
  periodText: string,
  s: ReportSummary,
  generated: Date,
): SheetData {
  const line = (label: string, cell: Cell): Cell[] => [{ value: label, fontWeight: "bold" }, cell];
  return [
    [{ value: "GIZO GOLD", fontWeight: "bold", fontSize: 16, textColor: BRONZE }],
    [{ value: title, fontWeight: "bold", fontSize: 13 }],
    line("Period", { value: periodText }),
    line("Generated", { value: format(generated, "dd/MM/yyyy HH:mm") }),
    [],
    [head("Figure"), head("Value")],
    line("Invoices", num(s.count, "0")),
    line("Refined invoices", num(s.refinedCount, "0")),
    line("Ball invoices", num(s.ballCount, "0")),
    line("Total top weight (g)", num(s.totalWeight)),
    line("Total pounds", num(s.totalPounds)),
    line("Average karat (refined)", s.refinedCount ? num(s.averageKarat) : { value: "—" }),
    line("Total paid to sellers (GH₵)", bold(num(s.totalAmount, MONEY))),
  ];
}

/** One spreadsheet row per customer sale, with the exact figures on that invoice. */
export function customerRowCells(inv: Invoice): Cell[] {
  return customerReportRow(inv).map((value, index) =>
    typeof value === "number" || value === null
      ? num(value, index === 7 ? MONEY : NUM2)
      : { value, type: String, ...(index === 1 ? { format: "@" } : {}), wrap: true },
  );
}

const CUSTOMER_COLUMNS = [24, 16, 28, 10, 14, 15, 10, 18].map((width) => ({ width }));

/** Workbook listing every customer sale: name, number, address, weights and amount. */
export async function buildCustomersWorkbook(
  all: Invoice[],
  now = new Date(),
  range?: PeriodRange,
): Promise<ExcelFile> {
  const list = customerReportInvoices(all, range);
  const s = summarize(list);
  const rows: SheetData = [
    ...(range
      ? [
          [
            {
              value: `${range.kind === "week" ? "Weekly" : range.kind === "month" ? "Monthly" : "Quarterly"} customer report — ${range.label}`,
              fontWeight: "bold" as const,
              wrap: true,
            },
          ],
        ]
      : []),
    CUSTOMER_HEADERS.map(head),
    ...list.map(customerRowCells),
  ];
  if (list.length) {
    rows.push(
      [
        { value: `TOTAL (${s.count})` },
        null,
        null,
        null,
        num(s.totalWeight),
        null,
        num(s.totalPounds),
        num(s.totalAmount, MONEY),
      ].map(bold),
    );
  }
  const file = await toFile(
    [{ data: rows, sheet: "Customers", columns: CUSTOMER_COLUMNS, stickyRowsCount: range ? 2 : 1 }],
    `${customerReportName(range, now)}.xlsx`,
  );
  return { file, count: list.length };
}

const INVOICE_COLUMNS = [16, 12, 7, 22, 15, 10, 13, 13, 10, 10, 10, 11, 13, 16, 17, 30].map(
  (width) => ({ width }),
);
const PERIOD_COLUMNS = [28, 10, 10, 8, 15, 12, 14, 18].map((width) => ({ width }));
const SUMMARY_COLUMNS = [{ width: 30 }, { width: 26 }];

const BREAKDOWN_NAME = { week: "By day", month: "By week", quarter: "By month" } as const;
const KIND_NAME = { week: "Weekly", month: "Monthly", quarter: "Quarterly" } as const;

export interface ExcelFile {
  file: File;
  count: number;
}

const safeName = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function toFile(sheets: Sheet<Blob>[], name: string): Promise<File> {
  const blob = await writeExcelFile(sheets, { fontFamily: "Arial", fontSize: 11 }).toBlob();
  return new File([blob], name, { type: XLSX_TYPE });
}

/** Workbook for one weekly / monthly / quarterly report. */
export async function buildPeriodWorkbook(
  all: Invoice[],
  range: PeriodRange,
  now = new Date(),
): Promise<ExcelFile> {
  const list = invoicesInRange(all, range);
  const title = `${KIND_NAME[range.kind]} report`;
  const file = await toFile(
    [
      {
        data: summarySheet(title, range.label, summarize(list), now),
        sheet: "Summary",
        columns: SUMMARY_COLUMNS,
      },
      {
        data: invoicesSheet(list),
        sheet: "Invoices",
        columns: INVOICE_COLUMNS,
        stickyRowsCount: 1,
      },
      {
        data: periodSheet(breakdown(range, list)),
        sheet: BREAKDOWN_NAME[range.kind],
        columns: PERIOD_COLUMNS,
        stickyRowsCount: 1,
      },
    ],
    `GIZO-Gold-${KIND_NAME[range.kind]}-${safeName(range.label)}.xlsx`,
  );
  return { file, count: list.length };
}

/** Workbook with every saved invoice plus weekly, monthly and quarterly totals. */
export async function buildFullWorkbook(all: Invoice[], now = new Date()): Promise<ExcelFile> {
  const list = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const first = list[0] ? format(new Date(list[0].createdAt), "dd/MM/yyyy") : "—";
  const last = list.at(-1) ? format(new Date(list.at(-1)!.createdAt), "dd/MM/yyyy") : "—";
  const file = await toFile(
    [
      {
        data: summarySheet("All invoices", `${first} – ${last}`, summarize(list), now),
        sheet: "Summary",
        columns: SUMMARY_COLUMNS,
      },
      {
        data: invoicesSheet(list),
        sheet: "All invoices",
        columns: INVOICE_COLUMNS,
        stickyRowsCount: 1,
      },
      {
        data: periodSheet(allPeriods("week", list)),
        sheet: "Weekly",
        columns: PERIOD_COLUMNS,
        stickyRowsCount: 1,
      },
      {
        data: periodSheet(allPeriods("month", list)),
        sheet: "Monthly",
        columns: PERIOD_COLUMNS,
        stickyRowsCount: 1,
      },
      {
        data: periodSheet(allPeriods("quarter", list)),
        sheet: "Quarterly",
        columns: PERIOD_COLUMNS,
        stickyRowsCount: 1,
      },
    ],
    `GIZO-Gold-All-Invoices-${format(now, "yyyy-MM-dd")}.xlsx`,
  );
  return { file, count: list.length };
}
