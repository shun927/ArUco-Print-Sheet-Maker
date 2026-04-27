const data = window.ARUCO_MARKER_DATA;

const dictionaryInput = document.querySelector("#dictionary");
const markerIdInput = document.querySelector("#marker-id");
const markerSizeInput = document.querySelector("#marker-size");
const quietZoneInput = document.querySelector("#quiet-zone");
const showBordersInput = document.querySelector("#show-borders");
const rangeStartInput = document.querySelector("#range-start");
const rangeCountInput = document.querySelector("#range-count");
const form = document.querySelector("#marker-form");
const workspace = document.querySelector(".workspace");
const sheetFrame = document.querySelector("#sheet-frame");
const pagesElement = document.querySelector("#pages");
const template = document.querySelector("#marker-template");
const paperSizeInput = document.querySelector("#paper-size");
const pageMarginInput = document.querySelector("#page-margin");
const markerGapInput = document.querySelector("#marker-gap");
const showLabelsInput = document.querySelector("#show-labels");
const fillRangeButton = document.querySelector("#fill-range");
const clearButton = document.querySelector("#clear-all");
const printButton = document.querySelector("#print-sheet");
const status = document.querySelector("#status");

const paperSizes = {
  a3: { label: "A3", width: 297, height: 420 },
  a4: { label: "A4", width: 210, height: 297 },
  a5: { label: "A5", width: 148, height: 210 },
  a6: { label: "A6", width: 105, height: 148 },
  b4: { label: "B4 (JIS)", width: 257, height: 364 },
  b5: { label: "B5 (JIS)", width: 182, height: 257 },
  b6: { label: "B6 (JIS)", width: 128, height: 182 },
  letter: { label: "Letter", width: 215.9, height: 279.4 },
  legal: { label: "Legal", width: 215.9, height: 355.6 },
  tabloid: { label: "Tabloid", width: 279.4, height: 431.8 },
  postcard: { label: "Postcard", width: 100, height: 148 },
  l: { label: "L", width: 89, height: 127 },
  kg: { label: "KG", width: 102, height: 152 },
  "two-l": { label: "2L", width: 127, height: 178 },
};

const markers = [];
const labelHeightMm = 10;
const labelGapMm = 2;
const previewPageGapPx = 18;

function setupDictionaries() {
  Object.entries(data).forEach(([key, dictionary]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = dictionary.label;
    dictionaryInput.append(option);
  });
  updateIdLimit();
}

function updateIdLimit() {
  const dictionary = data[dictionaryInput.value];
  markerIdInput.max = dictionary.count - 1;
  rangeStartInput.max = dictionary.count - 1;
  if (Number(markerIdInput.value) > dictionary.count - 1) {
    markerIdInput.value = dictionary.count - 1;
  }
  if (Number(rangeStartInput.value) > dictionary.count - 1) {
    rangeStartInput.value = dictionary.count - 1;
  }
  status.textContent = `IDは 0 から ${dictionary.count - 1} まで指定できます。`;
}

function markerSvg(dictionaryKey, markerId) {
  const dictionary = data[dictionaryKey];
  const cells = dictionary.markerSize + 2;
  const bits = dictionary.markers[markerId];
  const rects = [];

  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      if (bits[y * cells + x] === "1") {
        rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
      }
    }
  }

  return `
    <svg viewBox="0 0 ${cells} ${cells}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect width="${cells}" height="${cells}" fill="#fff"/>
      <g fill="#000">${rects.join("")}</g>
    </svg>
  `;
}

