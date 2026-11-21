# Habits: habit tracker + workout tracker

One repo that builds an Android app (.apk), a Windows app (.exe) and an iPhone app (.ipa) using GitHub Actions. No PWABuilder needed.

## Folders
- `docs/` is the app itself (HTML, CSS, JavaScript). Edit `docs/index.html` to change the app.
- `desktop/` wraps the app as a Windows program (Electron).
- `.github/workflows/build.yml` builds everything.
- `workflow-copy/build.yml` is a copy of the build file, in case the `.github` folder does not upload.

## Set up (one time)
1. Create a new public GitHub repository.
2. Upload everything from this folder to it, keeping the folders. Click **Add file > Upload files** and drag all the contents in.
3. Check that `.github/workflows/build.yml` is in the repo. If not, click **Add file > Create new file**, type `.github/workflows/build.yml` as the name, paste the contents of `workflow-copy/build.yml`, and commit.
4. Android signing (recommended): in **Settings > Secrets and variables > Actions** add two secrets, `KEYSTORE_BASE64` and `KEYSTORE_PASSWORD`. Use the same values as your old repo so new APKs install over the old app. Without them, the build makes a `Habits-debug.apk` that cannot update an existing app.

## Build
1. Open the **Actions** tab, choose **Build apps (APK, EXE, IPA)**, and click **Run workflow**.
2. Wait 10 to 20 minutes for the green tick.
3. Open **Releases** and download:
   - `Habits.apk` for Android
   - `Habits-Setup.exe` (installer) or `Habits-Portable.exe` (no install) for Windows
   - `Habits-unsigned.ipa` for iPhone

## Installing
- **Android:** tap the APK and allow "Install unknown apps".
- **Windows:** run the EXE. If SmartScreen says "unknown publisher", click **More info > Run anyway**. The app is not code-signed.
- **iPhone:** Apple only runs signed apps, so the IPA must be signed with your Apple ID. Install it with **AltStore** or **Sideloadly** on a computer. A free Apple ID works but the app expires after 7 days and must be refreshed. A paid Apple Developer account ($99/year) allows TestFlight and longer installs.

## Website (optional)
In **Settings > Pages**, choose **Deploy from a branch**, branch `main`, folder `/docs`. The app then runs at `https://YOUR-NAME.github.io/REPO-NAME/` and installs on any phone or PC from the browser.

## Updating
Change files in `docs/`, commit, and run the workflow again. Android and Windows builds get a new build number each time.
