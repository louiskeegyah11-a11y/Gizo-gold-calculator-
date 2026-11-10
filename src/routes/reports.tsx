import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, FileSpreadsheet, Sheet } from "lucide-react";
import { toast } from "sonner";

import { deliverFile } from "@/lib/deliver-file";
import { formatMoney, formatNum } from "@/lib/gold";
import { loadInvoices, type Invoice } from "@/lib/invoices";
import { buildFullWorkbook, buildPeriodWorkbook, type ExcelFile } from "@/lib/report-excel";
import {
  breakdown,
  invoicesInRange,
  periodRange,
  shiftPeriod,
  summarize,
  type PeriodKind,
} from "@/lib/reports";
import { cn } from "@/lib/utils";
import { CustomerReportExport } from "@/components/gizo/CustomerReportExport";

export const Route = createFileRoute("/reports")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Reports — GIZO GOLD CALCULATOR" },
      {
        name: "description",
        content: "Weekly, monthly and quarterly customer reports with Excel and picture exports.",
      },
      { property: "og:title", content: "Reports — GIZO GOLD CALCULATOR" },
      {
        property: "og:description",
        content: "Weekly, monthly and quarterly customer reports with Excel and picture exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const KINDS: { id: PeriodKind; label: string; current: string }[] = [
  { id: "week", label: "Weekly", current: "This week" },
  { id: "month", label: "Monthly", current: "This month" },
  { id: "quarter", label: "Quarterly", current: "This quarter" },
];

