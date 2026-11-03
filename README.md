# Export Image Fills

> Export every image fill at its original quality — zipped and ready for developers.

![Figma](https://img.shields.io/badge/Figma-Plugin-F24E1E?logo=figma&logoColor=white)
![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)
![Version](https://img.shields.io/badge/Version-12-blue)
![Free](https://img.shields.io/badge/Price-Free-brightgreen)

---

## 🔌 Install on Figma Community

👉 [Export Image Fills on Figma Community](https://www.figma.com/community/plugin/1611049281032806333/export-image-fills)

---

## 📖 What it does

**Export Image Fills** finds every node that uses an image as a fill — across selected frames, the current page, or the entire document — and packages them into a ready-to-hand-off ZIP file.

No re-compression. No quality loss. Just your images, organized and ready to go.

---

## ✨ Features

- 🔸 **Three scan scopes** — export from a frame selection, the current page, or the entire document
- 🔸 **Original format export** — images are extracted as-is (PNG, JPEG, GIF). Figma converts WebP, HEIC and TIFF to PNG/JPEG on upload, so those are what you get back
- 🔸 **Format conversion** — optionally convert all images to PNG (lossless), JPG (smaller, white background on transparency) or WebP (good size, keeps transparency)
- 🔸 **2× high-resolution export** — an independent checkbox that renders images at double resolution, on top of your size choice
- 🔸 **Filename controls** — add the source file size (`@1200x800`), the container size (`@200x200`), and an `@x2` marker when exporting at double resolution
- 🔸 **Ready-to-hand ZIP export** — files are organized into folders by page and frame, mirroring your document hierarchy
- 🔸 **Optional folder tree map** — a small `folder-tree-map.txt` inside the ZIP listing the folder structure, for handing off to developers
- 🔸 **Filename editor** — rename any file before exporting directly from the list
- 🔸 **De-duplication** — identical images are fetched only once, and cached for the session, so a second export is instant
- 🔸 **Built for large libraries** — previews are decoded as 104 px thumbnails, so galleries of 200+ images stay smooth and memory-stable
- 🔸 **Easy group selection** — select or deselect images by frame group, or use Select All
- 🔸 **Figma-native UI** — follows Figma's light or dark theme, with a manual toggle in the footer
- 🔸 **Four languages** — English, Spanish, Brazilian Portuguese and French. Click the language button in the footer to cycle; your choice is remembered

---

## 🚀 How to Use

1. **Select your scope** — choose *Frame*, *Page*, or *Document* from the top selector
2. *(Frame scope only)* Select one or more top-level frames on the canvas
3. Click **Scan for images** — the plugin will find all image fills and list them with previews
4. **Review the list** — check or uncheck individual images or entire groups; rename files as needed by clicking the edit icon
5. **Choose an export format** — Original, PNG, JPG or WebP
6. **Choose a size** — optionally *Export at current size* (the node's frame, instead of the asset) and/or *High resolution (x2)*
7. **Tune the filenames** — optional suffixes with the source size or the container size
8. **Set the ZIP file name** (pre-filled from your frame or document name) and, if you want, *Include folder tree map*
9. Click **Download ZIP** 🎉

### Notes on the x2 option

- It is independent of *Export at current size*. What changes is the source of the pixels:
  - **Current size + x2** → Figma renders the node at scale 2, exactly like the native 2× export
  - **Original + x2** → the asset is resampled at double size in the canvas. It adds no new detail, and the file is saved as PNG because scaling requires re-encoding
- **GIFs are never scaled** — the animation would be frozen, so they are exported untouched and without the `@x2` marker
- Filenames keep the design size plus the marker by default (`avatar@200x200@x2.png`). If you check *Use output pixels in filename*, they show the real pixels instead (`avatar@400x400.png`)

---

## 🗂️ Project Structure

```
├── manifest.json   # Plugin configuration
├── code.js         # Core plugin logic
├── ui.html         # Plugin UI
├── CHANGELOG.md    # Release notes
└── README.md
```

No build step, no dependencies, no network access. `code.js` runs in the sandbox and only touches the Figma API; `ui.html` holds the interface, the canvas conversions and the ZIP writer. The only thing that crosses between them is `Uint8Array` image data.

---

## 📝 Changelog

Release notes live in [CHANGELOG.md](CHANGELOG.md). Latest: **v12** — 2× export, filename controls, folder tree map, four languages, and thumbnail-based previews for large libraries.

---

## 📄 License

This plugin is and will always be **free**.

The source code is available under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.

You are free to:
- ✅ **Use** — install and run the plugin for any personal or professional project
- ✅ **Share** — copy and redistribute the code
- ✅ **Adapt** — remix, transform, and build upon it

As long as you:
- 📌 **Give credit** — mention the original author
- 🚫 **No commercial use** — you may not sell or monetize this plugin or any derivative
- 🔁 **ShareAlike** — any modified version must be shared under the same license

---

## 👤 Author

**Felipe Villegas**
- Figma Community: [@felipevillegas](https://www.figma.com/@felipevillegas)
- Portfolio: [behance.net/felipevillega4](https://www.behance.net/felipevillega4)
- Support: feliv.designer@gmail.com
