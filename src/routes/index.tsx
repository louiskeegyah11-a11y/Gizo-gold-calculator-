import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, FileText, ImageDown, MessageCircle, Printer, Save } from "lucide-react";
import { toast } from "sonner";

import {
  calculateGold,
  checkDownWeight,
  DEFAULT_DISCOUNT_PERCENT,
  formatMoney,
  formatNum,
  MAX_KARAT,
  type GoldType,
} from "@/lib/gold";
import { saveInvoice } from "@/lib/invoices";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "GIZO GOLD CALCULATOR — Weigh, price & invoice gold" },
      {
        name: "description",
        content:
          "Calculate gold pounds, density, karat, purity and seller payout in GH₵, then save and print an invoice.",
      },
      { property: "og:title", content: "GIZO GOLD CALCULATOR" },
      {
        property: "og:description",
        content: "Gold density, karat and payout calculator with printable invoices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Calculator,
});

// Fixed public text only — never include customer or invoice details here.
const WHATSAPP_SHARE_URL = `https://wa.me/?text=${encodeURIComponent(
  "Try GIZO GOLD CALCULATOR — free gold pounds, density, karat, purity and GH₵ payout, with invoices and reports: https://gizogold.app/?utm_source=whatsapp&utm_medium=social&utm_campaign=app_share",
)}`;

