const fileInput = document.getElementById('fileInput');
const drop = document.getElementById('drop');
const previewImg = document.getElementById('preview');
const downloadLink = document.getElementById('downloadLink');
const origSizeEl = document.getElementById('origSize');
const outSizeEl = document.getElementById('outSize');
const ratioEl = document.getElementById('ratio');
const formatEl = document.getElementById('format');
const qualityEl = document.getElementById('quality');
const qualityVal = document.getElementById('qualityVal');
const widthEl = document.getElementById('width');
const heightEl = document.getElementById('height');
const scaleEl = document.getElementById('scale');
const scaleVal = document.getElementById('scaleVal');
const lockRatioEl = document.getElementById('lockRatio');
const resizeBtn = document.getElementById('resizeBtn');
const previewBtn = document.getElementById('previewBtn');
const previewInfo = document.getElementById('previewInfo');
const resetBtn = document.getElementById('reset');

let originalImage = new Image();
let originalBlob = null;
let naturalW = 0;
let naturalH = 0;

function bytesToSize(bytes) {
  if (!bytes) return '—';
  const sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes)/Math.log(1024));
  return (bytes/Math.pow(1024,i)).toFixed(2) + ' ' + sizes[i];
}

function setOrigInfo(blob) {
  originalBlob = blob;
  origSizeEl.textContent = 'Original: ' + bytesToSize(blob.size);
}

function onFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  originalImage = new Image();
  originalImage.onload = function() {
    naturalW = originalImage.naturalWidth;
    naturalH = originalImage.naturalHeight;
    previewImg.src = url;
    previewImg.style.display = 'block';
    setOrigInfo(file);
    previewInfo.textContent = `${naturalW} × ${naturalH}px`;
    widthEl.value = naturalW;
    heightEl.value = naturalH;
    scaleEl.value = 100;
    scaleVal.textContent = '100';
    downloadLink.style.display = 'none';
    outSizeEl.textContent = 'Output: —';
    ratioEl.textContent = 'Saved: —';
  };
  originalImage.src = url;
}

fileInput.addEventListener('change', e => onFile(e.target.files[0]));

drop.addEventListener('dragover', e => {
  e.preventDefault();
  drop.classList.add('dragover');
});
drop.addEventListener('dragleave', e => {
  drop.classList.remove('dragover');
});
drop.addEventListener('drop', e => {
  e.preventDefault();
  drop.classList.remove('dragover');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) fileInput.files = e.dataTransfer.files;
  onFile(f);
});
drop.addEventListener('click', () => fileInput.click());

qualityEl.addEventListener('input', () => qualityVal.textContent = qualityEl.value);
scaleEl.addEventListener('input', () => {
  scaleVal.textContent = scaleEl.value;
  if (originalImage && originalImage.naturalWidth) {
    const s = parseInt(scaleEl.value,10)/100;
    const nw = Math.round(naturalW * s);
    const nh = Math.round(naturalH * s);
    widthEl.value = nw;
    heightEl.value = nh;
    previewInfo.textContent = `${nw} × ${nh}px`;
  }
});

widthEl.addEventListener('input', () => {
  if (lockRatioEl.checked && naturalW && naturalH) {
    const newW = parseInt(widthEl.value,10) || 0;
    const newH = Math.round(newW * naturalH / naturalW) || 0;
    heightEl.value = newH;
    previewInfo.textContent = `${newW} × ${newH}px`;
    const s = Math.round((newW / naturalW) * 100);
    scaleEl.value = s;
    scaleVal.textContent = s;
  } else {
    previewInfo.textContent = `${widthEl.value || '—'} × ${heightEl.value || '—'}px`;
  }
});

