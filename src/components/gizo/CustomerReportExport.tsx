import { useEffect, useState } from "react";
import { FileSpreadsheet, ImageDown, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildCustomersWorkbook, type ExcelFile } from "@/lib/report-excel";
import { buildCustomerPictures, type CustomerPicture } from "@/lib/customer-report-image";
import { deliverFile } from "@/lib/deliver-file";
import { saveImageToGallery } from "@/lib/invoice-image";
import { isNativeApp, nativeShareFile } from '@/lib/native-files';
import type { Invoice } from "@/lib/invoices";
import type { PeriodRange } from "@/lib/reports";

export function CustomerReportExport({ all, range }: { all: Invoice[]; range: PeriodRange }) {
  const [excel, setExcel] = useState<ExcelFile | null>(null);
  const [pictures, setPictures] = useState<CustomerPicture[]>([]);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    let alive = true;
    let urls: string[] = [];
    setExcel(null);
    setPictures([]);
    setPreview(false);
    buildCustomersWorkbook(all, new Date(), range)
      .then((file) => {
        if (alive) setExcel(file);
      })
      .catch(() => {
        if (alive) toast.error("Couldn't prepare customer Excel file.");
      });
    buildCustomerPictures(all, range)
      .then((images) => {
        urls = images.map((image) => image.url);
        if (alive) setPictures(images);
        else urls.forEach((url) => URL.revokeObjectURL(url));
      })
      .catch(() => {
        if (alive) toast.error("Couldn't prepare customer pictures.");
      });
    return () => {
      alive = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [all, range]);

  async function share(file: File) {
    try {
      if (isNativeApp()) await nativeShareFile(file);
      else if (navigator.share && navigator.canShare?.({ files: [file] }))
        await navigator.share({ files: [file] });
      else {
        await deliverFile(file);
        toast("File downloaded. Attach it in WhatsApp or email.");
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError")
        toast.error("Couldn't share. Save the file and attach it instead.");
    }
  }

  async function gallery(file: File) {
    try {
      const outcome = await saveImageToGallery(file);
      if (outcome === "blocked") toast("Touch and hold the picture below to save it.");
      else if (outcome === "downloaded") toast.success("Picture downloaded");
    } catch {
      toast.error("Couldn't save picture. Touch and hold the preview to save it.");
    }
  }

  return (
    <section className="mt-6 border-t border-border pt-5">
      <h2 className="font-display text-lg font-bold">Customer list · {range.label}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          className="h-auto min-h-11 whitespace-normal"
          disabled={!excel?.count}
          onClick={() => {
            if (excel)
              void deliverFile(excel.file).catch(() => toast.error("Couldn't save Excel file."));
          }}
        >
          <FileSpreadsheet /> Save customer Excel
        </Button>
        <Button
          variant="outline"
          className="h-auto min-h-11 whitespace-normal"
          disabled={!excel?.count}
          onClick={() => {
            if (excel) void share(excel.file);
          }}
        >
          <Share2 /> Share Excel
        </Button>
        <Button
          variant="outline"
          className="col-span-2 h-auto min-h-11 whitespace-normal"
          disabled={!pictures.length}
          onClick={() => setPreview((v) => !v)}
        >
          <ImageDown /> Customer pictures / Gallery
        </Button>
      </div>
      {preview && (
        <div className="mt-4 grid gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Customer pictures</h3>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close customer pictures"
              onClick={() => setPreview(false)}
            >
              <X />
            </Button>
          </div>
          {pictures.map((picture, index) => (
            <div key={picture.file.name}>
              <img
                src={picture.url}
                alt={`Customer report, page ${index + 1}`}
                className="w-full border border-border"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void gallery(picture.file)}>
                  <ImageDown /> Save picture {index + 1} to Gallery
                </Button>
                <Button variant="outline" onClick={() => void share(picture.file)}>
                  <Share2 /> Share picture {index + 1}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
