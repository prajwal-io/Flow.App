# Code signing (SignPath, free for open source)

Flow's Windows installer ships unsigned until this is set up: SmartScreen shows
**Windows protected your PC** on other machines. [SignPath](https://signpath.io)
signs open-source projects for free — the certificate is issued to the
*SignPath Foundation*, not to you, and every signing request is approved by a
human in their dashboard.

The `.github/workflows/signpath.yml` workflow builds Flow on a GitHub-hosted
runner, signs `Flow.exe`, packs the NSIS installer from the signed app, signs
the installer, verifies the signature, and (optionally) replaces the assets on
a GitHub Release. It is **manual only** (`workflow_dispatch`) — it never runs
on push, and it fails fast with a clear error until the steps below are done.

## One-time setup

1. **Apply** at <https://signpath.io/solutions/open-source-community>
   (approval takes about a week).
2. In the SignPath dashboard, create an **organization** and a **project**
   (e.g. `flow`), and link it to `prajwal-io/Flow.App` using the predefined
   *GitHub.com* trusted build system. Install the
   [SignPath GitHub App](https://github.com/apps/signpath) and allow it on the
   repository.
3. Create a **signing policy** (e.g. `release-signing`) under that project,
   using the *Open Source Code Signing* certificate.
4. Create two **artifact configurations** under the project:

   **`app-exe`** — signs `Flow.exe` inside the uploaded unpacked-app zip
   (the workflow uploads `dist/win-unpacked`, so its contents sit at the zip
   root):

   ```xml
   <artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
     <zip-file>
       <pe-file path="Flow.exe">
         <authenticode-sign />
       </pe-file>
     </zip-file>
   </artifact-configuration>
   ```

   **`nsis-installer`** — signs the installer inside its uploaded zip
   (wildcard so version bumps don't break it):

   ```xml
   <artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
     <zip-file>
       <pe-file path="Flow-Setup-*.exe">
         <authenticode-sign />
       </pe-file>
     </zip-file>
   </artifact-configuration>
   ```

5. Create an **API token** (user with *submitter* permission on the project)
   and add it to the repository as the secret **`SIGNPATH_API_TOKEN`**
   (Settings → Secrets and variables → Actions).
6. Edit `.github/workflows/signpath.yml` and replace the three placeholder
   values in the top-level `env:` block with your SignPath organization ID,
   project slug, and signing-policy slug.

## Running a signing build

Actions tab → **Sign Windows build** → **Run workflow**:

- **release-tag empty** — the signed installer is kept as a workflow
  artifact (`signed-installer`, with `SHA256SUMS.txt`); attach it to a release
  by hand.
- **release-tag `v1.3.0`** — the run also replaces that release's
  `Flow-Setup-*.exe` and `latest.yml`, deletes the stale `.blockmap`, and
  uploads `SHA256SUMS.txt`.

While the run waits, open the **signing request** in the SignPath dashboard
and approve it (free tier: every request needs manual approval; the job waits
up to 30 minutes). Then check the run log for:

```
signature: Valid - CN=SignPath Foundation, ...
```

## How the updater stays honest

Signing changes the installer's bytes after electron-builder computed its
checksums, so the workflow:

- rewrites `sha512` and `size` in `latest.yml` to the signed file —
  electron-updater verifies every download against it, so this is required
  for auto-update to work at all;
- deletes the release's `.blockmap` — it describes the unsigned bytes, so
  differential updates are skipped in favor of a full, verified download.

## Verifying by hand

```powershell
Get-AuthenticodeSignature .\Flow-Setup-1.3.0.exe
Get-FileHash .\Flow-Setup-1.3.0.exe -Algorithm SHA256   # compare with SHA256SUMS.txt
```