function addMarker(dictionaryKey, markerId, sizeMm) {
  const dictionary = data[dictionaryKey];
  const id = Number(markerId);
  const size = Number(sizeMm);
  const quietZoneMm = Number(quietZoneInput.value);
  const showBorder = showBordersInput.checked;

  if (!Number.isInteger(id) || id < 0 || id >= dictionary.count) {
    status.textContent = `この種類ではIDを 0 から ${dictionary.count - 1} の範囲で指定してください。`;
    return false;
  }

  if (!Number.isFinite(size) || size < 5 || size > 200) {
    status.textContent = "サイズは 5mm から 200mm の範囲で指定してください。";
    return false;
  }

  if (!Number.isFinite(quietZoneMm) || quietZoneMm < 0 || quietZoneMm > 50) {
    status.textContent = "白余白は 0mm から 50mm の範囲で指定してください。";
    return false;
  }

  markers.push({ dictionaryKey, markerId: id, sizeMm: size, quietZoneMm, showBorder });
  render();
  return true;
}

function render() {
  pagesElement.replaceChildren();
  const showLabels = showLabelsInput.checked;
  const layout = paginateMarkers(showLabels);

  layout.pages.forEach((pageMarkers, pageIndex) => {
    const page = document.createElement("div");
    page.className = "sheet";
    page.setAttribute("aria-label", `${pageIndex + 1}ページ`);

    pageMarkers.forEach((entry) => {
      page.append(createMarkerElement(entry.marker, entry.index, entry.x, entry.y, showLabels));
    });

    pagesElement.append(page);
  });

  updateSheet();
  fitSheetToWorkspace(layout.pages.length);

  if (layout.errors.length) {
    status.textContent = layout.errors[0];
  } else if (markers.length) {
    status.textContent = `${markers.length}個のマーカーを${layout.pages.length}ページに配置中です。`;
  } else {
    status.textContent = "マーカーを追加してください。";
  }
}

function createMarkerElement(marker, index, xMm, yMm, showLabels) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".marker-card");
    const art = fragment.querySelector(".marker-art");
    const label = fragment.querySelector(".marker-label");
    const remove = fragment.querySelector(".remove");
    const dictionary = data[marker.dictionaryKey];
    const boxSize = markerBoxSize(marker);

    card.style.setProperty("--marker-size", `${marker.sizeMm}mm`);
    card.style.setProperty("--quiet-zone", `${marker.quietZoneMm}mm`);
    card.style.setProperty("--box-size", `${boxSize}mm`);
    card.style.left = `${xMm}mm`;
    card.style.top = `${yMm}mm`;
    card.classList.toggle("hide-label", !showLabels);
    card.classList.toggle("show-border", marker.showBorder);
    art.innerHTML = markerSvg(marker.dictionaryKey, marker.markerId);
    label.textContent = `${dictionary.label}\nID ${marker.markerId} / ${marker.sizeMm}mm`;
    label.hidden = !showLabels;
    remove.addEventListener("click", () => {
      markers.splice(index, 1);
      render();
    });
    return fragment;
}

function markerBoxSize(marker) {
  return marker.sizeMm + marker.quietZoneMm * 2;
}

function paginateMarkers(showLabels) {
  const paper = paperSizes[paperSizeInput.value];
  const margin = Number(pageMarginInput.value);
  const gap = Number(markerGapInput.value);
  const contentWidth = paper.width - margin * 2;
  const contentHeight = paper.height - margin * 2;
  const pages = [[]];
  const errors = [];
  let x = margin;
  let y = margin;
  let rowHeight = 0;

  markers.forEach((marker, index) => {
    const boxSize = markerBoxSize(marker);
    const itemWidth = boxSize;
    const itemHeight = boxSize + (showLabels ? labelGapMm + labelHeightMm : 0);

    if (itemWidth > contentWidth || itemHeight > contentHeight) {
      errors.push(
        `ID ${marker.markerId} (${boxSize}mm) は現在の用紙と余白には収まりません。サイズか白余白か用紙余白を小さくしてください。`
      );
      return;
    }

    if (x > margin && x + itemWidth > margin + contentWidth) {
      x = margin;
      y += rowHeight + gap;
      rowHeight = 0;
    }

    if (y > margin && y + itemHeight > margin + contentHeight) {
      pages.push([]);
      x = margin;
      y = margin;
      rowHeight = 0;
    }

    pages[pages.length - 1].push({ marker, index, x, y });
    x += itemWidth + gap;
    rowHeight = Math.max(rowHeight, itemHeight);
  });

  return { pages: pages.filter((page) => page.length > 0 || !markers.length), errors };
}