function ReportsPage() {
  const [all, setAll] = useState<Invoice[] | null>(null);
  const [kind, setKind] = useState<PeriodKind>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [periodFile, setPeriodFile] = useState<ExcelFile | null>(null);
  const [fullFile, setFullFile] = useState<ExcelFile | null>(null);

  useEffect(() => {
    setAll(loadInvoices());
  }, []);

  const range = useMemo(() => periodRange(kind, anchor), [kind, anchor]);
  const list = useMemo(() => (all ? invoicesInRange(all, range) : []), [all, range]);
  const summary = useMemo(() => summarize(list), [list]);
  const rows = useMemo(() => breakdown(range, list), [range, list]);
  const isCurrent = periodRange(kind, new Date()).start.getTime() === range.start.getTime();

  // Excel files are built ahead of the tap so the phone's save/share sheet can open straight away.
  useEffect(() => {
    if (!all) return;
    let alive = true;
    setPeriodFile(null);
    buildPeriodWorkbook(all, range)
      .then((f) => alive && setPeriodFile(f))
      .catch((e) => {
        console.error(e);
        toast.error("Couldn't prepare the Excel report.");
      });
    return () => {
      alive = false;
    };
  }, [all, range]);

  useEffect(() => {
    if (!all) return;
    let alive = true;
    buildFullWorkbook(all)
      .then((f) => alive && setFullFile(f))
      .catch((e) => {
        console.error(e);
        toast.error("Couldn't prepare the Excel file.");
      });
    return () => {
      alive = false;
    };
  }, [all]);

  async function exportFile(f: ExcelFile | null) {
    if (!f) {
      toast("Preparing the Excel file… try again in a moment.");
      return;
    }
    const outcome = await deliverFile(f.file);
    if (outcome === "shared") toast.success("Excel file ready");
    else if (outcome === "downloaded") toast.success(`Saved ${f.file.name}`);
  }

  const kindInfo = KINDS.find((k) => k.id === kind) ?? KINDS[0];
  const breakdownTitle = kind === "week" ? "By day" : kind === "month" ? "By week" : "By month";

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-16 pt-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" /> Calculator
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold">Reports</h1>
      <p className="text-sm italic text-muted-foreground">From invoices saved on this device</p>

      <div
        role="radiogroup"
        aria-label="Report period"
        className="mt-4 grid grid-cols-3 overflow-hidden rounded-full border-2 border-primary"
      >
        {KINDS.map((k) => (
          <button
            key={k.id}
            role="radio"
            aria-checked={kind === k.id}
            onClick={() => {
              setKind(k.id);
              setAnchor(new Date());
            }}
            className={cn(
              "py-3 font-display text-sm font-semibold transition-colors",
              kind === k.id ? "bg-primary text-primary-foreground" : "bg-card text-primary",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-full border border-border bg-card p-1.5">
        <button
          aria-label="Previous period"
          onClick={() => setAnchor((a) => shiftPeriod(kind, a, -1))}
          className="rounded-full p-2.5 text-primary transition-colors hover:bg-accent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate font-display text-base font-bold tabular">{range.label}</p>
          {isCurrent ? (
            <p className="text-xs italic text-muted-foreground">{kindInfo?.current}</p>
          ) : (
            <button
              onClick={() => setAnchor(new Date())}
              className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              Back to {kindInfo?.current.toLowerCase()}
            </button>
          )}
        </div>
        <button
          aria-label="Next period"
          onClick={() => setAnchor((a) => shiftPeriod(kind, a, 1))}
          className="rounded-full p-2.5 text-primary transition-colors hover:bg-accent"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Totals */}
      <section className="mt-5 rounded-[2rem] bg-primary p-4 text-primary-foreground shadow-soft">
        <div className="mb-3 grid grid-cols-2 gap-3">
          <Stat label="Invoices" value={String(summary.count)} />
          <Stat label="Pounds" value={formatNum(summary.totalPounds)} />
          <Stat label="Top weight" value={`${formatNum(summary.totalWeight)} g`} />
          <Stat
            label="Avg karat (refined)"
            value={summary.refinedCount ? formatNum(summary.averageKarat) : "—"}
          />
          <div className="col-span-2">
            <Stat label="Refined · Ball" value={`${summary.refinedCount} · ${summary.ballCount}`} />
          </div>
        </div>
        <div className="rounded-[1.75rem] bg-card px-5 py-5 text-card-foreground">
          <p className="text-sm text-muted-foreground">Total paid to sellers</p>
          <p className="mt-1 break-words font-display text-4xl font-extrabold tracking-tight text-primary tabular">
            GH₵ {formatMoney(summary.totalAmount)}
          </p>
        </div>
      </section>

      {/* Export */}
      <section className="mt-5 grid gap-3">
        <button
          onClick={() => exportFile(periodFile)}
          className="flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
        >
          <FileSpreadsheet className="h-5 w-5" /> Export this report to Excel
        </button>
        <button
          onClick={() => exportFile(fullFile)}
          disabled={!!all && all.length === 0}
          className="flex items-center justify-center gap-2 rounded-full border-2 border-primary py-3 font-semibold text-primary transition-colors hover:bg-accent disabled:opacity-40"
        >
          <Sheet className="h-5 w-5" /> Export all invoices to Excel
        </button>
        <p className="text-center text-xs text-muted-foreground">
          On a phone, pick “Save to Files”, Drive or Excel. On a computer it downloads.
        </p>
      </section>

      {all && <CustomerReportExport all={all} range={range} />}

      {/* Breakdown */}
      <section className="mt-6 rounded-[2rem] border-2 border-gold-border bg-gold-panel p-4">
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <span className="h-3 w-3 rounded-full bg-gold" />
          <span className="font-display text-lg font-extrabold">{breakdownTitle}</span>
        </div>
        <div className="grid gap-2">
          {rows.map((r) => (
            <div
              key={r.start.getTime()}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3",
                r.summary.count === 0 && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.label}</p>
                <p className="text-xs text-muted-foreground">
                  {r.summary.count} invoice{r.summary.count === 1 ? "" : "s"} ·{" "}
                  {formatNum(r.summary.totalPounds)} lb
                </p>
              </div>
              <p className="shrink-0 font-display text-base font-extrabold text-primary tabular">
                GH₵ {formatMoney(r.summary.totalAmount)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Invoices in period */}
      <section className="mt-6">
        <h2 className="font-display text-lg font-bold">Invoices in this period</h2>
        <div className="mt-3 grid gap-2">
          {all && list.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No invoices in this period.
            </div>
          )}
          {list.map((inv) => (
            <Link
              key={inv.id}
              to="/invoices/$id"
              params={{ id: inv.id }}
              search={{ print: false, gallery: false }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-display text-sm font-bold">{inv.number}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {inv.customerName || "Unnamed seller"} ·{" "}
                  {inv.input.goldType === "ball" ? "Ball" : "Refined"} ·{" "}
                  {new Date(inv.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
              <p className="shrink-0 font-display text-base font-extrabold text-primary tabular">
                GH₵ {formatMoney(inv.result.amount)}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-primary-soft px-4 py-3.5">
      <p className="text-sm text-primary-foreground/80">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular">{value}</p>
    </div>
  );
}
