const DEMO_LOCAL_PATH_BG = "/mnt/data/2102bf65-4be1-40b1-bc80-66403376563c.png";

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const drop = document.getElementById("drop");
  const preview = document.getElementById("preview");
  const removeBtn = document.getElementById("removeBtn");
  const previewBtn = document.getElementById("previewBtn");
  const resetBtn = document.getElementById("reset");
  const downloadLink = document.getElementById("downloadLink");
  const origSizeEl = document.getElementById("origSize");
  const outSizeEl = document.getElementById("outSize");
  const ratioEl = document.getElementById("ratio");
  const formatSelect = document.getElementById("format");
  const keepAlpha = document.getElementById("keepAlpha");
  const loadingOverlay = document.getElementById("loading-overlay");
  let currentFile = null;
  let currentDataUrl = null;
  let lastResultBlobUrl = null;

  function safeShowLoading(flag){
    if(!loadingOverlay) return;
    if(flag){ loadingOverlay.classList.remove('hidden'); loadingOverlay.classList.add('loading'); loadingOverlay.setAttribute('aria-hidden','false'); }
    else { loadingOverlay.classList.add('hidden'); loadingOverlay.classList.remove('loading'); loadingOverlay.setAttribute('aria-hidden','true'); }
  }

  function showToast(message, opts={}) {
    const duration = opts.duration || 2200;
    const type = opts.type || 'info';
    let container = document.getElementById("__prittyme_toast_container");
    if (!container) {
      container = document.createElement("div");
      container.id = "__prittyme_toast_container";
      Object.assign(container.style, {
        position: "fixed",
        right: "16px",
        bottom: "18px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      });
      document.body.appendChild(container);
    }
    const t = document.createElement("div");
    t.textContent = message;
    Object.assign(t.style, {
      padding: "8px 12px",
      borderRadius: "10px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
      fontSize: "13px",
      color: "#fff",
      opacity: "0",
      transform: "translateY(8px)",
      transition: "opacity .24s, transform .24s",
      background: type === 'success' ? "linear-gradient(90deg,#22c1c3,#fdbb2d)" : (type === 'error' ? "linear-gradient(90deg,#f43f5e,#f97316)" : "linear-gradient(90deg,#6366f1,#ec4899)")
    });
    container.appendChild(t);
    requestAnimationFrame(()=>{ t.style.opacity = "1"; t.style.transform = "translateY(0)"; });
    setTimeout(()=>{ t.style.opacity = "0"; t.style.transform = "translateY(8px)"; setTimeout(()=> t.remove(), 260); }, duration);
  }

  function openPopupWithBlob(blobUrl, title='Preview', w=760, h=540) {
    const left = window.screenX + Math.max(0, (window.innerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.innerHeight - h) / 2);
    const specs = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;
    const popup = window.open("", "_blank", specs);
    if (!popup) {
      window.open(blobUrl, "_blank");
      return null;
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>html,body{height:100%;margin:0;background:#0b0b0b;color:#fff;font-family:Inter,system-ui,Arial}
      .wrap{display:flex;flex-direction:column;height:100%}.toolbar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.03)}
      .toolbar button{padding:8px 10px;border-radius:8px;border:none;color:#fff;cursor:pointer;background:linear-gradient(90deg,#6366f1,#ec4899)}
      .imgwrap{flex:1;display:flex;align-items:center;justify-content:center;padding:12px;overflow:auto}img{max-width:100%;max-height:100%;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.6)}</style></head><body>
      <div class="wrap"><div class="toolbar"><div style="font-weight:700">${title}</div><div><button id="saveBtn">Save</button><button id="closeBtn" style="margin-left:8px;background:transparent;border:1px solid rgba(255,255,255,0.08)">Close</button></div></div>
      <div class="imgwrap"><img id="pimg" src="${blobUrl}" alt="${title}"></div></div>
      <script>document.getElementById('closeBtn').addEventListener('click',()=>window.close());
      document.getElementById('saveBtn').addEventListener('click',()=>{ const a=document.createElement('a'); a.href=document.getElementById('pimg').src; a.download='preview'; document.body.appendChild(a); a.click(); a.remove(); });</script></body></html>`;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    return popup;
  }

  function setPreviewFromDataUrl(dataUrl, file) {
    currentDataUrl = dataUrl;
    currentFile = file || null;
    if (!preview) return;
    preview.src = dataUrl;
    preview.style.display = "";
    if (removeBtn) removeBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = false;
    try {
      const b64 = dataUrl.split(",")[1] || "";
      const size = Math.round((b64.length * 3) / 4);
      if (origSizeEl) origSizeEl.textContent = "Original: " + bytesToSize(size);
    } catch (e) {}
  }

  function bytesToSize(bytes) {
    if (!bytes && bytes !== 0) return "—";
    const kb = bytes / 1024;
    if (kb < 1024) return Math.round(kb) + " KB";
    return (kb / 1024).toFixed(2) + " MB";
  }

  if (fileInput) {
    fileInput.addEventListener('change', e=>{
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const fr = new FileReader();
      fr.onload = ()=> setPreviewFromDataUrl(fr.result, f);
      fr.readAsDataURL(f);
    });
  }
  if (drop && fileInput) {
    drop.addEventListener('click', ()=> fileInput.click());
    ['dragenter','dragover'].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.remove('dragover'); }));
    drop.addEventListener('drop', e=>{
      e.preventDefault(); drop.classList.remove('dragover');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) { const fr = new FileReader(); fr.onload = ()=> setPreviewFromDataUrl(fr.result, f); fr.readAsDataURL(f); }
    });
  }

  async function uploadAndRemove(fileOrNull, selectedFormat, imageUrlFallback=null) {
    safeShowLoading(true);
    try {
      const fd = new FormData();
      if (fileOrNull) {
        fd.append('image', fileOrNull, fileOrNull.name || 'input.png');
      } else if (imageUrlFallback) {
        fd.append('image_url', imageUrlFallback);
      }
      fd.append('output', selectedFormat || 'image/png');
      fd.append('keep_alpha', keepAlpha && keepAlpha.checked ? '1' : '0');

      const resp = await fetch('/api/remove-bg', { method: 'POST', body: fd });
      if (!resp.ok) {
        const txt = await resp.text().catch(()=>null);
        throw new Error('Server error: ' + resp.status + ' ' + (txt || resp.statusText));
      }
      const blob = await resp.blob();
      return blob;
    } finally {
      safeShowLoading(false);
    }
  }

  function attachDownloadForBlob(blob) {
    try {
      if (lastResultBlobUrl) { URL.revokeObjectURL(lastResultBlobUrl); lastResultBlobUrl = null; }
    } catch(e){}
    try {
      lastResultBlobUrl = URL.createObjectURL(blob);
      if (downloadLink) {
        downloadLink.style.display = '';
        downloadLink.href = lastResultBlobUrl;
        const ext = (formatSelect && formatSelect.value) ? formatSelect.value.split('/')[1] : 'png';
        downloadLink.download = `result.${ext}`;
        showToast('Download ready', { type: 'success' });
      }
    } catch(e){ console.warn(e); }
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', async ()=>{
      if (!currentDataUrl && !currentFile) {
        try {
          showToast('Preparing demo preview…', { type: 'info' });
          const fmt = (formatSelect && formatSelect.value) ? formatSelect.value : 'image/png';
          const blob = await uploadAndRemove(null, fmt, DEMO_LOCAL_PATH_BG);
          const blobUrl = URL.createObjectURL(blob);
          openPopupWithBlob(blobUrl, 'Preview (demo)', 820, 560);
          attachDownloadForBlob(blob);
          setTimeout(()=> URL.revokeObjectURL(blobUrl), 60*1000);
          return;
        } catch(err) {
          console.error(err);
          showToast('Preview failed', { type:'error' });
          alert('Preview failed (demo). See console.');
          return;
        }
      }

      previewBtn.disabled = true;
      try {
        showToast('Preparing preview…', { type: 'info' });
        const fmt = (formatSelect && formatSelect.value) ? formatSelect.value : 'image/png';
        let blob;
        if (currentFile) {
          blob = await uploadAndRemove(currentFile, fmt, null);
        } else {
          const res = await fetch(currentDataUrl);
          const blobFromData = await res.blob();
          blob = await uploadAndRemove(new File([blobFromData], 'input.png', { type: blobFromData.type }), fmt, null);
        }
        if (!blob) throw new Error('No blob returned');
        const blobUrl = URL.createObjectURL(blob);
        openPopupWithBlob(blobUrl, 'Background removed preview', 820, 560);
        attachDownloadForBlob(blob);
        setTimeout(()=> URL.revokeObjectURL(blobUrl), 60*1000);
      } catch (err) {
        console.error(err);
        showToast('Preview failed', { type:'error' });
        alert('Preview failed. See console.');
      } finally {
        previewBtn.disabled = false;
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', async ()=>{
      if (!currentFile && !currentDataUrl) { alert('Select an image first'); return; }
      removeBtn.disabled = true;
      try {
        showToast('Removing background…', { type:'info' });
        const fmt = (formatSelect && formatSelect.value) ? formatSelect.value : 'image/png';
        let blob;
        if (currentFile) {
          blob = await uploadAndRemove(currentFile, fmt, null);
        } else {
          const res = await fetch(currentDataUrl);
          const blobFromData = await res.blob();
          blob = await uploadAndRemove(new File([blobFromData], 'input.png', { type: blobFromData.type }), fmt, null);
        }
        if (!blob) throw new Error('No result from server');
        // show in main preview
        const blobUrl = URL.createObjectURL(blob);
        preview.src = blobUrl;
        preview.style.display = '';
        attachDownloadForBlob(blob);
      } catch (err) {
        console.error(err);
        showToast('Remove failed', { type:'error' });
        alert('Background removal failed. See console.');
      } finally {
        removeBtn.disabled = false;
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', ()=>{
      currentFile = null;
      currentDataUrl = null;
      if (preview) { preview.src = ""; preview.style.display = "none"; }
      if (downloadLink) { downloadLink.style.display = 'none'; downloadLink.href = ''; }
      if (origSizeEl) origSizeEl.textContent = "Original: —";
      if (outSizeEl) outSizeEl.textContent = "Output: —";
      if (ratioEl) ratioEl.textContent = "Saved: —";
      if (removeBtn) removeBtn.disabled = true;
      resetBtn.disabled = true;
    });
  }

  if (removeBtn) removeBtn.disabled = true;
  if (resetBtn) resetBtn.disabled = true;
  if (downloadLink) downloadLink.style.display = 'none';
});