const toNum = (s: string) => {
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function Calculator() {
  const navigate = useNavigate();
  const [goldType, setGoldType] = useState<GoldType>("refined");
  const [entries, setEntries] = useState<Record<GoldType, { top: string; down: string; price: string }>>({
    refined: { top: "", down: "", price: "" },
    ball: { top: "", down: "", price: "" },
  });
  const { top, down, price } = entries[goldType];
  const setEntry = (field: "top" | "down" | "price", value: string) => {
    setEntries((previous) => ({
      ...previous,
      [goldType]: { ...previous[goldType], [field]: value },
    }));
  };
  const setTop = (value: string) => setEntry("top", value);
  const setDown = (value: string) => setEntry("down", value);
  const setPrice = (value: string) => setEntry("price", value);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");

  const input = useMemo(
    () => ({
      topWeight: toNum(top),
      downWeight: toNum(down),
      price: toNum(price),
      goldType,
      discountPercent: DEFAULT_DISCOUNT_PERCENT,
    }),
    [top, down, price, goldType],
  );
  const result = useMemo(() => calculateGold(input), [input]);
  const downError =
    goldType === "refined" ? checkDownWeight(input.topWeight, input.downWeight) : null;
  const ready = result.amount > 0 && !downError;

  function handleSave(next: "stay" | "print" | "gallery") {
    if (downError) {
      toast.error(downError);
      return;
    }
    if (!ready) {
      toast.error(goldType === "ball" ? "Enter weight and price first." : "Enter top weight, down (water) and price first.");
      return;
    }
    const inv = saveInvoice({ customerName, customerPhone, customerAddress, notes, input, result });
    toast.success(`Invoice ${inv.number} saved`);
    if (next !== "stay") {
      navigate({
        to: "/invoices/$id",
        params: { id: inv.id },
        search: { print: next === "print", gallery: next === "gallery" },
      });
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-16 pt-5">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary font-display text-base font-extrabold text-primary-foreground shadow-soft">
            G
          </span>
          <h1 className="font-display text-[15px] font-extrabold leading-tight tracking-tight">
            GIZO GOLD
            <span className="block text-[11px] font-semibold tracking-[0.22em] text-gold-ink">
              CALCULATOR
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/reports"
            className="flex items-center gap-1.5 rounded-full border border-primary px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <BarChart3 className="h-4 w-4" /> Reports
          </Link>
          <Link
            to="/invoices"
            className="flex items-center gap-1.5 rounded-full border border-primary px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <FileText className="h-4 w-4" /> Invoices
          </Link>
        </div>
      </header>

      <h2 className="font-display text-2xl font-bold">Transaction details</h2>
      <p className="mt-1 text-base italic text-foreground/80">Gold Type</p>
      <div
        role="radiogroup"
        aria-label="Gold type"
        className="mt-2 grid grid-cols-2 overflow-hidden rounded-full border-2 border-primary"
      >
        {(["refined", "ball"] as const).map((t) => (
          <button
            key={t}
            role="radio"
            aria-checked={goldType === t}
            onClick={() => setGoldType(t)}
            className={cn(
              "py-3 font-display text-base font-semibold capitalize transition-colors",
              goldType === t ? "bg-primary text-primary-foreground" : "bg-card text-primary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Input panel */}
      <section className="mt-6 rounded-[2rem] border-2 border-gold-border bg-gold-panel p-4">
        <SectionTitle title="Input" sub="details of gold below." tone="light" />
        {goldType === "ball" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight" unit="g" value={top} onChange={setTop} />
            <Field label="Price" unit="GH₵" value={price} onChange={setPrice} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Top Weight" unit="g" value={top} onChange={setTop} />
            <Field
              label="Down (Water)"
              unit="g"
              value={down}
              onChange={setDown}
              invalid={!!downError}
            />
            {downError && (
              <p
                role="alert"
                className="col-span-2 flex items-start gap-2 rounded-2xl border-2 border-destructive bg-card px-3 py-2.5 text-sm font-semibold text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Wrong down figure. {downError}</span>
              </p>
            )}
            <div className="col-span-2">
              <Field label={`Price (${MAX_KARAT}kt)`} unit="GH₵" value={price} onChange={setPrice} />
            </div>
          </div>
        )}
      </section>

      {/* Results panel */}
      <section className="mt-5 rounded-[2rem] bg-primary p-4 text-primary-foreground shadow-soft">
        <SectionTitle title="Results" sub="can be found below." tone="dark" />
        {goldType === "ball" && (
          <div className="mb-3">
            <Stat label="Pounds" value={formatNum(result.pounds)} />
          </div>
        )}
        {goldType === "refined" && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Stat label="Pounds" value={formatNum(result.pounds)} />
            <Stat label="Density" value={formatNum(result.density)} />
            <Stat label="Karat Used" value={formatNum(result.karat)} />
            <Stat label="Purity" value={`${formatNum(result.purity)}%`} />
            <div className="col-span-2">
              <Stat label="Price per pound" value={`GH₵ ${formatMoney(result.pricePerPound)}`} />
            </div>
          </div>
        )}
        <div className="rounded-[1.75rem] bg-card px-5 py-5 text-card-foreground">
          <p className="text-sm text-muted-foreground">Amount to be paid to the seller</p>
          <p className="mt-1 break-words font-display text-4xl font-extrabold tracking-tight text-primary tabular">
            GH₵ {formatMoney(result.amount)}
          </p>
        </div>
      </section>

      {result.discountApplied > 0 && (
        <p className="mt-5 text-center font-display text-lg font-bold">
          {result.discountApplied}% Purity Discount Applied
        </p>
      )}

      {/* Invoice */}
      <section className="mt-6 rounded-[2rem] border border-border bg-card p-5">
        <h3 className="font-display text-lg font-bold">Invoice</h3>
        <p className="text-sm italic text-muted-foreground">Seller details for the receipt</p>
        <div className="mt-4 grid gap-3">
          <TextField label="Seller name" value={customerName} onChange={setCustomerName} />
          <TextField
            label="Phone number"
            value={customerPhone}
            onChange={setCustomerPhone}
            type="tel"
          />
          <TextField label="Address" value={customerAddress} onChange={setCustomerAddress} />
          <label className="grid gap-1.5">
            <span className="text-sm italic text-foreground/80">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSave("stay")}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-primary py-3 font-semibold text-primary transition-colors hover:bg-accent"
          >
            <Save className="h-4 w-4" /> Save
          </button>
          <button
            onClick={() => handleSave("print")}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-primary py-3 font-semibold text-primary transition-colors hover:bg-accent"
          >
            <Printer className="h-4 w-4" /> Save & Print
          </button>
          <button
            onClick={() => handleSave("gallery")}
            className="col-span-2 flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            <ImageDown className="h-4 w-4" /> Save to Gallery
          </button>
        </div>
      </section>

      <a
        href={WHATSAPP_SHARE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 flex items-center justify-center gap-2 rounded-full border-2 border-primary py-3 font-semibold text-primary transition-colors hover:bg-accent print:hidden"
      >
        <MessageCircle className="h-4 w-4" /> Share on WhatsApp
      </a>

      <p className="mt-8 text-center text-xs text-muted-foreground">Powered by GIZO GOLD</p>
    </main>
  );
}

function SectionTitle({ title, sub, tone }: { title: string; sub: string; tone: "light" | "dark" }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 px-1">
      <span className="h-3 w-3 rounded-full bg-gold" />
      <span className="font-display text-xl font-extrabold">{title}</span>
      <span className={cn("text-sm", tone === "light" ? "text-gold-ink" : "text-primary-foreground/85")}>
        {sub}
      </span>
    </div>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
  small,
  invalid,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  small?: boolean;
  invalid?: boolean;
}) {
  return (
    <label
      className={cn(
        "block rounded-3xl border-2 bg-card px-4 py-3.5 transition-colors",
        invalid ? "border-destructive" : "border-transparent focus-within:border-ring",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm text-muted-foreground">{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>
      </span>
      <span className="mt-1 flex items-baseline">
        <input
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
          className={cn(
            "w-full min-w-0 bg-transparent font-display font-extrabold text-foreground outline-none placeholder:text-foreground/25 tabular",
            small ? "text-xl" : "text-3xl",
          )}
        />
      </span>
    </label>
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

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm italic text-foreground/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
