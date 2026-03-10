# Export Image Fills

> Export every image fill at its original quality — zipped and ready for developers.

![Figma](https://img.shields.io/badge/Figma-Plugin-F24E1E?logo=figma&logoColor=white)
![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey)
![Version](https://img.shields.io/badge/Version-3-blue)
![Free](https://img.shields.io/badge/Price-Free-brightgreen)

---

## 🔌 Check it out on Figma Community

You can use the plugin directly by searching for it inside Figma Design. However, you can save it for later directly at Figma Community.

👉 [Export Image Fills on Figma Community](https://www.figma.com/community/plugin/1611049281032806333/export-image-fills)

---

## 📖 What it does

**Export Image Fills** finds every node that uses an image as a fill — across selected frames, the current page, or the entire document — and packages them into a ready-to-hand-off ZIP file.

No re-compression. No quality loss. Just your images, organized and ready to go.

---

## ✨ Features

- 🔸 **Three scan scopes** — export from a frame selection, the current page, or the entire document
- 🔸 **Original format export** — images are extracted as-is (PNG, JPEG, WebP, GIF)
- 🔸 **Format conversion** — optionally convert all images to PNG (lossless) or JPEG (smaller, white background on transparency)
- 🔸 **Ready-to-hand ZIP export** — files are organized into folders by page and frame, mirroring your document hierarchy
- 🔸 **Filename editor** — rename any file before exporting directly from the list
- 🔸 **De-duplication** — identical images are fetched only once, keeping exports fast even in large documents
- 🔸 **Easy group selection** — select or deselect images by frame group, or use Select All
- 🔸 **Figma-native UI** — adapts to light and dark themes automatically
- 🔸 **English and Spanish** — the UI follows your system language

---

## 🚀 How to Use

1. **Select your scope** — choose *Frame*, *Page*, or *Document* from the top selector
2. *(Frame scope only)* Select one or more top-level frames on the canvas
3. Click **Scan for images** — the plugin will find all image fills and list them with previews
4. **Review the list** — check or uncheck individual images or entire groups; rename files as needed by clicking the edit icon
5. **Choose an export format** — Original, PNG, or JPEG
6. **Set the ZIP file name** (pre-filled from your frame or document name)
7. Click **Download ZIP** 🎉

---

## 🗂️ Project Structure

```
├── manifest.json   # Plugin configuration
├── code.js         # Core plugin logic
├── ui.html         # Plugin UI
└── README.md
```

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
