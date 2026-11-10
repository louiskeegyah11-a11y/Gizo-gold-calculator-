import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, FileSpreadsheet, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deliverFile } from "@/lib/deliver-file";
import { formatMoney } from "@/lib/gold";
import { deleteInvoice, loadInvoices, type Invoice } from "@/lib/invoices";
import { buildCustomersWorkbook, type ExcelFile } from "@/lib/report-excel";

export const Route = createFileRoute("/invoices/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Saved invoices — GIZO GOLD CALCULATOR" },
      { name: "description", content: "All gold purchase invoices saved on this device." },
      { property: "og:title", content: "Saved invoices — GIZO GOLD CALCULATOR" },
      { property: "og:description", content: "All gold purchase invoices saved on this device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const [list, setList] = useState<Invoice[] | null>(null);
  const [customersFile, setCustomersFile] = useState<ExcelFile | null>(null);

  useEffect(() => {
    setList(loadInvoices());
  }, []);

  // Build the customers spreadsheet ahead of the tap so the phone's save sheet opens straight away.
  useEffect(() => {
    if (!list) return;
    let alive = true;
    setCustomersFile(null);
    buildCustomersWorkbook(list)
      .then((f) => alive && setCustomersFile(f))
      .catch((e) => {
        console.error(e);
        toast.error("Couldn't prepare the customers Excel file.");
      });
    return () => {
      alive = false;
    };
  }, [list]);

  async function exportCustomers() {
    if (!customersFile) {
      toast("Preparing the Excel file… try again in a moment.");
      return;
    }
    const outcome = await deliverFile(customersFile.file);
    if (outcome === "shared") toast.success("Excel file ready");
    else if (outcome === "downloaded") toast.success(`Saved ${customersFile.file.name}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-16 pt-5">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" /> Calculator
        </Link>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-sm font-semibold text-primary"
        >
          <BarChart3 className="h-4 w-4" /> Reports & Excel
        </Link>
      </div>
      <h1 className="mt-4 font-display text-2xl font-bold">Saved invoices</h1>
      <p className="text-sm italic text-muted-foreground">Stored on this device</p>

      <button
        onClick={exportCustomers}
        disabled={!!list && list.length === 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <FileSpreadsheet className="h-5 w-5" /> Export customer list to Excel
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Names, phone numbers, addresses, weights and amounts. On a phone, pick “Save to Files”,
        Drive or Excel; on a computer it downloads.
      </p>

      <div className="mt-5 grid gap-3">
        {list && list.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No invoices yet. Save one from the calculator.
          </div>
        )}
        {list?.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4"
          >
            <Link
              to="/invoices/$id"
              params={{ id: inv.id }}
              search={{ print: false, gallery: false }}
              className="min-w-0 flex-1"
            >
              <p className="font-display text-sm font-bold">{inv.number}</p>
              <p className="truncate text-sm text-muted-foreground">
                {inv.customerName || "Unnamed seller"} ·{" "}
                {new Date(inv.createdAt).toLocaleDateString("en-GB")}
              </p>
              <p className="mt-1 font-display text-lg font-extrabold text-primary tabular">
                GH₵ {formatMoney(inv.result.amount)}
              </p>
            </Link>
            <button
              aria-label={`Delete invoice ${inv.number}`}
              onClick={() => {
                if (!confirm(`Delete invoice ${inv.number}?`)) return;
                deleteInvoice(inv.id);
                setList(loadInvoices());
              }}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