function updateSheet() {
  const paper = paperSizes[paperSizeInput.value];
  const margin = Number(pageMarginInput.value);
  const gap = Number(markerGapInput.value);

  pagesElement.style.setProperty("--paper-width", `${paper.width}mm`);
  pagesElement.style.setProperty("--paper-height", `${paper.height}mm`);
  sheetFrame.style.setProperty("--paper-width", `${paper.width}mm`);
  sheetFrame.style.setProperty("--paper-height", `${paper.height}mm`);
  document.documentElement.style.setProperty(
    "--print-page-size",
    `${paper.width}mm ${paper.height}mm`
  );
}

function fitSheetToWorkspace(pageCount = pagesElement.children.length || 1) {
  requestAnimationFrame(() => {
    const availableWidth = Math.max(1, workspace.clientWidth - 64);
    const availableHeight = Math.max(1, workspace.clientHeight - 64);
    const firstPage = pagesElement.querySelector(".sheet");
    const sheetWidth = firstPage ? firstPage.offsetWidth : 1;
    const sheetHeight = firstPage ? firstPage.offsetHeight : 1;
    const totalWidth = sheetWidth * pageCount + previewPageGapPx * Math.max(0, pageCount - 1);
    const scale = Math.min(1, availableWidth / sheetWidth, availableHeight / sheetHeight);

    pagesElement.style.setProperty("--sheet-scale", scale.toFixed(4));
    sheetFrame.style.setProperty("--sheet-frame-width", `${totalWidth * scale}px`);
    sheetFrame.style.setProperty("--sheet-frame-height", `${sheetHeight * scale}px`);
  });
}

function addRange() {
  const dictionaryKey = dictionaryInput.value;
  const dictionary = data[dictionaryKey];
  const start = Number(rangeStartInput.value);
  const size = Number(markerSizeInput.value);
  const quietZoneMm = Number(quietZoneInput.value);
  const showBorder = showBordersInput.checked;
  const count = Number(rangeCountInput.value);

  if (!Number.isInteger(start) || start < 0 || start >= dictionary.count) {
    status.textContent = `開始IDは 0 から ${dictionary.count - 1} の範囲で指定してください。`;
    return;
  }

  if (!Number.isInteger(count) || count < 1 || count > 500) {
    status.textContent = "連番の個数は 1 から 500 の範囲で指定してください。";
    return;
  }

  if (!Number.isFinite(size) || size < 5 || size > 200) {
    status.textContent = "サイズは 5mm から 200mm の範囲で指定してください。";
    return;
  }

  if (!Number.isFinite(quietZoneMm) || quietZoneMm < 0 || quietZoneMm > 50) {
    status.textContent = "白余白は 0mm から 50mm の範囲で指定してください。";
    return;
  }

  const end = Math.min(dictionary.count - 1, start + count - 1);
  for (let id = start; id <= end; id += 1) {
    markers.push({ dictionaryKey, markerId: id, sizeMm: size, quietZoneMm, showBorder });
  }
  render();
  status.textContent = `${start} から ${end} まで追加しました。${pagesElement.children.length}ページに配置中です。`;
}

dictionaryInput.addEventListener("change", updateIdLimit);
markerIdInput.addEventListener("input", () => {
  rangeStartInput.value = markerIdInput.value;
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  addMarker(dictionaryInput.value, markerIdInput.value, markerSizeInput.value);
});

[paperSizeInput, pageMarginInput, markerGapInput, showLabelsInput].forEach((input) => {
  input.addEventListener("input", render);
});

fillRangeButton.addEventListener("click", addRange);
clearButton.addEventListener("click", () => {
  markers.splice(0, markers.length);
  render();
});
printButton.addEventListener("click", () => window.print());
window.addEventListener("resize", fitSheetToWorkspace);

setupDictionaries();
updateSheet();
render();
