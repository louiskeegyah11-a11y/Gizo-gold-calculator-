<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Offline support uses generated Workbox assets after TanStack prerendering and one preview-guarded registrar; only generic calculator HTML is precached, while invoices remain on-device.
- Fonts are bundled locally so offline calculations, invoice pictures and reports do not depend on external font services.
- Gold math lives only in `src/lib/gold.ts` (pure functions, covered by `src/test/gold.test.ts`) so UI and invoices always agree.
- Invoices are stored in browser localStorage via `src/lib/invoices.ts`; no backend yet, so swap that module if Cloud storage is added.
- Printing uses `src/lib/print-invoice.ts`: browser `window.print()` or native Capgo Printer with the same print stylesheet; no PDF library.
- Saving an invoice to the phone gallery draws a PNG on a canvas in `src/lib/invoice-image.ts` (no image library) and shares only the file via the Web Share API, falling back to download; the image is pre-built on page load so the share call stays inside the user's tap. Invoice rows come from `src/lib/invoice-rows.ts` so the picture and on-screen invoice match.
- Reports group saved invoices by Monday-start week, month and quarter in `src/lib/reports.ts` (pure, covered by `src/test/reports.test.ts`); totals add the figures stored on each invoice, never recalculate them.
- Excel export uses `write-excel-file/universal` in `src/lib/report-excel.ts`, writing totals as values (not formulas) so phone viewers that don't recalculate still show them; files are pre-built and delivered via `src/lib/deliver-file.ts` (share sheet on touch devices, download otherwise).
- Customer period exports share browser-safe row and range helpers in `src/lib/customer-report.ts`; gallery reports use pre-built paginated canvas PNGs and file-only sharing so private records stay on-device and each picture remains readable.
- Capacitor packages the existing prerendered client in `dist/client`, never a remote server URL; require asset checks and real native route/offline tests before release because the website remains TanStack Start.
- Native receipt/report delivery uses `src/lib/native-files.ts` with cache-file attachments and cleanup; preserve browser fallbacks and the local storage key/origin so existing records are never cleared during setup.
- Codemagic workflows are manual unsigned validation only: frozen Bun install, regression tests, production web build, checked Capacitor sync, then native compilation; signed release and store publishing require separate explicit configuration.
