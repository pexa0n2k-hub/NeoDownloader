# NeoDownload V1
PWA starter for a mobile download manager.

## Deploy
Upload all files to a GitHub repository and enable GitHub Pages from Settings > Pages.

## Current limitations
- Direct links are supported.
- Progress tracking works when the server allows CORS and exposes content length.
- If CORS blocks access, the app falls back to the browser's native download action.
- Background downloading, reliable pause/resume, and file-system integration require a native Android implementation or additional platform support.
