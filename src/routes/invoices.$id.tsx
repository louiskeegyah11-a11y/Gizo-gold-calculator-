import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ImageDown, Printer, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { InvoiceDocument } from "@/components/gizo/InvoiceDocument";
import { buildInvoiceImage, saveImageToGallery, type InvoiceImage } from "@/lib/invoice-image";
import { deleteInvoice, getInvoice, type Invoice } from "@/lib/invoices";
import { printInvoice } from '@/lib/print-invoice';

export const Route = createFileRoute("/invoices/$id")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => ({
    print: s["print"] === true || s["print"] === "true",
    gallery: s["gallery"] === true || s["gallery"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Invoice — GIZO GOLD CALCULATOR" },
      { name: "description", content: "Printable gold purchase invoice from GIZO GOLD." },
      { property: "og:title", content: "Invoice — GIZO GOLD CALCULATOR" },
      { property: "og:description", content: "Printable gold purchase invoice from GIZO GOLD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const { print, gallery } = Route.useSearch();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [image, setImage] = useState<InvoiceImage | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setInvoice(getInvoice(id) ?? null);
  }, [id]);

  // Prepare the picture ahead of time so tapping "Save to Gallery" opens the phone's save sheet instantly.
  useEffect(() => {
    if (!invoice) return;
    let alive = true;
    buildInvoiceImage(invoice)
      .then((img) => {
        if (!alive) return;
        setImage(img);
        if (gallery) setSheetOpen(true);
      })
      .catch(() => toast.error("Couldn't prepare the invoice picture."));
    return () => {
      alive = false;
    };
  }, [invoice, gallery]);

  useEffect(() => {
    if (invoice && print) {
      const t = setTimeout(() => {
        void printInvoice().catch(() => toast.error("Couldn't open printing. Try again."));
      }, 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [invoice, print]);

  async function handleSave() {
    if (!image) {
      toast("Preparing the picture… try again in a moment.");
      return;
    }
    const outcome = await saveImageToGallery(image.file);
    if (outcome === "shared") {
      setSheetOpen(false);
      toast.success("Choose where to save or share your invoice picture");
    } else if (outcome === "downloaded") {
      setSheetOpen(true);
      toast.success("Invoice picture downloaded");
    } else if (outcome === "blocked") {
      setSheetOpen(true);
    }
  }

  function handleDelete() {
    if (!invoice) return;
    if (!confirm(`Delete invoice ${invoice.number}?`)) return;
    deleteInvoice(invoice.id);
    toast.success(`Invoice ${invoice.number} deleted`);
    navigate({ to: "/invoices" });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-16 pt-5 print:p-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Invoices
        </Link>
        {invoice && (
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              aria-label={`Delete invoice ${invoice.number}`}
              className="flex items-center gap-2 rounded-full border-2 border-destructive px-4 py-2 text-sm font-semibold text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <button
              onClick={() => void printInvoice().catch(() => toast.error("Couldn't open printing. Try again."))}
              className="flex items-center gap-2 rounded-full border-2 border-primary px-4 py-2 text-sm font-semibold text-primary"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
            >
              <ImageDown className="h-4 w-4" /> Save to Gallery
            </button>
          </div>
        )}
      </div>

      {invoice === null && (
        <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          This invoice isn't saved on this device.
        </div>
      )}
      {invoice && <InvoiceDocument invoice={invoice} />}

      {sheetOpen && image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Save invoice to gallery"
          className="fixed inset-0 z-50 flex flex-col bg-foreground/95 p-4 backdrop-blur-sm print:hidden"
        >
          <div className="mx-auto flex w-full max-w-md items-center justify-between pb-3 text-primary-foreground">
            <p className="font-display text-base font-bold">Save to Gallery</p>
            <button
              aria-label="Close"
              onClick={() => setSheetOpen(false)}
              className="rounded-full p-2 transition-colors hover:bg-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mx-auto min-h-0 w-full max-w-md flex-1 overflow-auto rounded-2xl">
            <img
              src={image.dataUrl}
              alt={`Invoice ${invoice?.number ?? ""}`}
              className="w-full rounded-2xl"
            />
          </div>
          <div className="mx-auto w-full max-w-md pt-3">
            <button
              onClick={handleSave}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-soft"
            >
              <ImageDown className="h-5 w-5" /> Save to Photos
            </button>
            <p className="mt-2 text-center text-xs text-primary-foreground/85">
              On iPhone pick “Save Image”. You can also press and hold the picture and choose “Save
              to Photos”.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
