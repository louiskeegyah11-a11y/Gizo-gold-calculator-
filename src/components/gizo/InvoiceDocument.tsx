import { formatMoney } from "@/lib/gold";
import type { Invoice } from "@/lib/invoices";
import { invoiceRows } from "@/lib/invoice-rows";

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const { result } = invoice;
  const date = new Date(invoice.createdAt);
  const rows = invoiceRows(invoice);

  return (
    <article className="mx-auto w-full max-w-2xl rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-soft print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-10">
      <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">
            G
          </span>
          <div>
            <p className="font-display text-lg font-extrabold leading-tight tracking-tight">
              GIZO GOLD
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Gold Purchase Invoice
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="whitespace-nowrap font-display text-sm font-bold">{invoice.number}</p>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            {" · "}
            {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </header>

      <section className="grid gap-1 py-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Seller</p>
        <p className="font-display text-base font-bold">{invoice.customerName || "—"}</p>
        {invoice.customerPhone && (
          <p className="text-sm text-muted-foreground">{invoice.customerPhone}</p>
        )}
        {invoice.customerAddress && (
          <p className="text-sm text-muted-foreground">{invoice.customerAddress}</p>
        )}
      </section>

      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-dashed border-border">
              <td className="py-2.5 italic text-muted-foreground">{k}</td>
              <td className="py-2.5 text-right font-semibold tabular">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex items-end justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground">
        <span className="text-sm">Amount paid to seller</span>
        <span className="font-display text-2xl font-extrabold tabular">
          GH₵ {formatMoney(result.amount)}
        </span>
      </div>

      {result.discountApplied > 0 && (
        <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">
          {result.discountApplied}% purity discount applied
        </p>
      )}

      {invoice.notes && (
        <section className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{invoice.notes}</p>
        </section>
      )}

      <footer className="mt-10 grid grid-cols-2 gap-8 text-xs text-muted-foreground">
        <div className="border-t border-foreground/40 pt-2">Seller signature</div>
        <div className="border-t border-foreground/40 pt-2 text-right">For GIZO GOLD</div>
      </footer>
    </article>
  );
}
