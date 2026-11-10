# GIZO GOLD CALCULATOR — native app preparation

## Prepared, not deployed

- Capacitor 8 configuration: `com.louisdenzel.gizogold`, **GIZO GOLD CALCULATOR**, bundled web directory `dist/client`.
- Android project in `android/`; iOS Xcode project in `ios/` using Swift Package Manager.
- Official Capacitor Filesystem and Share plugins plus the open-source Capgo Printer plugin. Native paths use temporary, file-only attachments; the website keeps its existing download, gallery and browser-print behavior.
- iOS file-timestamp privacy manifest included in the Xcode resources.
- Calculator formulas, interface, invoice storage and existing customer records are unchanged. No connected database was found: invoices currently live in each browser's local storage.
- No deployment, signing, store submission or remote live-reload URL was configured.

## Build on your computer

Local builds are optional. Use the Codemagic workflows below to build Android and iOS in the cloud without installing Android Studio or Xcode on your computer.

Use Node.js 22 or newer and Bun. From the project root:

```sh
bun install --frozen-lockfile
bun run build
bun run native:sync
```

The normal TanStack build prerenders the generic calculator into `dist/client/index.html`. The sync command checks this HTML and its client scripts before copying it to the native projects. Only browser assets are packaged; the server and sitemap remain website-only. Do not replace the existing framework or copy the server bundle into the app.

The platform projects are committed; generated web assets and plugin configuration are recreated by the build and sync steps on every clean checkout. Do not use placeholder HTML. The artifact check is not a substitute for testing nested routes in real WebViews.

### Android

Install Android Studio with SDK 36 and JDK 21 (generated project: Android 7/API 24 minimum), then:

```sh
bun run native:android
```

Let Gradle finish syncing, select a device/emulator, and Run. Configure your own signing key only when preparing a release; keep signing files out of Git. Android Studio can create APK/AAB files after testing.

### iPhone/iPad

Use a Mac with a Capacitor-8-compatible Xcode (26 or newer), then:

```sh
bun run native:ios
```

Resolve Swift packages, choose your Apple development team under Signing & Capabilities, and run on a simulator/device. Generated minimum is iOS 15. Confirm all plugins' requirements in Xcode. Archiving, provisioning and App Store submission require Apple tooling/accounts and were not performed here.

## Codemagic cloud builds (no local native tools required)

`codemagic.yaml` in the repository root contains two **manually started, unsigned validation** workflows. Neither publishes, uploads to a store, exports a signed IPA, or requires developer signing credentials. Both use Codemagic's `mac_mini_m2` machine with Xcode 26.4, Node 22.23.0, JDK 21 and explicitly installed Bun 1.4.4. Using macOS for both also allows the required full `npx cap sync` to update both platforms. Build availability and minutes depend on your Codemagic plan.

### Start builds using only your browser

