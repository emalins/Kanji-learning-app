# Kanji TSV Reader

A small vanilla JavaScript Progressive Web App for stepping through kanji rows in TSV files.

## What changed in this version

- The settings cog is now in the top-right of the top box, with the label underneath.
- The level selector is labeled **Levels**.
- Quiz mode has a **Statistics** button.
- Statistics track presented / correct / incorrect counts per kanji in the current file.
- The stroke count badge has been removed.
- Mobile layouts are tighter and use the available width better.
- Quiz completion still shows the results grid.

## Files

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `data-index.json`
- `data/current_file.txt`
- `data/N5_v1.0.tsv`
- `data/N4_v1.0.tsv`
- `data/N3_v1.0.tsv`

## Running locally

Serve the folder with any local web server, for example:

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000/`
