
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
            try { URL.revokeObjectURL(lastResultBlobUrl); } catch (e) { }
            lastResultBlobUrl = null;
        }
    }

    function showToast(message, opts = {}) {
        const duration = opts.duration || 2600;
        const type = opts.type || "info";
        let container = document.getElementById("__prittyme_toast_container");
        if (!container) {
            container = document.createElement("div");
            container.id = "__prittyme_toast_container";
            container.style.position = "fixed";
            container.style.right = "16px";
            container.style.bottom = "18px";
            container.style.zIndex = 99999;
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.gap = "8px";
            document.body.appendChild(container);
        }
        const t = document.createElement("div");
        t.textContent = message;
        t.style.padding = "8px 12px";
        t.style.borderRadius = "10px";
        t.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
        t.style.fontSize = "13px";
        t.style.color = "#fff";
        t.style.opacity = "0";
        t.style.transform = "translateY(8px)";
        t.style.transition = "opacity .24s, transform .24s";
        if (type === "success") t.style.background = "linear-gradient(90deg,#22c1c3,#fdbb2d)";
        else if (type === "error") t.style.background = "linear-gradient(90deg,#f43f5e,#f97316)";
        else t.style.background = "linear-gradient(90deg,#6366f1,#ec4899)";
        container.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = "1"; t.style.transform = "translateY(0)"; });
        setTimeout(() => {
            t.style.opacity = "0";
            t.style.transform = "translateY(8px)";
            setTimeout(() => t.remove(), 260);
        }, duration);
    }

    function openPopupWithBlob(blobUrl, title = "Preview", w = 700, h = 520) {
        const left = window.screenX + Math.max(0, (window.innerWidth - w) / 2);
        const top = window.screenY + Math.max(0, (window.innerHeight - h) / 2);
        const specs = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;
        const popup = window.open("", "_blank", specs);
        if (!popup) {
            window.open(blobUrl, "_blank");
            return null;
        }
        const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            html,body{height:100%;margin:0;background:#111;color:#fff;font-family:Inter,system-ui,Arial;}
            .wrap{display:flex;flex-direction:column;height:100%}
            .toolbar{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:rgba(0,0,0,0.12)}
            .toolbar button{background:linear-gradient(90deg,#6366f1,#ec4899);border:none;color:#fff;padding:8px 10px;border-radius:8px;cursor:pointer}
            .imgwrap{flex:1;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto}
            img{max-width:100%;max-height:100%;box-shadow:0 8px 40px rgba(0,0,0,0.6);border-radius:8px}
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="toolbar">
              <div style="font-weight:700">${title}</div>
              <div>
                <button id="saveBtn">Save</button>
                <button id="closeBtn" style="margin-left:8px;background:transparent;border:1px solid rgba(255,255,255,0.08)">Close</button>
              </div>
            </div>
            <div class="imgwrap">
              <img id="pimg" src="${blobUrl}" alt="${title}">
            </div>
          </div>
          <script>
            const pimg = document.getElementById('pimg');
            document.getElementById('closeBtn').addEventListener('click', ()=> window.close());
            document.getElementById('saveBtn').addEventListener('click', ()=>{
              // download shown image
              try {
                const a = document.createElement('a');
                a.href = pimg.src;
                a.download = 'preview';
                document.body.appendChild(a);
                a.click();
                a.remove();
              } catch(e){ console.error(e); }
            });
          </script>
        </body>
      </html>
    `;
        popup.document.open();
        popup.document.write(html);
        popup.document.close();
        return popup;
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
        } catch (e) { }
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
        ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("dragover"); }));
        ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("dragover"); }));
        drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("dragover"); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) { const fr = new FileReader(); fr.onload = () => setPreviewFromDataUrl(fr.result); fr.readAsDataURL(f); } });
    }

    if (downloadLink) {
        downloadLink.addEventListener("click", (e) => {
            if (lastResultBlobUrl) e.currentTarget.href = lastResultBlobUrl;
            else if (lastResultDataUrl) e.currentTarget.href = lastResultDataUrl;
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            currentDataUrl = null;
            lastResultDataUrl = null;
            cleanupLastBlob();
            if (previewImg) { previewImg.src = ""; previewImg.style.display = "none"; }
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
        let w = img.width, h = img.height;
        if (maxWidth && Number(maxWidth) > 0 && Number(maxWidth) < w) {
            const ratio = Number(maxWidth) / w;
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!keepAlphaFlag && outMime === "image/jpeg") {
            ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, w, h);
        const q = Math.min(1, Math.max(0.01, Number(quality || 82) / 100));
        const resultDataUrl = canvas.toDataURL(outMime, q);
        return resultDataUrl;
    }

    if (qualityRange && qualityVal) {
        qualityVal.textContent = qualityRange.value;
        qualityRange.addEventListener("input", () => qualityVal.textContent = qualityRange.value);
    }

    if (compressBtn) {
        compressBtn.addEventListener("click", async () => {
            if (!currentDataUrl && (!previewImg || !previewImg.src)) {
                if (confirm("No image selected. Use demo image?")) {
                    try {
                        const r = await fetch(DEMO_LOCAL_PATH);
                        const blob = await r.blob();
                        const fr = new FileReader();
                        fr.onload = () => setPreviewFromDataUrl(fr.result);
                        fr.readAsDataURL(blob);
                    } catch (e) {
                        window.open(DEMO_LOCAL_PATH, "_blank");
                        return;
                    }
                } else return;
            }

            const payloadDataUrl = currentDataUrl || (previewImg && previewImg.src) || null;
            if (!payloadDataUrl) { alert("Select an image first"); return; }

            let outMime = formatSelect && formatSelect.value ? formatSelect.value : "auto";
            if (outMime === "auto") outMime = payloadDataUrl.startsWith("data:image/") ? payloadDataUrl.split(";")[0].slice(5) : "image/jpeg";
            const quality = qualityRange ? Number(qualityRange.value) : 82;
            const maxWidth = widthEl ? Number(widthEl.value) || 0 : 0;
            const keepAlphaFlag = !!(keepAlpha && keepAlpha.checked);
            if (outMime === "image/png" && !keepAlphaFlag) outMime = "image/jpeg";

            safeShowLoading(true);
            compressBtn.disabled = true;

            try {
                const resultDataUrl = await compressDataUrl(payloadDataUrl, outMime, quality, maxWidth, keepAlphaFlag);
                lastResultDataUrl = resultDataUrl;
                if (previewImg) { previewImg.src = resultDataUrl; previewImg.style.display = ""; }

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
                        } else { if (ratioEl) ratioEl.textContent = "Saved: —"; }
                    }
                } catch (e) { console.warn("Failed to compute sizes:", e); }

                cleanupLastBlob();
                try {
                    const res = await fetch(resultDataUrl);
                    const blob = await res.blob();
                    lastResultBlobUrl = URL.createObjectURL(blob);
                    if (downloadLink) {
                        downloadLink.style.display = "";
                        downloadLink.href = lastResultBlobUrl;
                        const ext = outMime.split("/")[1] || "png";
                        downloadLink.download = (keepAlphaFlag && outMime === "image/png") ? "compressed.png" : `compressed.${ext}`;
                        showToast("Download ready", { type: "success" });
                    }
                } catch (e) {
                    if (downloadLink) {
                        downloadLink.style.display = "";
                        downloadLink.href = lastResultDataUrl;
                        downloadLink.download = (keepAlphaFlag && outMime === "image/png") ? "compressed.png" : "compressed.jpg";
                        showToast("Download ready", { type: "success" });
                    }
                }
            } catch (err) {
                console.error(err);
                showToast("Compression failed", { type: "error" });
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
            if (!payloadDataUrl) { alert("No image to preview."); return; }

            let outMime = formatSelect && formatSelect.value ? formatSelect.value : "auto";
            if (outMime === "auto") outMime = payloadDataUrl.startsWith("data:image/") ? payloadDataUrl.split(";")[0].slice(5) : "image/jpeg";
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
                openPopupWithBlob(url, "Compressed preview", 800, 560);
                showToast("Preview opened", { type: "info" });
                setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
            } catch (e) {
                console.error("Preview error:", e);
                showToast("Preview failed", { type: "error" });
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