1. Ensure this project is connected to a Git repository in Lovable's project settings and these changes have synced. Repository connection/access cannot be verified from this checkout.
2. Sign into [Codemagic](https://codemagic.io/), add the repository as an app, and grant access to that repository (including private repositories if applicable).
3. Select YAML configuration, the branch containing `codemagic.yaml`, and start **android-unsigned** or **ios-unsigned**. Run both separately. No automatic push trigger is configured.
4. Each workflow installs dependencies using the committed Bun lockfile, runs the regression suite, runs `bun run build`, checks `dist/client`, runs `npx --no-install cap sync` (the installed CLI, without fetching another version), then checks both synced asset folders before native compilation.
5. Open the completed build's **Artifacts** area to download the files and inspect logs. If a build fails, use its failing step and downloaded logs; no build success is assumed until Codemagic reports it.

### Android output

The Android workflow installs SDK 36/build-tools 35.0.0, writes ignored `android/local.properties`, and runs Gradle `bundleRelease`. The existing release configuration has no signing key, so output is **`app-release.aab` unsigned**. This verifies compilation; it is not directly installable and cannot be uploaded to Google Play until signed. The Gradle log is downloadable.

### iOS output

A committed shared **App** scheme makes the existing Swift Package Manager Xcode project discoverable on a fresh cloud checkout. After sync, the workflow resolves Swift packages and archives for `generic/platform=iOS` with signing disabled. Download **`GizoGold-unsigned.xcarchive.zip`**, the zipped `.xcresult` diagnostics, and package/build logs. This is an unsigned device archive, **not an installable IPA** and not a TestFlight upload. Package.resolved is collected when generated; capture and commit the successful resolution before relying on fully repeatable Swift package versions.

### Signed releases later — credentials, not needed for validation

**Android:** a Google Play Developer account and an app record for `com.louisdenzel.gizogold` are needed for Play distribution. Signing needs your upload/release `.jks` or `.keystore`, keystore password, alias and key password; enroll in Play App Signing as appropriate and retain the same upload identity for updates. A Google Play service-account JSON with the correct app permissions is needed only for future automated uploads, not for these builds or manual uploads. New store uploads need increasing `versionCode` values; this preparation retains version 1/1.0.

**iOS:** an active Apple Developer Program membership, team ID, registered bundle ID `com.louisdenzel.gizogold`, and an App Store Connect app record. Manual signing needs an Apple Distribution certificate with its private key (`.p12` and password) plus a matching App Store provisioning profile. Alternatively, Codemagic automatic signing uses an App Store Connect API `.p8` private key, key ID and issuer ID with sufficient permissions plus a certificate private key/signing identity. Ad-hoc device testing needs the appropriate registered devices and profile; TestFlight needs a signed distribution build. Increment the iOS build number for subsequent store uploads.

Store signing files and passwords in **Codemagic's encrypted code-signing settings/environment groups**, never in this repository or chat. No signing groups, secrets or `publishing` sections are enabled here. Adding signing and optional store uploads is a separate task requiring your authorization.

### Verification status and limitations

All 80 regression/configuration tests pass; YAML parsing, cloud shell syntax and shared scheme XML were validated, and the preview reports build OK. Android application ID and both iOS bundle configurations match `com.louisdenzel.gizogold`. No current configuration/test errors remain, but Codemagic account/repository access is not connected in this session. No remote build has been started and no native binary has been compiled here. Production build, full plugin sync, SDK compilation, Swift package resolution and device checks must succeed in Codemagic/on test devices before release. Cloud builds do not require local Android Studio or Xcode; unsigned outputs alone do not establish that receipt printing, sharing, gallery actions or offline native navigation work on phones. Starter native artwork/privacy disclosures remain release tasks.

Reference: [Codemagic YAML](https://docs.codemagic.io/yaml-basic-configuration/yaml-getting-started/), [Capacitor guide](https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/).

## Records and offline use

Existing website records remain exactly where they are. Installing the native app creates a **separate storage area**; it cannot automatically read Safari/Chrome invoices. Before moving, export all invoices and customer Excel files from the browser and keep them safe. Excel is an archive, not a lossless import or restore mechanism; automatic website-to-app migration/import is not implemented. Do not clear browser data or uninstall either version expecting records to transfer.

Native assets should run offline without the website service worker. The guarded website worker remains unchanged for browser users; native registration is skipped. Keep the app ID and local WebView origin stable for future upgrades. Uninstalling/clearing app data can remove native records; no cloud backup is provided.

## Required checks before any release

Native binaries were not compiled or tested in this environment. On **both Android and iOS**:

1. Start in airplane mode; confirm the calculator appears, fonts load and both boards stay independent.
2. Enter 47.68 / 2.56 at 11,000; confirm density 18.62, karat 22.84, purity 95.17%, amount GH₵67,179.00.
3. Save a real test invoice with name, phone and address; navigate to its details and restart the app offline. Reopen it and confirm the figures and customer details.
4. Open invoices, reports and invoice details after navigation and after reload. Confirm local nested-route fallback and lazy chunks work. If hydration or deep-route fallback fails, do not release; this SSR-derived bundle needs further adaptation.
5. Use Save & Print and Print; confirm only the invoice appears, with correct page breaks, fonts and amount. Check native print cancellation too.
6. Export weekly, monthly and quarterly customer Excel/pictures. Share via WhatsApp and email; open the attachment and confirm its contents. Test large reports and low-memory phones.
7. Save invoice/customer pictures through the share sheet. iOS normally offers Save Image; Android destinations depend on installed apps. **Direct silent saving into Photos/Gallery is not implemented or guaranteed**. No broad storage/photo permissions were added.
8. Test canceled shares, deletion, and an app upgrade without uninstalling; records must survive upgrades.
9. Replace Capacitor's starter native launcher/splash artwork with the existing GIZO artwork using platform tooling before store release. Complete store privacy disclosures and review merged plugin manifests.

Browser regression tests and configuration checks can run here. Native compilation and signing can run in Codemagic; actual offline, receipt and record-persistence checks still require test devices. The app is prepared for conversion, not certified release-ready.