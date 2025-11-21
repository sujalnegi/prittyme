const DEMO_LOCAL_PATH = "/mnt/data/2102bf65-4be1-40b1-bc80-66403376563c.png";

document.addEventListener("DOMContentLoaded", () => {
  
  const fileInput = document.getElementById("fileInput");
  const drop = document.getElementById("drop");
  const previewImg = document.getElementById("preview");
  const downloadLink = document.getElementById("downloadLink");
  const origSizeEl = document.getElementById("origSize");
  const outSizeEl = document.getElementById("outSize");
  const ratioEl = document.getElementById("ratio");
  const compressBtn = document.getElementById("compressBtn");
  const previewBtn = document.getElementById("previewBtn");
  const resetBtn = document.getElementById("reset");
  const keepAlpha = document.getElementById("keepAlpha");
  const formatSelect = document.getElementById("format");
  const qualityRange = document.getElementById("quality");
  const qualityVal = document.getElementById("qualityVal");
  const widthEl = document.getElementById("width");
  const loading = document.getElementById("loading-overlay");

  let currentDataUrl = null;
  let lastResultDataUrl = null; 
  let lastResultBlobUrl = null; 

  function safeShowLoading(flag) {
    if (!loading) return;
    if (flag) {
      loading.classList.remove("hidden");
      loading.classList.add("loading");
      loading.setAttribute("aria-hidden", "false");
    } else {
      loading.classList.remove("loading");
      loading.classList.add("hidden");
      loading.setAttribute("aria-hidden", "true");
    }
  }

  function bytesToSize(bytes) {
    if (!bytes && bytes !== 0) return "—";
    const kb = bytes / 1024;
    if (kb < 1024) return Math.round(kb) + " KB";
    return (kb / 1024).toFixed(2) + " MB";
  }

  function cleanupLastBlob() {
    if (lastResultBlobUrl) {
      URL.revokeObjectURL(lastResultBlobUrl);
      lastResultBlobUrl = null;
    }
  }

  function setPreviewFromDataUrl(dataUrl) {
    currentDataUrl = dataUrl;
    if (!previewImg) return;
    previewImg.src = dataUrl;
    previewImg.style.display = "";
    if (downloadLink) downloadLink.style.display = "none";
    if (compressBtn) compressBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = false;
    try {
      const b64 = dataUrl.split(",")[1] || "";
      const size = Math.round((b64.length * 3) / 4);
      if (origSizeEl) origSizeEl.textContent = "Original: " + bytesToSize(size);
    } catch (e) {
      
    }
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = () => setPreviewFromDataUrl(fr.result);
      fr.readAsDataURL(f);
    });
  }

  if (drop && fileInput) {
    drop.addEventListener("click", () => fileInput.click());
    ["dragenter", "dragover"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("dragover");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("dragover");
      })
    );
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      drop.classList.remove("dragover");
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) {
        const fr = new FileReader();
        fr.onload = () => setPreviewFromDataUrl(fr.result);
        fr.readAsDataURL(f);
      }
    });
  }

  if (downloadLink) {
    downloadLink.addEventListener("click", (e) => {
      if (lastResultBlobUrl) {
        e.currentTarget.href = lastResultBlobUrl;
      } else if (lastResultDataUrl) {
        e.currentTarget.href = lastResultDataUrl;
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      currentDataUrl = null;
      lastResultDataUrl = null;
      cleanupLastBlob();
      if (previewImg) {
        previewImg.src = "";
        previewImg.style.display = "none";
      }
      if (downloadLink) downloadLink.style.display = "none";
      if (origSizeEl) origSizeEl.textContent = "Original: —";
      if (outSizeEl) outSizeEl.textContent = "Output: —";
      if (ratioEl) ratioEl.textContent = "Saved: —";
      if (compressBtn) compressBtn.disabled = true;
      resetBtn.disabled = true;
    });
  }

  function createImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load error"));
      img.src = dataUrl;
    });
  }

  async function compressDataUrl(dataUrl, outMime, quality, maxWidth, keepAlphaFlag) {
    const img = await createImage(dataUrl);
    let w = img.width;
    let h = img.height;

    if (maxWidth && Number(maxWidth) > 0 && Number(maxWidth) < w) {
      const ratio = Number(maxWidth) / w;
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    if (!keepAlphaFlag && outMime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, w, h);

    const q = Math.min(1, Math.max(0.01, Number(quality || 82) / 100));
    const resultDataUrl = canvas.toDataURL(outMime, q);
    return resultDataUrl;
  }

  if (qualityRange && qualityVal) {
    qualityVal.textContent = qualityRange.value;
    qualityRange.addEventListener("input", () => {
      qualityVal.textContent = qualityRange.value;
    });
  }

  if (compressBtn) {
    compressBtn.addEventListener("click", async () => {
      if (!currentDataUrl && (!previewImg || !previewImg.src)) {
        if (confirm("No image selected. Use demo image?")) {
          const demoDataUrl = await (async () => {
            try {
              const res = await fetch(DEMO_LOCAL_PATH);
              const blob = await res.blob();
              return await (new Promise((res2) => {
                const fr = new FileReader();
                fr.onload = () => res2(fr.result);
                fr.readAsDataURL(blob);
              }));
            } catch (e) {
              window.open(DEMO_LOCAL_PATH, "_blank");
              return null;
            }
          })();
          if (demoDataUrl) setPreviewFromDataUrl(demoDataUrl);
          if (!currentDataUrl) return;
        } else return;
      }

      const payloadDataUrl = currentDataUrl || (previewImg && previewImg.src) || null;
      if (!payloadDataUrl) {
        alert("Select an image first");
        return;
      }

      let outMime = formatSelect && formatSelect.value ? formatSelect.value : "auto";
      if (outMime === "auto") {
        outMime = payloadDataUrl.startsWith("data:image/") ? payloadDataUrl.split(";")[0].slice(5) : "image/jpeg";
      }

      const quality = qualityRange ? Number(qualityRange.value) : 82;
      const maxWidth = widthEl ? Number(widthEl.value) || 0 : 0;
      const keepAlphaFlag = !!(keepAlpha && keepAlpha.checked);

      if (outMime === "image/png" && !keepAlphaFlag) {
        outMime = "image/jpeg";
      }

      safeShowLoading(true);
      compressBtn.disabled = true;

      try {
        const resultDataUrl = await compressDataUrl(payloadDataUrl, outMime, quality, maxWidth, keepAlphaFlag);
        lastResultDataUrl = resultDataUrl;

        if (previewImg) {
          previewImg.src = resultDataUrl;
          previewImg.style.display = "";
        }

        try {
          const b64 = (resultDataUrl.split(",")[1] || "");
          const outBytes = Math.round((b64.length * 3) / 4);
          if (outSizeEl) outSizeEl.textContent = "Output: " + bytesToSize(outBytes);

          const origText = origSizeEl && origSizeEl.textContent ? origSizeEl.textContent : "";
          if (origText && origText.startsWith("Original:")) {
            const val = origText.replace("Original:", "").trim();
            let origBytes = null;
            if (val.endsWith("MB")) origBytes = parseFloat(val) * 1024 * 1024;
            else if (val.endsWith("KB")) origBytes = parseFloat(val) * 1024;
            else if (val.endsWith("B")) origBytes = parseFloat(val);

            if (origBytes && origBytes > 0) {
              const savedPercent = Math.round((1 - outBytes / origBytes) * 100);
              if (ratioEl) ratioEl.textContent = "Saved: " + (savedPercent >= 0 ? savedPercent + "%" : "0%");
            } else {
              if (ratioEl) ratioEl.textContent = "Saved: —";
            }
          }
        } catch (e) {
          console.warn("Failed to compute sizes:", e);
        }

        cleanupLastBlob();
        try {
          const res = await fetch(resultDataUrl);
          const blob = await res.blob();
          lastResultBlobUrl = URL.createObjectURL(blob);
          if (downloadLink) {
            downloadLink.style.display = "";
            downloadLink.href = lastResultBlobUrl;
            const ext = outMime.split("/")[1] || "png";
            downloadLink.download = (keepAlphaFlag && outMime === "image/png") ? "compressed.png" : "compressed." + ext;
          }
        } catch (e) {
          if (downloadLink) {
            downloadLink.style.display = "";
            downloadLink.href = lastResultDataUrl;
            downloadLink.download = (keepAlphaFlag && outMime === "image/png") ? "compressed.png" : "compressed.jpg";
          }
        }
      } catch (err) {
        console.error(err);
        alert("Compression failed: " + (err && err.message ? err.message : err));
      } finally {
        compressBtn.disabled = false;
        safeShowLoading(false);
      }
    });
  }

  if (previewBtn) {
    previewBtn.addEventListener("click", async () => {
      if (!currentDataUrl && (!previewImg || !previewImg.src)) {
        window.open(DEMO_LOCAL_PATH, "_blank");
        return;
      }

      const payloadDataUrl = currentDataUrl || (previewImg && previewImg.src) || null;
      if (!payloadDataUrl) {
        alert("No image to preview.");
        return;
      }

      let outMime = formatSelect && formatSelect.value ? formatSelect.value : "auto";
      if (outMime === "auto") {
        outMime = payloadDataUrl.startsWith("data:image/") ? payloadDataUrl.split(";")[0].slice(5) : "image/jpeg";
      }

      const quality = qualityRange ? Number(qualityRange.value) : 82;
      const maxWidth = widthEl ? Number(widthEl.value) || 0 : 0;
      const keepAlphaFlag = !!(keepAlpha && keepAlpha.checked);
      if (outMime === "image/png" && !keepAlphaFlag) outMime = "image/jpeg";

      safeShowLoading(true);
      previewBtn.disabled = true;
      try {
        const previewDataUrl = await compressDataUrl(payloadDataUrl, outMime, quality, maxWidth, keepAlphaFlag);
        const resp = await fetch(previewDataUrl);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
      } catch (e) {
        console.error("Preview error:", e);
        alert("Preview failed. See console.");
      } finally {
        safeShowLoading(false);
        previewBtn.disabled = false;
      }
    });
  }

  if (compressBtn) compressBtn.disabled = true;
  if (resetBtn) resetBtn.disabled = true;
  if (downloadLink) downloadLink.style.display = "none";
});