heightEl.addEventListener('input', () => {
  if (lockRatioEl.checked && naturalW && naturalH) {
    const newH = parseInt(heightEl.value,10) || 0;
    const newW = Math.round(newH * naturalW / naturalH) || 0;
    widthEl.value = newW;
    previewInfo.textContent = `${newW} × ${newH}px`;
    const s = Math.round((newW / naturalW) * 100);
    scaleEl.value = s;
    scaleVal.textContent = s;
  } else {
    previewInfo.textContent = `${widthEl.value || '—'} × ${heightEl.value || '—'}px`;
  }
});

function doResize(emitDownload=true) {
  if (!originalImage || !originalImage.src) return;
  const targetFormat = formatEl.value === 'auto' ? getMimeFromSrc(originalImage.src) : formatEl.value;
  let w = parseInt(widthEl.value,10) || 0;
  let h = parseInt(heightEl.value,10) || 0;
  if (!w && !h) {
    w = naturalW;
    h = naturalH;
  } else if (w && !h) {
    h = Math.round(w * naturalH / naturalW);
  } else if (!w && h) {
    w = Math.round(h * naturalW / naturalH);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(originalImage, 0, 0, w, h);
  const mime = targetFormat || 'image/png';
  const q = Math.max(0.01, Math.min(1, parseInt(qualityEl.value,10) / 100));
  canvas.toBlob(function(blob) {
    if (!blob) return;
    outSizeEl.textContent = 'Output: ' + bytesToSize(blob.size);
    const saved = originalBlob ? Math.max(0, originalBlob.size - blob.size) : 0;
    ratioEl.textContent = 'Saved: ' + bytesToSize(saved);
    const url = URL.createObjectURL(blob);
    previewImg.src = url;
    previewImg.style.display = 'block';
    downloadLink.style.display = 'inline-flex';
    downloadLink.href = url;
    const ext = mimeToExt(mime);
    downloadLink.download = 'resized' + ext;
    if (emitDownload) {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resized' + ext;
    }
  }, mime, mime === 'image/png' ? undefined : q);
}

function getMimeFromSrc(src) {
  if (!src) return 'image/png';
  const s = src.toLowerCase();
  if (s.includes('.png')) return 'image/png';
  if (s.includes('.jpg') || s.includes('.jpeg')) return 'image/jpeg';
  if (s.includes('.webp')) return 'image/webp';
  return 'image/png';
}

function mimeToExt(mime) {
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/png') return '.png';
  return '.png';
}

resizeBtn.addEventListener('click', () => doResize(true));
previewBtn.addEventListener('click', () => doResize(false));
resetBtn.addEventListener('click', () => {
  previewImg.src = '';
  previewImg.style.display = 'none';
  downloadLink.style.display = 'none';
  origSizeEl.textContent = 'Original: —';
  outSizeEl.textContent = 'Output: —';
  ratioEl.textContent = 'Saved: —';
  widthEl.value = '';
  heightEl.value = '';
  scaleEl.value = 100;
  scaleVal.textContent = '100';
  qualityEl.value = 90;
  qualityVal.textContent = '90';
  previewInfo.textContent = '';
  originalImage = new Image();
  originalBlob = null;
});

document.addEventListener('paste', e => {
  const item = (e.clipboardData || e.originalEvent.clipboardData).items[0];
  if (item && item.kind === 'file') {
    const f = item.getAsFile();
    fileInput.files = new DataTransfer().files;
    const dt = new DataTransfer();
    dt.items.add(f);
    fileInput.files = dt.files;
    onFile(f);
  }
});

function onFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  originalImage = new Image();
  originalImage.onload = function() {
    naturalW = originalImage.naturalWidth;
    naturalH = originalImage.naturalHeight;
    previewImg.src = url;
    previewImg.style.display = 'block';
    setOrigInfo(file);
    previewInfo.textContent = `${naturalW} × ${naturalH}px`;
    widthEl.value = naturalW;
    heightEl.value = naturalH;
    scaleEl.value = 100;
    scaleVal.textContent = '100';
    downloadLink.style.display = 'none';
    outSizeEl.textContent = 'Output: —';
    ratioEl.textContent = 'Saved: —';
  };
  originalImage.src = url;
}
