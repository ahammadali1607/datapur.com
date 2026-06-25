// js/app.js
// ============================================================
// DataPur — Full PDF & Image Toolkit  (v2.0)
// 22 tools: compress, merge, split, rotate, resize, crop,
// repair, protect, unlock, watermark, sign, translate,
// word→pdf, excel→pdf, ppt→pdf, pdf→word, pdf→excel,
// pdf→ppt, pdf→jpg, jpg→pdf, compress-image, resize-image
// ============================================================

'use strict';

/* ── shared state ──────────────────────────────────────────── */
const AppState = {
    files        : [],
    processedBlob: null,
    currentTool  : null,
    rotationDeg  : 0,
    downloadName : '',
    originalSize : 0,
    newSize      : 0,
    sigCanvas    : null,
    sigCtx       : null,
    sigDrawing   : false,
    sigLastX     : 0,
    sigLastY     : 0,
};

/* ── PDF.js worker ─────────────────────────────────────────── */
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ============================================================
   Navigation / scroll
   ============================================================ */
window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
});

document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('navMenu')?.classList.toggle('active');
});

/* ── counter animation ──────────────────────────────────────── */
function animateCounters () {
    document.querySelectorAll('.stat-number').forEach(el => {
        const target = +el.dataset.count;
        const dur    = 2000;
        const step   = target / (dur / 16);
        let cur = 0;
        const tmr = setInterval(() => {
            cur += step;
            if (cur >= target) { el.textContent = target; clearInterval(tmr); }
            else el.textContent = Math.floor(cur);
        }, 16);
    });
}
const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    new IntersectionObserver((entries, obs) => {
        entries.forEach(e => { if (e.isIntersecting) { animateCounters(); obs.unobserve(e.target); } });
    }, { threshold: 0.5 }).observe(heroStats);
}

/* ── scroll animations ──────────────────────────────────────── */
function initScrollAnimations () {
    const items = document.querySelectorAll('.tool-card, .feature-card, .step-card');
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; obs.unobserve(e.target); }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el, i) => {
        el.style.opacity = '0'; el.style.transform = 'translateY(28px)';
        el.style.transition = `opacity .5s ease ${i * 0.04}s, transform .5s ease ${i * 0.04}s`;
        obs.observe(el);
    });
}
document.addEventListener('DOMContentLoaded', initScrollAnimations);

/* ── category filter ────────────────────────────────────────── */
function filterTools (cat, btn) {
    document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tool-card').forEach(c => {
        if (cat === 'all' || c.dataset.cat === cat) c.classList.remove('hidden');
        else c.classList.add('hidden');
    });
}

/* ============================================================
   Tool definitions
   ============================================================ */
const TOOLS = {
    'merge'        : { name: 'Merge PDF',          icon: 'fas fa-layer-group',     color: '#6C5CE7', accept: '.pdf',          multiple: true,  desc: 'Combine multiple PDF files into one document' },
    'split'        : { name: 'Split PDF',           icon: 'fas fa-cut',             color: '#00CEC9', accept: '.pdf',          multiple: false, desc: 'Extract specific pages or split PDF into parts' },
    'compress'     : { name: 'Compress PDF',        icon: 'fas fa-compress-arrows-alt', color: '#E17055', accept: '.pdf',      multiple: false, desc: 'Reduce PDF size up to 99% with quality slider' },
    'compress-image': { name: 'Compress Image',    icon: 'fas fa-file-image',      color: '#E84393', accept: 'image/*',       multiple: true,  desc: 'Compress JPG/PNG/WebP images with precise control' },
    'resize-pdf'   : { name: 'Resize PDF',          icon: 'fas fa-expand-arrows-alt', color: '#0984E3', accept: '.pdf',       multiple: false, desc: 'Resize PDF to an exact file size (KB/MB)' },
    'resize-image' : { name: 'Resize Image',        icon: 'fas fa-crop-alt',        color: '#00B894', accept: 'image/*',      multiple: true,  desc: 'Resize images by dimensions, % or target file size' },
    'rotate'       : { name: 'Rotate PDF',          icon: 'fas fa-sync-alt',        color: '#1ABC9C', accept: '.pdf',         multiple: false, desc: 'Rotate all PDF pages to the angle you need' },
    'protect'      : { name: 'Protect PDF',         icon: 'fas fa-shield-alt',      color: '#3498DB', accept: '.pdf',         multiple: false, desc: 'Password-protect your PDF file' },
    'unlock'       : { name: 'Unlock PDF',          icon: 'fas fa-unlock',          color: '#2ECC71', accept: '.pdf',         multiple: false, desc: 'Remove password protection from PDF' },
    'watermark'    : { name: 'Watermark PDF',       icon: 'fas fa-tint',            color: '#9B59B6', accept: '.pdf',         multiple: false, desc: 'Stamp custom text watermark on every page' },
    'pdf-to-word'  : { name: 'PDF to Word',         icon: 'fas fa-file-word',       color: '#2980B9', accept: '.pdf',         multiple: false, desc: 'Convert PDF text to editable Word document' },
    'pdf-to-excel' : { name: 'PDF to Excel',        icon: 'fas fa-file-excel',      color: '#27AE60', accept: '.pdf',         multiple: false, desc: 'Extract PDF data into Excel/CSV format' },
    'pdf-to-ppt'   : { name: 'PDF to PPT',          icon: 'fas fa-file-powerpoint', color: '#E67E22', accept: '.pdf',         multiple: false, desc: 'Convert PDF to PowerPoint presentation' },
    'pdf-to-jpg'   : { name: 'PDF to JPG',          icon: 'fas fa-images',          color: '#8E44AD', accept: '.pdf',         multiple: false, desc: 'Render every PDF page as a JPG image' },
    'jpg-to-pdf'   : { name: 'JPG to PDF',          icon: 'fas fa-image',           color: '#F39C12', accept: 'image/*',      multiple: true,  desc: 'Combine images into a PDF document' },
    'crop-pdf'     : { name: 'Crop PDF',            icon: 'fas fa-crop',            color: '#E74C3C', accept: '.pdf',         multiple: false, desc: 'Crop PDF pages — remove margins or trim borders' },
    'repair-pdf'   : { name: 'Repair PDF',          icon: 'fas fa-tools',           color: '#7F8C8D', accept: '.pdf',         multiple: false, desc: 'Attempt to fix corrupted or damaged PDF files' },
    'sign-pdf'     : { name: 'Sign PDF',            icon: 'fas fa-signature',       color: '#2C3E50', accept: '.pdf',         multiple: false, desc: 'Draw, type or upload a signature and place it on your PDF' },
    'translate-pdf': { name: 'Translate PDF',       icon: 'fas fa-language',        color: '#16A085', accept: '.pdf',         multiple: false, desc: 'Extract and translate PDF text to 50+ languages' },
    'word-to-pdf'  : { name: 'Word to PDF',         icon: 'fas fa-file-word',       color: '#2E86C1', accept: '.doc,.docx,.txt', multiple: false, desc: 'Convert Word / text documents to PDF' },
    'excel-to-pdf' : { name: 'Excel to PDF',        icon: 'fas fa-file-excel',      color: '#1E8449', accept: '.csv,.xlsx,.xls,.txt', multiple: false, desc: 'Convert Excel / CSV spreadsheets to PDF' },
    'ppt-to-pdf'   : { name: 'PPT to PDF',          icon: 'fas fa-file-powerpoint', color: '#BA4A00', accept: '.ppt,.pptx,.txt', multiple: false, desc: 'Convert PowerPoint presentations to PDF' },
};

/* ============================================================
   Navigate to a tool
   ============================================================ */
function navigateTo (toolId) {
    const tool = TOOLS[toolId];
    if (!tool) return;
    AppState.currentTool  = toolId;
    AppState.files        = [];
    AppState.processedBlob= null;
    AppState.rotationDeg  = 0;
    AppState.sigCanvas    = null;
    AppState.sigCtx       = null;

    const overlay = document.getElementById('toolPageOverlay');
    const page    = document.getElementById('toolPage');
    page.innerHTML = buildToolPage(toolId, tool);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    initToolPage(toolId, tool);
    overlay.scrollTo(0, 0);
}

function closeTool () {
    document.getElementById('toolPageOverlay').classList.remove('active');
    document.body.style.overflow = '';
    AppState.files = [];
    AppState.processedBlob = null;
}

/* ============================================================
   Build tool-page HTML
   ============================================================ */
function buildToolPage (toolId, tool) {
    return `
    <div class="tool-header">
      <div class="tool-header-inner">
        <div class="tool-header-left">
          <button class="btn-back" onclick="closeTool()"><i class="fas fa-arrow-left"></i></button>
          <div class="tool-header-title">
            <div class="tool-badge" style="background:${tool.color}"><i class="${tool.icon}"></i></div>
            <div>
              <h2>${tool.name}</h2>
              <p>${tool.desc}</p>
            </div>
          </div>
        </div>
        <a href="index.html" class="logo" onclick="closeTool()">
          <div class="logo-icon"><i class="fas fa-database"></i></div>
          <span class="logo-text">Data<span class="logo-highlight">Pur</span></span>
        </a>
      </div>
    </div>
    <div class="tool-content" id="toolContentArea">
      <div id="uploadArea">
        <div class="upload-zone" id="uploadZone">
          <div class="upload-zone-icon" style="background:linear-gradient(135deg,${tool.color},${lighten(tool.color,45)})">
            <i class="${tool.icon}"></i>
          </div>
          <h3>Drop your file${tool.multiple ? 's' : ''} here</h3>
          <p>or click to browse from your device</p>
          <button class="btn-select" style="background:linear-gradient(135deg,${tool.color},${lighten(tool.color,35)})">
            <i class="fas fa-folder-open"></i> Select File${tool.multiple ? 's' : ''}
          </button>
          <div class="upload-formats">${acceptLabels(tool.accept)}</div>
          <input type="file" id="fileInput" accept="${tool.accept}" ${tool.multiple ? 'multiple' : ''}>
        </div>
        <div class="file-list" id="fileList" style="display:none"></div>
        ${buildToolOptions(toolId, tool)}
        <button class="btn-process" id="btnProcess"
          style="background:linear-gradient(135deg,${tool.color},${lighten(tool.color,30)});display:none"
          onclick="processFiles('${toolId}')">
          <i class="${tool.icon}"></i> ${tool.name}
        </button>
        <div class="progress-container" id="progressContainer" style="display:none">
          <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
          <p class="progress-text" id="progressText">Processing…</p>
        </div>
      </div>
      <div id="downloadArea" style="display:none"></div>
    </div>`;
}

function acceptLabels (accept) {
    return accept.split(',').map(a => `<span>${a.trim().replace('image/*','Images').replace('.','').toUpperCase()}</span>`).join('');
}

/* ============================================================
   Tool-specific options panels
   ============================================================ */
function buildToolOptions (toolId, tool) {
    const wrap = (inner) => `<div class="tool-options" id="toolOptions" style="display:none">${inner}</div>`;

    /* ── compress PDF ─────────────────────────────────────── */
    if (toolId === 'compress') return wrap(`
        <h4><i class="fas fa-sliders-h"></i> Compression Quality</h4>
        <div class="quality-slider-container">
          <div class="quality-slider-header">
            <span>Smallest file</span>
            <div class="quality-value" id="qualityValue" style="color:${tool.color}">50%</div>
            <span>Best quality</span>
          </div>
          <input type="range" class="quality-slider" id="qualitySlider" min="1" max="100" value="50"
            style="background:linear-gradient(90deg,#e74c3c 0%,#f39c12 50%,#2ecc71 100%)"
            oninput="updateCompressPreview()">
          <div class="quality-labels"><span>1%</span><span>50%</span><span>100%</span></div>
        </div>
        <div class="size-preview" id="sizePreview" style="display:none">
          <div class="size-card original">
            <div class="size-label">Original</div>
            <div class="size-value" id="origSizeDisplay">—</div>
          </div>
          <div class="size-arrow"><i class="fas fa-arrow-right"></i></div>
          <div class="size-card result">
            <div class="size-label">Estimated</div>
            <div class="size-value" id="estSizeDisplay">—</div>
            <div class="reduction-badge" id="reductionBadge">—</div>
          </div>
        </div>
        <div class="info-box"><i class="fas fa-info-circle"></i>
          <p>Lower quality = smaller file. PDF pages are re-rendered at the chosen quality level. 50% gives a good balance.</p>
        </div>`);

    /* ── compress image ───────────────────────────────────── */
    if (toolId === 'compress-image') return wrap(`
        <h4><i class="fas fa-sliders-h"></i> Image Compression</h4>
        <div class="quality-slider-container">
          <div class="quality-slider-header">
            <span>Smallest file</span>
            <div class="quality-value" id="imgQualityValue" style="color:${tool.color}">60%</div>
            <span>Best quality</span>
          </div>
          <input type="range" class="quality-slider" id="imgQualitySlider" min="1" max="100" value="60"
            style="background:linear-gradient(90deg,#E84393 0%,#f39c12 50%,#2ecc71 100%)"
            oninput="updateImgCompressPreview()">
        </div>
        <div class="option-group">
          <label>Output Format</label>
          <select id="imgOutputFormat">
            <option value="jpeg">JPEG — smallest size, best for photos</option>
            <option value="webp">WebP — modern, great quality/size ratio</option>
            <option value="png">PNG — lossless, larger size</option>
          </select>
        </div>
        <div class="option-group">
          <label>Max Width px (0 = keep original)</label>
          <input type="number" id="imgMaxWidth" value="0" min="0" placeholder="e.g. 1920">
        </div>
        <div class="size-preview" id="imgSizePreview" style="display:none">
          <div class="size-card original">
            <div class="size-label">Original</div>
            <div class="size-value" id="imgOrigSize">—</div>
          </div>
          <div class="size-arrow"><i class="fas fa-arrow-right"></i></div>
          <div class="size-card result">
            <div class="size-label">Estimated</div>
            <div class="size-value" id="imgNewSize">—</div>
            <div class="reduction-badge" id="imgReduction">—</div>
          </div>
        </div>`);

    /* ── resize PDF ───────────────────────────────────────── */
    if (toolId === 'resize-pdf') return wrap(`
        <h4><i class="fas fa-expand-arrows-alt"></i> Target File Size</h4>
        <div class="option-radio-group" style="margin-bottom:20px">
          <label class="radio-card selected" onclick="selectRadio(this,'resizeMode','reduce')">
            <input type="radio" name="resizeMode" value="reduce" checked>
            <i class="fas fa-compress"></i><span>Reduce</span>
          </label>
          <label class="radio-card" onclick="selectRadio(this,'resizeMode','increase')">
            <input type="radio" name="resizeMode" value="increase">
            <i class="fas fa-expand"></i><span>Increase</span>
          </label>
        </div>
        <div class="option-group">
          <label>Target Size</label>
          <div class="target-size-group">
            <input type="number" id="targetSize" value="500" min="1" oninput="updateResizePdfPreview()">
            <select id="targetUnit" onchange="updateResizePdfPreview()">
              <option value="KB">KB</option>
              <option value="MB" selected>MB</option>
            </select>
          </div>
        </div>
        <div class="size-preview" id="resizeSizePreview" style="display:none">
          <div class="size-card original">
            <div class="size-label">Current</div>
            <div class="size-value" id="resizeOrigSize">—</div>
          </div>
          <div class="size-arrow"><i class="fas fa-arrow-right"></i></div>
          <div class="size-card result">
            <div class="size-label">Target</div>
            <div class="size-value" id="resizeTargetDisplay">—</div>
          </div>
        </div>`);

    /* ── resize image ─────────────────────────────────────── */
    if (toolId === 'resize-image') return wrap(`
        <h4><i class="fas fa-crop-alt"></i> Resize Options</h4>
        <div class="option-radio-group" style="margin-bottom:20px">
          <label class="radio-card selected" onclick="selectRadio(this,'imgResizeMode','dimensions')">
            <input type="radio" name="imgResizeMode" value="dimensions" checked>
            <i class="fas fa-ruler-combined"></i><span>Dimensions</span>
          </label>
          <label class="radio-card" onclick="selectRadio(this,'imgResizeMode','percentage')">
            <input type="radio" name="imgResizeMode" value="percentage">
            <i class="fas fa-percentage"></i><span>Percentage</span>
          </label>
          <label class="radio-card" onclick="selectRadio(this,'imgResizeMode','filesize')">
            <input type="radio" name="imgResizeMode" value="filesize">
            <i class="fas fa-weight-hanging"></i><span>File Size</span>
          </label>
        </div>
        <div id="dimensionsOptions">
          <div class="option-group">
            <label>Width (px)</label>
            <input type="number" id="resizeWidth" value="800" min="1">
          </div>
          <div class="option-group">
            <label>Height (px — 0 = auto proportional)</label>
            <input type="number" id="resizeHeight" value="0" min="0">
          </div>
        </div>
        <div id="percentageOptions" style="display:none">
          <div class="option-group">
            <label>Scale — <span id="percentVal">50%</span></label>
            <input type="range" id="resizePercent" min="1" max="500" value="50"
              oninput="document.getElementById('percentVal').textContent=this.value+'%'">
          </div>
        </div>
        <div id="filesizeOptions" style="display:none">
          <div class="option-group">
            <label>Target File Size</label>
            <div class="target-size-group">
              <input type="number" id="imgTargetSize" value="200" min="1">
              <select id="imgTargetUnit">
                <option value="KB" selected>KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
          </div>
        </div>
        <div class="option-group">
          <label>Output Format</label>
          <select id="resizeFormat">
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </div>`);

    /* ── split ────────────────────────────────────────────── */
    if (toolId === 'split') return wrap(`
        <h4><i class="fas fa-cog"></i> Split Options</h4>
        <div class="option-group">
          <label>Pages to extract (e.g. 1,3,5 or 2-6 — empty = all)</label>
          <input type="text" id="splitPages" placeholder="1,3,5  or  2-6  or  leave blank">
        </div>
        <div class="info-box"><i class="fas fa-info-circle"></i>
          <p>Separate individual pages with commas. Use a dash for ranges (2-6). Leave blank to include all pages.</p>
        </div>`);

    /* ── rotate ───────────────────────────────────────────── */
    if (toolId === 'rotate') return wrap(`
        <h4><i class="fas fa-sync-alt"></i> Rotation Angle</h4>
        <div style="text-align:center;padding:20px 0">
          <button onclick="rotatePage(-90)" class="sig-btn" style="padding:14px 28px;font-size:1.2rem">
            <i class="fas fa-undo"></i> -90°
          </button>
          <span id="rotationDisplay" style="font-size:2.5rem;font-weight:800;color:var(--primary);margin:0 24px;font-family:var(--font-primary)">0°</span>
          <button onclick="rotatePage(90)" class="sig-btn" style="padding:14px 28px;font-size:1.2rem">
            <i class="fas fa-redo"></i> +90°
          </button>
        </div>
        <div style="display:flex;gap:12px;justify-content:center">
          <button onclick="rotatePage(180)" class="sig-btn"><i class="fas fa-arrows-alt-v"></i> 180°</button>
          <button onclick="AppState.rotationDeg=0;document.getElementById('rotationDisplay').textContent='0°'" class="sig-btn danger">
            <i class="fas fa-times"></i> Reset
          </button>
        </div>`);

    /* ── protect ──────────────────────────────────────────── */
    if (toolId === 'protect') return wrap(`
        <h4><i class="fas fa-lock"></i> Set Password</h4>
        <div class="option-group">
          <label>Password</label>
          <input type="password" id="pdfPassword" placeholder="Enter a strong password">
        </div>
        <div class="option-group">
          <label>Confirm Password</label>
          <input type="password" id="pdfPasswordConfirm" placeholder="Re-enter password">
        </div>
        <div class="info-box warning-box"><i class="fas fa-exclamation-triangle"></i>
          <p>Browser-side full AES encryption requires a server. This tool re-saves the PDF with metadata locking. For maximum security use server-side encryption.</p>
        </div>`);

    /* ── unlock ───────────────────────────────────────────── */
    if (toolId === 'unlock') return wrap(`
        <h4><i class="fas fa-unlock"></i> Remove Password</h4>
        <div class="option-group">
          <label>PDF Password (if required)</label>
          <input type="password" id="unlockPassword" placeholder="Leave blank if no password">
        </div>
        <div class="info-box"><i class="fas fa-info-circle"></i>
          <p>This tool removes restrictions from PDFs that allow it. Strongly encrypted files may require server-side processing.</p>
        </div>`);

    /* ── watermark ────────────────────────────────────────── */
    if (toolId === 'watermark') return wrap(`
        <h4><i class="fas fa-tint"></i> Watermark Settings</h4>
        <div class="option-group">
          <label>Watermark Text</label>
          <input type="text" id="watermarkText" value="CONFIDENTIAL">
        </div>
        <div class="option-group">
          <label>Font Size — <span id="wmSizeVal">60</span>px</label>
          <input type="range" id="watermarkSize" min="10" max="200" value="60"
            oninput="document.getElementById('wmSizeVal').textContent=this.value">
        </div>
        <div class="option-group">
          <label>Opacity — <span id="wmOpacVal">20</span>%</label>
          <input type="range" id="watermarkOpacity" min="1" max="90" value="20"
            oninput="document.getElementById('wmOpacVal').textContent=this.value">
        </div>
        <div class="option-group">
          <label>Rotation (degrees)</label>
          <input type="number" id="watermarkRotation" value="-45">
        </div>
        <div class="option-group">
          <label>Color</label>
          <input type="color" id="watermarkColor" value="#999999" style="height:44px;cursor:pointer">
        </div>`);

    /* ── jpg-to-pdf ───────────────────────────────────────── */
    if (toolId === 'jpg-to-pdf') return wrap(`
        <h4><i class="fas fa-cog"></i> Page Orientation</h4>
        <div class="option-radio-group">
          <label class="radio-card selected" onclick="selectRadio(this,'pageOrient','portrait')">
            <input type="radio" name="pageOrient" value="portrait" checked>
            <i class="fas fa-mobile-alt"></i><span>Portrait</span>
          </label>
          <label class="radio-card" onclick="selectRadio(this,'pageOrient','landscape')">
            <input type="radio" name="pageOrient" value="landscape">
            <i class="fas fa-tablet-alt fa-rotate-90"></i><span>Landscape</span>
          </label>
        </div>
        <div class="option-group" style="margin-top:16px">
          <label>Image Quality in PDF</label>
          <select id="imgToPdfQuality">
            <option value="0.95">High (95%)</option>
            <option value="0.80" selected>Medium (80%)</option>
            <option value="0.60">Low (60%)</option>
          </select>
        </div>`);

    /* ── crop PDF ─────────────────────────────────────────── */
    if (toolId === 'crop-pdf') return wrap(`
        <h4><i class="fas fa-crop"></i> Crop Margins (% from each edge)</h4>
        <div class="crop-sliders">
          <div class="crop-slider-group">
            <label>Top <span class="crop-val" id="cropTopVal">5</span>%</label>
            <input type="range" id="cropTop" min="0" max="40" value="5" oninput="document.getElementById('cropTopVal').textContent=this.value">
          </div>
          <div class="crop-slider-group">
            <label>Bottom <span class="crop-val" id="cropBotVal">5</span>%</label>
            <input type="range" id="cropBot" min="0" max="40" value="5" oninput="document.getElementById('cropBotVal').textContent=this.value">
          </div>
          <div class="crop-slider-group">
            <label>Left <span class="crop-val" id="cropLeftVal">5</span>%</label>
            <input type="range" id="cropLeft" min="0" max="40" value="5" oninput="document.getElementById('cropLeftVal').textContent=this.value">
          </div>
          <div class="crop-slider-group">
            <label>Right <span class="crop-val" id="cropRightVal">5</span>%</label>
            <input type="range" id="cropRight" min="0" max="40" value="5" oninput="document.getElementById('cropRightVal').textContent=this.value">
          </div>
        </div>
        <div class="info-box" style="margin-top:16px"><i class="fas fa-info-circle"></i>
          <p>Sets the MediaBox / CropBox on every page. Use this to remove white borders or trim edges.</p>
        </div>`);

    /* ── repair PDF ───────────────────────────────────────── */
    if (toolId === 'repair-pdf') return wrap(`
        <h4><i class="fas fa-tools"></i> Repair Options</h4>
        <div class="info-box"><i class="fas fa-info-circle"></i>
          <p>DataPur will attempt to re-read and re-write the PDF structure, recovering as many pages as possible from corrupted files.</p>
        </div>
        <div class="option-group" style="margin-top:16px">
          <label>Recovery Mode</label>
          <select id="repairMode">
            <option value="standard">Standard — fix structure &amp; cross-references</option>
            <option value="aggressive">Aggressive — extract all readable page data</option>
          </select>
        </div>`);

    /* ── sign PDF ─────────────────────────────────────────── */
    if (toolId === 'sign-pdf') return wrap(`
        <h4><i class="fas fa-signature"></i> Create Your Signature</h4>
        <div class="option-radio-group" style="margin-bottom:20px">
          <label class="radio-card selected" onclick="selectRadio(this,'sigMode','draw');initSigCanvas()">
            <input type="radio" name="sigMode" value="draw" checked>
            <i class="fas fa-pen"></i><span>Draw</span>
          </label>
          <label class="radio-card" onclick="selectRadio(this,'sigMode','type');showTypeSig()">
            <input type="radio" name="sigMode" value="type">
            <i class="fas fa-keyboard"></i><span>Type</span>
          </label>
        </div>
        <div id="sigDrawArea" class="signature-area">
          <canvas id="sigCanvas" class="signature-canvas" width="800" height="200"></canvas>
          <div class="sig-tools">
            <button class="sig-btn" onclick="clearSigCanvas()"><i class="fas fa-eraser"></i> Clear</button>
            <label class="sig-btn" style="cursor:pointer">
              <i class="fas fa-palette"></i> Color
              <input type="color" id="sigColor" value="#000000" style="display:none" onchange="updateSigColor()">
            </label>
            <div class="sig-thickness">
              <span>Thickness:</span>
              <input type="range" id="sigThickness" min="1" max="12" value="3">
            </div>
          </div>
        </div>
        <div id="sigTypeArea" style="display:none">
          <div class="option-group">
            <label>Type your name</label>
            <input type="text" id="sigTypedText" placeholder="Your full name" oninput="renderTypedSig()">
          </div>
          <canvas id="sigTypeCanvas" class="signature-canvas" width="800" height="200" style="margin-top:8px"></canvas>
        </div>
        <div class="option-group" style="margin-top:16px">
          <label>Place on Page</label>
          <select id="sigPage">
            <option value="last">Last page</option>
            <option value="first">First page</option>
            <option value="all">All pages</option>
          </select>
        </div>
        <div class="option-group">
          <label>Signature Position</label>
          <select id="sigPosition">
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-center">Bottom Center</option>
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
          </select>
        </div>
        <div class="option-group">
          <label>Signature Scale — <span id="sigScaleVal">30</span>%</label>
          <input type="range" id="sigScale" min="10" max="80" value="30"
            oninput="document.getElementById('sigScaleVal').textContent=this.value">
        </div>`);

    /* ── translate PDF ────────────────────────────────────── */
    if (toolId === 'translate-pdf') return wrap(`
        <h4><i class="fas fa-language"></i> Translation Settings</h4>
        <div class="translate-box">
          <div class="lang-grid">
            <div class="option-group" style="margin:0">
              <label>From Language</label>
              <select id="langFrom">${langOptions('auto')}</select>
            </div>
            <button class="lang-swap-btn" onclick="swapLangs()" title="Swap languages">
              <i class="fas fa-exchange-alt"></i>
            </button>
            <div class="option-group" style="margin:0">
              <label>To Language</label>
              <select id="langTo">${langOptions('es')}</select>
            </div>
          </div>
        </div>
        <div class="info-box" style="margin-top:16px"><i class="fas fa-info-circle"></i>
          <p>Text is extracted from your PDF, translated using MyMemory free API, then saved as a new PDF. Images are not translated.</p>
        </div>`);

    /* ── word / excel / ppt → PDF ─────────────────────────── */
    if (['word-to-pdf','excel-to-pdf','ppt-to-pdf'].includes(toolId)) {
        const labels = { 'word-to-pdf': 'Word / Text', 'excel-to-pdf': 'Spreadsheet / CSV', 'ppt-to-pdf': 'Presentation / Text' };
        return wrap(`
        <h4><i class="${tool.icon}"></i> Convert ${labels[toolId]} to PDF</h4>
        <div class="info-box"><i class="fas fa-info-circle"></i>
          <p>Your file content is extracted and rendered into a clean, formatted PDF. Complex formatting may be simplified for browser compatibility.</p>
        </div>
        <div class="option-group" style="margin-top:16px">
          <label>PDF Page Size</label>
          <select id="convPageSize">
            <option value="a4" selected>A4 (210 × 297 mm)</option>
            <option value="letter">US Letter (8.5 × 11 in)</option>
            <option value="a3">A3 (297 × 420 mm)</option>
          </select>
        </div>
        <div class="option-group">
          <label>Font Size</label>
          <select id="convFontSize">
            <option value="10">10 pt</option>
            <option value="11">11 pt</option>
            <option value="12" selected>12 pt</option>
            <option value="14">14 pt</option>
          </select>
        </div>`);
    }

    return `<div class="tool-options" id="toolOptions" style="display:none"></div>`;
}

/* language select options */
function langOptions (selectedVal) {
    const langs = [
        ['auto','Auto Detect'],['en','English'],['es','Spanish'],['fr','French'],
        ['de','German'],['it','Italian'],['pt','Portuguese'],['ru','Russian'],
        ['zh','Chinese'],['ja','Japanese'],['ko','Korean'],['ar','Arabic'],
        ['hi','Hindi'],['bn','Bengali'],['tr','Turkish'],['nl','Dutch'],
        ['pl','Polish'],['sv','Swedish'],['da','Danish'],['fi','Finnish'],
        ['no','Norwegian'],['el','Greek'],['cs','Czech'],['ro','Romanian'],
        ['hu','Hungarian'],['uk','Ukrainian'],['vi','Vietnamese'],['th','Thai'],
        ['id','Indonesian'],['ms','Malay'],['fa','Persian'],['he','Hebrew'],
    ];
    return langs.map(([v,l]) => `<option value="${v}"${v===selectedVal?' selected':''}>${l}</option>`).join('');
}
function swapLangs () {
    const a = document.getElementById('langFrom'), b = document.getElementById('langTo');
    const tmp = a.value; a.value = b.value; b.value = tmp;
}

/* ============================================================
   Init tool page events
   ============================================================ */
function initToolPage (toolId, tool) {
    const fileInput  = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');

    fileInput.addEventListener('change', e => handleFiles(e.target.files, tool));
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault(); uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files, tool);
    });

    /* resize-image sub-toggle */
    if (toolId === 'resize-image') {
        document.querySelectorAll('input[name="imgResizeMode"]').forEach(r => {
            r.addEventListener('change', () => {
                document.getElementById('dimensionsOptions').style.display = r.value==='dimensions' ? '' : 'none';
                document.getElementById('percentageOptions').style.display = r.value==='percentage' ? '' : 'none';
                document.getElementById('filesizeOptions').style.display   = r.value==='filesize'   ? '' : 'none';
            });
        });
    }

    /* sign-pdf: init canvas after a tick */
    if (toolId === 'sign-pdf') {
        setTimeout(initSigCanvas, 100);
    }
}

function handleFiles (fileList, tool) {
    const files = Array.from(fileList);
    if (!tool.multiple) AppState.files = [files[0]];
    else AppState.files = [...AppState.files, ...files];

    updateFileListUI(tool);

    if (AppState.currentTool === 'compress')       updateCompressPreview();
    if (AppState.currentTool === 'compress-image') updateImgCompressPreview();
    if (AppState.currentTool === 'resize-pdf')     updateResizePdfPreview();

    showToast('success', `${files.length} file${files.length>1?'s':''} added`);
}

function updateFileListUI (tool) {
    const el  = document.getElementById('fileList');
    const btn = document.getElementById('btnProcess');
    const opts= document.getElementById('toolOptions');
    if (!AppState.files.length) {
        el.style.display = 'none'; btn.style.display = 'none';
        if (opts) opts.style.display = 'none'; return;
    }
    el.style.display = 'block'; btn.style.display = 'flex';
    if (opts) opts.style.display = 'block';

    const imgTools = ['compress-image','resize-image','jpg-to-pdf'];
    const isImg = imgTools.includes(AppState.currentTool);
    const getIconClass = (f) => {
        const n = f.name.toLowerCase();
        if (n.match(/\.(doc|docx|txt)$/))  return 'word-icon';
        if (n.match(/\.(xls|xlsx|csv)$/))  return 'excel-icon';
        if (n.match(/\.(ppt|pptx)$/))      return 'ppt-icon';
        if (isImg) return 'img-icon';
        return '';
    };
    const getIconFa = (f) => {
        const n = f.name.toLowerCase();
        if (n.match(/\.(doc|docx|txt)$/))  return 'fa-file-word';
        if (n.match(/\.(xls|xlsx|csv)$/))  return 'fa-file-excel';
        if (n.match(/\.(ppt|pptx)$/))      return 'fa-file-powerpoint';
        if (isImg) return 'fa-image';
        return 'fa-file-pdf';
    };

    el.innerHTML = `
        <div class="file-list-header">
          <span>${AppState.files.length} file${AppState.files.length>1?'s':''} selected</span>
          ${AppState.files.length>1 ? `<button onclick="AppState.files=[];updateFileListUI(TOOLS['${AppState.currentTool}'])" class="sig-btn danger" style="font-size:0.8rem;padding:6px 12px">Remove All</button>` : ''}
        </div>
        ${AppState.files.map((f,i) => `
        <div class="file-item">
          <div class="file-icon ${getIconClass(f)}"><i class="fas ${getIconFa(f)}"></i></div>
          <div class="file-info">
            <div class="file-name">${f.name}</div>
            <div class="file-size">${fmtSize(f.size)}</div>
          </div>
          <button class="file-remove" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
        </div>`).join('')}`;
}

function removeFile (i) {
    AppState.files.splice(i,1);
    updateFileListUI(TOOLS[AppState.currentTool]);
}

/* ============================================================
   Live previews
   ============================================================ */
function updateCompressPreview () {
    if (!AppState.files.length) return;
    const q = +document.getElementById('qualitySlider').value;
    document.getElementById('qualityValue').textContent = q + '%';
    const orig  = AppState.files[0].size;
    const ratio = 0.04 + (q/100) * 0.96;
    const est   = Math.round(orig * ratio);
    const red   = Math.round((1-ratio)*100);
    document.getElementById('sizePreview').style.display    = 'grid';
    document.getElementById('origSizeDisplay').textContent  = fmtSize(orig);
    document.getElementById('estSizeDisplay').textContent   = fmtSize(est);
    document.getElementById('reductionBadge').textContent   = red>0 ? `↓ ${red}% smaller` : 'Same size';
}

function updateImgCompressPreview () {
    if (!AppState.files.length) return;
    const q = +document.getElementById('imgQualitySlider').value;
    document.getElementById('imgQualityValue').textContent = q + '%';
    const orig  = AppState.files[0].size;
    const ratio = 0.02 + (q/100) * 0.98;
    const est   = Math.round(orig * ratio);
    const red   = Math.round((1-ratio)*100);
    document.getElementById('imgSizePreview').style.display = 'grid';
    document.getElementById('imgOrigSize').textContent      = fmtSize(orig);
    document.getElementById('imgNewSize').textContent       = '~' + fmtSize(est);
    document.getElementById('imgReduction').textContent     = red>0 ? `↓ ${red}% smaller` : 'Same size';
}

function updateResizePdfPreview () {
    if (!AppState.files.length) return;
    const orig        = AppState.files[0].size;
    const target      = +document.getElementById('targetSize').value;
    const unit        = document.getElementById('targetUnit').value;
    const targetBytes = unit==='MB' ? target*1024*1024 : target*1024;
    document.getElementById('resizeSizePreview').style.display  = 'grid';
    document.getElementById('resizeOrigSize').textContent        = fmtSize(orig);
    document.getElementById('resizeTargetDisplay').textContent   = fmtSize(targetBytes);
}

/* ============================================================
   Process dispatcher
   ============================================================ */
async function processFiles (toolId) {
    if (!AppState.files.length) return showToast('error', 'Please select a file first');
    showLoading(true, 0);
    try {
        switch (toolId) {
            case 'merge':         await doMerge();               break;
            case 'split':         await doSplit();               break;
            case 'compress':      await doCompressPDF();         break;
            case 'compress-image':await doCompressImage();       break;
            case 'resize-pdf':    await doResizePDF();           break;
            case 'resize-image':  await doResizeImage();         break;
            case 'rotate':        await doRotate();              break;
            case 'protect':       await doProtect();             break;
            case 'unlock':        await doUnlock();              break;
            case 'watermark':     await doWatermark();           break;
            case 'jpg-to-pdf':    await doImgToPDF();           break;
            case 'pdf-to-jpg':    await doPDFtoImg();           break;
            case 'crop-pdf':      await doCropPDF();            break;
            case 'repair-pdf':    await doRepairPDF();          break;
            case 'sign-pdf':      await doSignPDF();            break;
            case 'translate-pdf': await doTranslatePDF();       break;
            case 'word-to-pdf':   await doWordToPDF();          break;
            case 'excel-to-pdf':  await doExcelToPDF();         break;
            case 'ppt-to-pdf':    await doPPTtoPDF();           break;
            case 'pdf-to-word':   await doPDFtoFormat('word');  break;
            case 'pdf-to-excel':  await doPDFtoFormat('excel'); break;
            case 'pdf-to-ppt':    await doPDFtoFormat('ppt');   break;
            default: throw new Error('Unknown tool: ' + toolId);
        }
        showDownload();
        showToast('success', 'Done! Your file is ready.');
    } catch (err) {
        console.error(err);
        showToast('error', err.message || 'Something went wrong');
    } finally {
        showLoading(false);
    }
}

/* ============================================================
   ★ COMPRESS PDF  (re-render every page as JPEG)
   ============================================================ */
async function doCompressPDF () {
    const quality   = (+document.getElementById('qualitySlider').value) / 100;
    const fileBytes = await readBuf(AppState.files[0]);
    AppState.originalSize = AppState.files[0].size;

    setLoadText('Loading PDF…');
    const srcPdf   = await pdfjsLib.getDocument({ data: fileBytes }).promise;
    const numPages = srcPdf.numPages;
    const { jsPDF } = window.jspdf;
    let doc = null;

    for (let i = 1; i <= numPages; i++) {
        setLoadText(`Compressing page ${i} / ${numPages}…`);
        setLoadProg(i / numPages * 90);
        const page     = await srcPdf.getPage(i);
        const scale    = 0.3 + quality * 1.7;
        const viewport = page.getViewport({ scale });
        const canvas   = offCanvas(viewport.width, viewport.height);
        const ctx      = canvas.getContext('2d');
        ctx.fillStyle  = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imgData  = canvas.toDataURL('image/jpeg', Math.max(0.01, quality));
        if (i === 1) {
            doc = new jsPDF({
                unit: 'px', format: [viewport.width, viewport.height],
                compress: true, hotfixes: ['px_scaling'],
            });
        } else {
            doc.addPage([viewport.width, viewport.height]);
        }
        doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
    }
    setLoadText('Generating PDF…'); setLoadProg(95);
    const blob = doc.output('blob');
    AppState.processedBlob = blob;
    AppState.newSize       = blob.size;
    AppState.downloadName  = 'compressed_datapur.pdf';
}

/* ============================================================
   ★ COMPRESS IMAGE
   ============================================================ */
async function doCompressImage () {
    const quality  = (+document.getElementById('imgQualitySlider').value) / 100;
    const format   = document.getElementById('imgOutputFormat').value;
    const maxW     = +document.getElementById('imgMaxWidth').value;

    const results = [];
    for (let i = 0; i < AppState.files.length; i++) {
        setLoadText(`Compressing image ${i+1}/${AppState.files.length}…`);
        setLoadProg((i/AppState.files.length)*90);
        const blob = await compressSingleImage(AppState.files[i], quality, format, maxW);
        results.push({ blob, name: AppState.files[i].name });
    }
    const ext = format === 'jpeg' ? 'jpg' : format;
    AppState.processedBlob = results[0].blob;
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = results[0].blob.size;
    AppState.downloadName  = results[0].name.replace(/\.[^.]+$/,'') + `_compressed.${ext}`;
}

function compressSingleImage (file, quality, format, maxW) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let w = img.naturalWidth, h = img.naturalHeight;
            if (maxW > 0 && w > maxW) { h = Math.round(h * (maxW/w)); w = maxW; }
            const canvas = offCanvas(w, h);
            const ctx    = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(img.src);
            const mime = mimeOf(format);
            canvas.toBlob(blob => resolve(blob), mime, quality);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/* ============================================================
   ★ RESIZE PDF  (binary-search quality to hit target size)
   ============================================================ */
async function doResizePDF () {
    const mode        = document.querySelector('input[name="resizeMode"]:checked')?.value || 'reduce';
    const targetVal   = +document.getElementById('targetSize').value;
    const unit        = document.getElementById('targetUnit').value;
    const targetBytes = unit==='MB' ? targetVal*1024*1024 : targetVal*1024;
    AppState.originalSize = AppState.files[0].size;

    const fileBytes = await readBuf(AppState.files[0]);
    const srcPdf    = await pdfjsLib.getDocument({ data: fileBytes }).promise;
    const numPages  = srcPdf.numPages;

    if (mode === 'reduce') {
        let lo = 0.01, hi = 1.0, bestBlob = null;
        for (let att = 0; att < 14; att++) {
            const q = (lo + hi) / 2;
            setLoadText(`Attempt ${att+1}: quality ${Math.round(q*100)}%…`);
            setLoadProg((att/14)*90);
            const blob = await renderPDFatQuality(srcPdf, numPages, q);
            if (!bestBlob || Math.abs(blob.size-targetBytes) < Math.abs(bestBlob.size-targetBytes)) bestBlob = blob;
            if (blob.size > targetBytes) hi = q; else lo = q;
            if (Math.abs(blob.size-targetBytes)/targetBytes < 0.04) break;
        }
        AppState.processedBlob = bestBlob;
        AppState.newSize       = bestBlob.size;
        AppState.downloadName  = 'resized_datapur.pdf';
    } else {
        /* increase: pad PDF with invisible metadata */
        setLoadText('Padding PDF to reach target size…');
        const { PDFDocument } = PDFLib;
        const pdf    = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
        const needed = targetBytes - fileBytes.length;
        if (needed <= 0) throw new Error('File is already larger than or equal to the target size');
        const pad = 'A'.repeat(Math.max(0, needed));
        pdf.setSubject('DataPur_padding:' + pad.substring(0, 500));
        /* iteratively grow until we hit target */
        let pdfBytes = await pdf.save();
        while (pdfBytes.length < targetBytes) {
            pdf.setKeywords(['pad_' + pdfBytes.length + '_' + Date.now()]);
            pdfBytes = await pdf.save();
        }
        AppState.processedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        AppState.newSize       = pdfBytes.length;
        AppState.downloadName  = 'padded_datapur.pdf';
    }
}

async function renderPDFatQuality (srcPdf, numPages, quality) {
    const { jsPDF } = window.jspdf;
    const scale = 0.25 + quality * 1.75;
    let doc = null;
    for (let i = 1; i <= numPages; i++) {
        const page     = await srcPdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas   = offCanvas(viewport.width, viewport.height);
        const ctx      = canvas.getContext('2d');
        ctx.fillStyle  = '#FFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imgData  = canvas.toDataURL('image/jpeg', Math.max(0.01, quality));
        if (i === 1) {
            doc = new jsPDF({ unit:'px', format:[viewport.width, viewport.height], compress:true, hotfixes:['px_scaling'] });
        } else {
            doc.addPage([viewport.width, viewport.height]);
        }
        doc.addImage(imgData,'JPEG',0,0,viewport.width,viewport.height,undefined,'FAST');
    }
    return doc.output('blob');
}

/* ============================================================
   ★ RESIZE IMAGE (dimensions / percentage / file size)
   ============================================================ */
async function doResizeImage () {
    const mode   = document.querySelector('input[name="imgResizeMode"]:checked')?.value || 'dimensions';
    const format = document.getElementById('resizeFormat').value;
    const mime   = mimeOf(format);
    const ext    = format === 'jpeg' ? 'jpg' : format;
    const results = [];

    for (let fi = 0; fi < AppState.files.length; fi++) {
        const file = AppState.files[fi];
        setLoadText(`Resizing ${fi+1}/${AppState.files.length}…`);
        setLoadProg((fi/AppState.files.length)*90);
        const img = await loadImage(file);
        let blob;

        if (mode === 'dimensions') {
            let w = +document.getElementById('resizeWidth').value  || img.naturalWidth;
            let h = +document.getElementById('resizeHeight').value;
            if (!h) h = Math.round(img.naturalHeight * (w/img.naturalWidth));
            blob = await drawAndBlob(img, w, h, mime, 0.92);

        } else if (mode === 'percentage') {
            const pct = (+document.getElementById('resizePercent').value)/100;
            const w   = Math.round(img.naturalWidth * pct);
            const h   = Math.round(img.naturalHeight * pct);
            blob = await drawAndBlob(img, w, h, mime, 0.92);

        } else {
            /* binary search on scale to hit target file size */
            const target = +document.getElementById('imgTargetSize').value;
            const unit   = document.getElementById('imgTargetUnit').value;
            const tb     = unit==='MB' ? target*1024*1024 : target*1024;
            let lo = 0.05, hi = 1.0, best = null;
            for (let it = 0; it < 22; it++) {
                const mid = (lo+hi)/2;
                const cw  = Math.max(1, Math.round(img.naturalWidth*mid));
                const ch  = Math.max(1, Math.round(img.naturalHeight*mid));
                const b   = await drawAndBlob(img, cw, ch, mime, mid);
                best = b;
                if (b.size > tb) hi = mid; else lo = mid;
                if (Math.abs(b.size-tb)/tb < 0.04) break;
            }
            blob = best;
        }
        results.push({ blob, name: file.name });
    }

    AppState.processedBlob = results[0].blob;
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = results[0].blob.size;
    AppState.downloadName  = results[0].name.replace(/\.[^.]+$/,'') + `_resized.${ext}`;
}

function drawAndBlob (img, w, h, mime, q) {
    const canvas = offCanvas(w, h);
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return new Promise(r => canvas.toBlob(r, mime, q));
}

function loadImage (file) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = URL.createObjectURL(file);
    });
}

/* ============================================================
   ★ MERGE PDF
   ============================================================ */
async function doMerge () {
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();
    for (let i = 0; i < AppState.files.length; i++) {
        setLoadText(`Merging ${i+1}/${AppState.files.length}…`);
        setLoadProg((i/AppState.files.length)*90);
        const b   = await readBuf(AppState.files[i]);
        const src = await PDFDocument.load(b, { ignoreEncryption: true });
        const pgs = await merged.copyPages(src, src.getPageIndices());
        pgs.forEach(p => merged.addPage(p));
    }
    setLoadText('Saving…'); setLoadProg(95);
    const bytes = await merged.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files.reduce((s,f)=>s+f.size,0);
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'merged_datapur.pdf';
}

/* ============================================================
   ★ SPLIT PDF
   ============================================================ */
async function doSplit () {
    const { PDFDocument } = PDFLib;
    const b       = await readBuf(AppState.files[0]);
    const src     = await PDFDocument.load(b, { ignoreEncryption: true });
    const total   = src.getPageCount();
    const raw     = document.getElementById('splitPages')?.value?.trim();
    const indices = raw ? parseRange(raw, total) : Array.from({length:total},(_,i)=>i);
    const newPdf  = await PDFDocument.create();
    for (const idx of indices) {
        const [p] = await newPdf.copyPages(src, [idx]);
        newPdf.addPage(p);
    }
    const bytes = await newPdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'split_datapur.pdf';
}

/* ============================================================
   ★ ROTATE PDF
   ============================================================ */
async function doRotate () {
    const { PDFDocument, degrees } = PDFLib;
    const b   = await readBuf(AppState.files[0]);
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    pdf.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + AppState.rotationDeg + 360) % 360)));
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'rotated_datapur.pdf';
}

/* ============================================================
   ★ PROTECT PDF
   ============================================================ */
async function doProtect () {
    const pw  = document.getElementById('pdfPassword')?.value?.trim();
    const pw2 = document.getElementById('pdfPasswordConfirm')?.value?.trim();
    if (!pw)        throw new Error('Please enter a password');
    if (pw !== pw2) throw new Error('Passwords do not match');
    const { PDFDocument } = PDFLib;
    const b   = await readBuf(AppState.files[0]);
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    pdf.setAuthor('Protected by DataPur');
    pdf.setKeywords([`dp_protected_${btoa(pw).substring(0,20)}`]);
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'protected_datapur.pdf';
    showToast('info','PDF protected with metadata lock. Full AES encryption needs server-side processing.');
}

/* ============================================================
   ★ UNLOCK PDF
   ============================================================ */
async function doUnlock () {
    const { PDFDocument } = PDFLib;
    const b   = await readBuf(AppState.files[0]);
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'unlocked_datapur.pdf';
}

/* ============================================================
   ★ WATERMARK PDF
   ============================================================ */
async function doWatermark () {
    const { PDFDocument, rgb, degrees: deg, StandardFonts } = PDFLib;
    const text = document.getElementById('watermarkText')?.value || 'WATERMARK';
    const sz   = +(document.getElementById('watermarkSize')?.value || 60);
    const op   = +(document.getElementById('watermarkOpacity')?.value || 20) / 100;
    const rot  = +(document.getElementById('watermarkRotation')?.value || -45);
    const col  = hexRgb(document.getElementById('watermarkColor')?.value || '#999');
    const b    = await readBuf(AppState.files[0]);
    const pdf  = await PDFDocument.load(b, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    pdf.getPages().forEach(pg => {
        const { width, height } = pg.getSize();
        const tw = font.widthOfTextAtSize(text, sz);
        pg.drawText(text, {
            x: width/2 - tw/2, y: height/2, size: sz, font,
            color: rgb(col.r/255, col.g/255, col.b/255),
            opacity: op, rotate: deg(rot),
        });
    });
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'watermarked_datapur.pdf';
}

/* ============================================================
   ★ JPG → PDF
   ============================================================ */
async function doImgToPDF () {
    const { PDFDocument } = PDFLib;
    const pdf    = await PDFDocument.create();
    const orient = document.querySelector('input[name="pageOrient"]:checked')?.value || 'portrait';
    const qual   = +(document.getElementById('imgToPdfQuality')?.value || 0.8);
    let pw = 595.28, ph = 841.89;
    if (orient === 'landscape') [pw, ph] = [ph, pw];

    for (let i = 0; i < AppState.files.length; i++) {
        setLoadText(`Embedding image ${i+1}/${AppState.files.length}…`);
        setLoadProg((i/AppState.files.length)*90);
        const file   = AppState.files[i];
        const canvas = await fileToCanvas(file, qual);
        const blob   = await new Promise(r => canvas.toBlob(r,'image/jpeg',qual));
        const ib     = await blobToArrayBuffer(blob);
        const img    = await pdf.embedJpg(ib);
        const dims   = img.scale(1);
        const page   = pdf.addPage([pw, ph]);
        const sc     = Math.min(pw/dims.width, ph/dims.height);
        page.drawImage(img, {
            x: (pw-dims.width*sc)/2, y: (ph-dims.height*sc)/2,
            width: dims.width*sc, height: dims.height*sc,
        });
    }
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files.reduce((s,f)=>s+f.size,0);
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'images_to_pdf_datapur.pdf';
}

async function fileToCanvas (file, qual) {
    const img = await loadImage(file);
    const c   = offCanvas(img.naturalWidth, img.naturalHeight);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return c;
}

function blobToArrayBuffer (blob) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsArrayBuffer(blob);
    });
}

/* ============================================================
   ★ PDF → JPG  (render all pages onto one tall canvas)
   ============================================================ */
async function doPDFtoImg () {
    const b    = await readBuf(AppState.files[0]);
    const pdf  = await pdfjsLib.getDocument({ data: b }).promise;
    const n    = pdf.numPages;
    const canvases = [];
    let totalH = 0, maxW = 0;
    for (let i = 1; i <= n; i++) {
        setLoadText(`Rendering page ${i}/${n}…`);
        setLoadProg((i/n)*85);
        const page = await pdf.getPage(i);
        const vp   = page.getViewport({ scale: 1.8 });
        const c    = offCanvas(vp.width, vp.height);
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        canvases.push(c);
        totalH += vp.height + 12;
        maxW = Math.max(maxW, vp.width);
    }
    const fc  = offCanvas(maxW, totalH);
    const fct = fc.getContext('2d');
    fct.fillStyle = '#ffffff';
    fct.fillRect(0, 0, maxW, totalH);
    let y = 0;
    canvases.forEach(c => { fct.drawImage(c,(maxW-c.width)/2,y); y+=c.height+12; });
    const blob = await new Promise(r => fc.toBlob(r,'image/jpeg',0.92));
    AppState.processedBlob = blob;
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = blob.size;
    AppState.downloadName  = 'pdf_to_jpg_datapur.jpg';
}

/* ============================================================
   ★ CROP PDF  (adjust MediaBox)
   ============================================================ */
async function doCropPDF () {
    const { PDFDocument } = PDFLib;
    const topPct  = +document.getElementById('cropTop').value  / 100;
    const botPct  = +document.getElementById('cropBot').value  / 100;
    const leftPct = +document.getElementById('cropLeft').value / 100;
    const rightPct= +document.getElementById('cropRight').value/ 100;

    const b   = await readBuf(AppState.files[0]);
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    pdf.getPages().forEach(pg => {
        const { width, height } = pg.getSize();
        const x0 = width  * leftPct;
        const y0 = height * botPct;
        const x1 = width  * (1 - rightPct);
        const y1 = height * (1 - topPct);
        pg.setCropBox(x0, y0, x1 - x0, y1 - y0);
        pg.setMediaBox(x0, y0, x1 - x0, y1 - y0);
    });
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'cropped_datapur.pdf';
}

/* ============================================================
   ★ REPAIR PDF  (re-load with ignoreEncryption + recover pages)
   ============================================================ */
async function doRepairPDF () {
    const { PDFDocument } = PDFLib;
    setLoadText('Attempting to read damaged PDF…');
    const b   = await readBuf(AppState.files[0]);

    let pdf;
    try {
        pdf = await PDFDocument.load(b, { ignoreEncryption: true, throwOnInvalidObject: false });
    } catch {
        /* aggressive: try raw copy via PDF.js */
        setLoadText('Using aggressive recovery…');
        const srcPdf = await pdfjsLib.getDocument({ data: b, stopAtErrors: false }).promise;
        const newPdf = await PDFDocument.create();
        for (let i = 1; i <= srcPdf.numPages; i++) {
            setLoadText(`Recovering page ${i}/${srcPdf.numPages}…`);
            const page     = await srcPdf.getPage(i);
            const vp       = page.getViewport({ scale: 1.5 });
            const canvas   = offCanvas(vp.width, vp.height);
            const ctx      = canvas.getContext('2d');
            ctx.fillStyle  = '#FFF';
            ctx.fillRect(0, 0, vp.width, vp.height);
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            const imgData  = canvas.toDataURL('image/jpeg', 0.92);
            const ib       = await (await fetch(imgData)).arrayBuffer();
            const img      = await newPdf.embedJpg(ib);
            const dims     = img.scale(1);
            const pg       = newPdf.addPage([dims.width, dims.height]);
            pg.drawImage(img, { x: 0, y: 0, width: dims.width, height: dims.height });
        }
        pdf = newPdf;
    }

    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'repaired_datapur.pdf';
}

/* ============================================================
   ★ SIGN PDF  (draw or type signature, embed on PDF page)
   ============================================================ */
function initSigCanvas () {
    const canvas = document.getElementById('sigCanvas');
    if (!canvas) return;
    AppState.sigCanvas = canvas;
    AppState.sigCtx    = canvas.getContext('2d');
    AppState.sigCtx.strokeStyle = '#000000';
    AppState.sigCtx.lineWidth   = 3;
    AppState.sigCtx.lineCap     = 'round';
    AppState.sigCtx.lineJoin    = 'round';

    const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / r.width;
        const scaleY = canvas.height / r.height;
        if (e.touches) {
            return { x: (e.touches[0].clientX - r.left) * scaleX, y: (e.touches[0].clientY - r.top) * scaleY };
        }
        return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
    };

    const start = (e) => { e.preventDefault(); AppState.sigDrawing = true; const p = getPos(e); AppState.sigCtx.beginPath(); AppState.sigCtx.moveTo(p.x, p.y); };
    const draw  = (e) => {
        if (!AppState.sigDrawing) return; e.preventDefault();
        const p = getPos(e);
        const t = document.getElementById('sigThickness'); if (t) AppState.sigCtx.lineWidth = +t.value;
        AppState.sigCtx.lineTo(p.x, p.y); AppState.sigCtx.stroke();
    };
    const end   = () => { AppState.sigDrawing = false; };

    canvas.addEventListener('mousedown',  start);
    canvas.addEventListener('mousemove',  draw);
    canvas.addEventListener('mouseup',    end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove',  draw,  { passive: false });
    canvas.addEventListener('touchend',   end);
}

function clearSigCanvas () {
    const c = AppState.sigCanvas;
    if (!c) return;
    AppState.sigCtx.clearRect(0, 0, c.width, c.height);
}

function updateSigColor () {
    const col = document.getElementById('sigColor')?.value;
    if (AppState.sigCtx && col) AppState.sigCtx.strokeStyle = col;
}

function showTypeSig () {
    document.getElementById('sigDrawArea').style.display = 'none';
    document.getElementById('sigTypeArea').style.display = 'block';
}

function renderTypedSig () {
    const txt    = document.getElementById('sigTypedText')?.value || '';
    const canvas = document.getElementById('sigTypeCanvas');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle   = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle   = '#000000';
    ctx.font        = `italic 72px Georgia, serif`;
    ctx.textBaseline= 'middle';
    const tw  = ctx.measureText(txt).width;
    const scl = Math.min(1, (canvas.width - 40) / (tw || 1));
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(scl, 1);
    ctx.fillText(txt, -tw/2, 0);
    ctx.restore();
}

async function doSignPDF () {
    const { PDFDocument } = PDFLib;
    const mode     = document.querySelector('input[name="sigMode"]:checked')?.value || 'draw';
    const position = document.getElementById('sigPosition')?.value || 'bottom-right';
    const place    = document.getElementById('sigPage')?.value || 'last';
    const scale    = (+document.getElementById('sigScale')?.value || 30) / 100;

    /* get signature as JPEG data URL */
    let sigDataUrl;
    if (mode === 'draw') {
        const c = AppState.sigCanvas;
        if (!c) throw new Error('No signature canvas found');
        sigDataUrl = c.toDataURL('image/png');
    } else {
        const c = document.getElementById('sigTypeCanvas');
        if (!c) throw new Error('No typed signature canvas');
        renderTypedSig();
        sigDataUrl = c.toDataURL('image/png');
    }

    /* check if canvas is blank */
    const testCanvas = offCanvas(10,10);
    const testCtx = testCanvas.getContext('2d');
    const tempImg = new Image();
    await new Promise(r => { tempImg.onload = r; tempImg.src = sigDataUrl; });
    testCtx.drawImage(tempImg, 0, 0, 10, 10);
    const blankCheck = testCtx.getImageData(0,0,10,10).data.every((v,i) => i%4===3 ? true : v===255);
    if (blankCheck) throw new Error('Signature is blank — please draw or type your signature first');

    /* convert to Uint8Array */
    const res  = await fetch(sigDataUrl);
    const ib   = await res.arrayBuffer();

    const b    = await readBuf(AppState.files[0]);
    const pdf  = await PDFDocument.load(b, { ignoreEncryption: true });
    const pages= pdf.getPages();
    let sigImg;
    try { sigImg = await pdf.embedPng(new Uint8Array(ib)); }
    catch { sigImg = await pdf.embedJpg(new Uint8Array(ib)); }

    const applyTo = place==='all' ? pages : place==='first' ? [pages[0]] : [pages[pages.length-1]];
    const margin = 28;

    applyTo.forEach(pg => {
        const { width, height } = pg.getSize();
        const dims  = sigImg.scale(scale);
        const sw    = Math.min(dims.width, width * 0.5);
        const sh    = sw * (dims.height / dims.width);
        let x, y;
        switch (position) {
            case 'bottom-right':  x = width - sw - margin;  y = margin; break;
            case 'bottom-left':   x = margin;               y = margin; break;
            case 'bottom-center': x = (width-sw)/2;         y = margin; break;
            case 'top-right':     x = width - sw - margin;  y = height - sh - margin; break;
            case 'top-left':      x = margin;               y = height - sh - margin; break;
            default:              x = width - sw - margin;  y = margin;
        }
        pg.drawImage(sigImg, { x, y, width: sw, height: sh });
    });

    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type:'application/pdf' });
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = bytes.length;
    AppState.downloadName  = 'signed_datapur.pdf';
}

/* ============================================================
   ★ TRANSLATE PDF  (MyMemory free API)
   ============================================================ */
async function doTranslatePDF () {
    const from = document.getElementById('langFrom')?.value || 'auto';
    const to   = document.getElementById('langTo')?.value   || 'en';
    const b    = await readBuf(AppState.files[0]);

    setLoadText('Extracting text from PDF…');
    const src  = await pdfjsLib.getDocument({ data: b }).promise;
    let fullText = '';
    for (let i = 1; i <= src.numPages; i++) {
        setLoadProg((i / src.numPages) * 40);
        const pg = await src.getPage(i);
        const tc = await pg.getTextContent();
        fullText += `--- Page ${i} ---\n${tc.items.map(x=>x.str).join(' ')}\n\n`;
    }

    if (!fullText.trim()) throw new Error('No text found in this PDF (it may be image-based)');

    setLoadText('Translating text…');
    const langPair = from === 'auto' ? `${to}` : `${from}|${to}`;
    /* split into chunks ≤500 chars for the free API */
    const chunks = chunkText(fullText, 450);
    let translated = '';
    for (let i = 0; i < chunks.length; i++) {
        setLoadText(`Translating chunk ${i+1}/${chunks.length}…`);
        setLoadProg(40 + (i/chunks.length)*40);
        try {
            const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunks[i])}&langpair=${langPair}`;
            const resp = await fetch(url);
            const data = await resp.json();
            translated += (data.responseData?.translatedText || chunks[i]) + ' ';
        } catch {
            translated += chunks[i] + ' '; /* fallback: keep original */
        }
    }

    setLoadText('Building translated PDF…'); setLoadProg(85);
    /* render translated text into a new PDF using jsPDF */
    const { jsPDF } = window.jspdf;
    const doc   = new jsPDF({ unit:'pt', format:'a4' });
    const lines = doc.splitTextToSize(translated, 515);
    const lh    = 16, margin = 40, pageH = 841.89;
    let y = margin + 20;
    doc.setFontSize(11);
    doc.setFont('helvetica','normal');
    lines.forEach(line => {
        if (y + lh > pageH - margin) { doc.addPage(); y = margin + 20; }
        doc.text(line, margin, y);
        y += lh;
    });

    const blob = doc.output('blob');
    AppState.processedBlob = blob;
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = blob.size;
    AppState.downloadName  = `translated_${to}_datapur.pdf`;
}

function chunkText (text, maxLen) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = start + maxLen;
        if (end < text.length) {
            const sp = text.lastIndexOf(' ', end);
            if (sp > start) end = sp;
        }
        chunks.push(text.substring(start, end));
        start = end;
    }
    return chunks;
}

/* ============================================================
   ★ WORD → PDF
   ============================================================ */
async function doWordToPDF () {
    const file     = AppState.files[0];
    const text     = await file.text();
    const pageSize = document.getElementById('convPageSize')?.value || 'a4';
    const fontSize = +(document.getElementById('convFontSize')?.value || 12);
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ unit:'pt', format: pageSize });
    const pw   = doc.internal.pageSize.getWidth();
    const ph   = doc.internal.pageSize.getHeight();
    const margin = 50;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(text, pw - margin*2);
    const lh    = fontSize * 1.5;
    let y = margin + fontSize;
    lines.forEach(line => {
        if (y + lh > ph - margin) { doc.addPage(); y = margin + fontSize; }
        doc.text(line, margin, y);
        y += lh;
    });
    const blob = doc.output('blob');
    AppState.processedBlob = blob;
    AppState.originalSize  = file.size;
    AppState.newSize       = blob.size;
    AppState.downloadName  = file.name.replace(/\.[^.]+$/,'') + '_datapur.pdf';
}

/* ============================================================
   ★ EXCEL → PDF  (CSV / plain text table)
   ============================================================ */
async function doExcelToPDF () {
    const file     = AppState.files[0];
    const text     = await file.text();
    const pageSize = document.getElementById('convPageSize')?.value || 'a4';
    const fontSize = +(document.getElementById('convFontSize')?.value || 11);
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ unit:'pt', format: pageSize, orientation: 'landscape' });
    const pw   = doc.internal.pageSize.getWidth();
    const ph   = doc.internal.pageSize.getHeight();
    const margin = 40;
    doc.setFontSize(fontSize);
    doc.setFont('courier','normal');

    const rows = text.split('\n').map(r => r.split(/[,\t]/).map(c => c.trim().replace(/^"|"$/g,'')));
    const colW = Math.max(60, (pw - margin*2) / Math.max(1, rows[0]?.length || 1));
    let y = margin + fontSize + 10;

    /* header row */
    if (rows.length) {
        doc.setFont('courier','bold');
        doc.setFillColor(240,240,240);
        doc.rect(margin, y - fontSize, pw - margin*2, fontSize + 6, 'F');
        rows[0].forEach((cell, ci) => doc.text(String(cell).substring(0,20), margin + ci*colW, y));
        y += fontSize + 8;
        doc.setFont('courier','normal');
    }

    for (let ri = 1; ri < rows.length; ri++) {
        if (y + fontSize + 4 > ph - margin) { doc.addPage(); y = margin + fontSize + 10; }
        if (ri % 2 === 0) { doc.setFillColor(248,248,252); doc.rect(margin, y - fontSize, pw - margin*2, fontSize + 4, 'F'); }
        rows[ri].forEach((cell, ci) => doc.text(String(cell).substring(0,20), margin + ci*colW, y));
        y += fontSize + 4;
    }

    const blob = doc.output('blob');
    AppState.processedBlob = blob;
    AppState.originalSize  = file.size;
    AppState.newSize       = blob.size;
    AppState.downloadName  = file.name.replace(/\.[^.]+$/,'') + '_datapur.pdf';
}

/* ============================================================
   ★ PPT → PDF  (slide-by-slide text layout)
   ============================================================ */
async function doPPTtoPDF () {
    const file     = AppState.files[0];
    const text     = await file.text();
    const pageSize = document.getElementById('convPageSize')?.value || 'a4';
    const fontSize = +(document.getElementById('convFontSize')?.value || 12);
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ unit:'pt', format: pageSize, orientation:'landscape' });
    const pw   = doc.internal.pageSize.getWidth();
    const ph   = doc.internal.pageSize.getHeight();
    const margin = 60;

    /* split by double newline = slides */
    const slides = text.split(/\n{2,}/).filter(s => s.trim());
    slides.forEach((slide, si) => {
        if (si > 0) doc.addPage();
        /* slide background */
        doc.setFillColor(30, 30, 60);
        doc.rect(0, 0, pw, ph, 'F');
        /* accent bar */
        doc.setFillColor(108, 92, 231);
        doc.rect(0, 0, pw, 8, 'F');
        /* slide number */
        doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(150,150,200);
        doc.text(`Slide ${si+1} / ${slides.length}`, pw - margin, ph - 16, { align:'right' });
        /* lines */
        const lines = slide.split('\n').filter(l => l.trim());
        let y = 80;
        lines.forEach((line, li) => {
            if (li === 0) {
                /* title line */
                doc.setFontSize(fontSize + 8); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
            } else {
                doc.setFontSize(fontSize); doc.setFont('helvetica','normal'); doc.setTextColor(200,200,220);
            }
            const wrapped = doc.splitTextToSize(line, pw - margin*2);
            wrapped.forEach(wl => {
                if (y > ph - 50) return;
                doc.text(wl, margin, y);
                y += (li===0 ? fontSize+12 : fontSize+6);
            });
        });
    });

    doc.setTextColor(0,0,0); /* reset */
    const blob = doc.output('blob');
    AppState.processedBlob = blob;
    AppState.originalSize  = file.size;
    AppState.newSize       = blob.size;
    AppState.downloadName  = file.name.replace(/\.[^.]+$/,'') + '_datapur.pdf';
}

/* ============================================================
   ★ PDF → WORD / EXCEL / PPT  (text extraction + format)
   ============================================================ */
async function doPDFtoFormat (fmt) {
    const b   = await readBuf(AppState.files[0]);
    const pdf = await pdfjsLib.getDocument({ data: b }).promise;
    let text  = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        setLoadText(`Extracting page ${i}/${pdf.numPages}…`);
        setLoadProg((i/pdf.numPages)*85);
        const pg = await pdf.getPage(i);
        const tc = await pg.getTextContent();
        text += `--- Page ${i} ---\n${tc.items.map(x=>x.str).join(' ')}\n\n`;
    }
    let blob, ext;
    if (fmt === 'word') {
        blob = new Blob([`<html><head><meta charset="UTF-8"><style>body{font-family:Calibri,Arial;font-size:12pt;margin:40pt;line-height:1.6}h2{color:#333}</style></head><body><h2>Converted by DataPur</h2>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</body></html>`], { type:'application/msword' });
        ext = 'doc';
    } else if (fmt === 'excel') {
        blob = new Blob([text], { type:'text/csv' }); ext = 'csv';
    } else {
        blob = new Blob([text], { type:'text/plain' }); ext = 'txt';
    }
    AppState.processedBlob = blob;
    AppState.originalSize  = AppState.files[0].size;
    AppState.newSize       = blob.size;
    AppState.downloadName  = `converted_datapur.${ext}`;
}

/* ============================================================
   Download / UI
   ============================================================ */
function showDownload () {
    document.getElementById('uploadArea').style.display = 'none';
    const dl = document.getElementById('downloadArea');
    dl.style.display = 'block';

    const diff       = AppState.originalSize - AppState.newSize;
    const pctChange  = AppState.originalSize > 0 ? Math.abs(Math.round((diff/AppState.originalSize)*100)) : 0;
    const direction  = diff > 0 ? 'smaller' : diff < 0 ? 'larger' : 'same';
    const dirColor   = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--primary)' : 'var(--gray-500)';
    const arrow      = diff > 0 ? '↓' : diff < 0 ? '↑' : '=';

    dl.innerHTML = `
      <div class="download-section">
        <div class="download-icon"><i class="fas fa-check"></i></div>
        <h2>Your file is ready!</h2>
        <p>Processing completed successfully. Click below to download.</p>
        <div class="results-info">
          <div class="info-row">
            <span class="info-label">Original size</span>
            <span class="info-value">${fmtSize(AppState.originalSize)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">New size</span>
            <span class="info-value" style="color:${dirColor}">${fmtSize(AppState.newSize)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Change</span>
            <span class="info-value" style="color:${dirColor}">${arrow} ${pctChange}% ${direction}</span>
          </div>
          ${diff>0 ? `<div class="info-row">
            <span class="info-label">Space saved</span>
            <span class="info-value success">${fmtSize(diff)}</span>
          </div>` : ''}
        </div>
        <div class="dl-buttons">
          <button class="btn-download" onclick="downloadFile()">
            <i class="fas fa-download"></i> Download ${AppState.downloadName.split('.').pop().toUpperCase()}
          </button>
          <button class="btn-another" onclick="resetTool()">
            <i class="fas fa-redo"></i> Process Another
          </button>
        </div>
      </div>`;
}

function resetTool () {
    AppState.files = []; AppState.processedBlob = null;
    document.getElementById('uploadArea').style.display  = 'block';
    document.getElementById('downloadArea').style.display= 'none';
    document.getElementById('fileList').style.display    = 'none';
    document.getElementById('btnProcess').style.display  = 'none';
    const opts = document.getElementById('toolOptions'); if (opts) opts.style.display = 'none';
    const fi   = document.getElementById('fileInput');   if (fi)   fi.value = '';
    if (AppState.currentTool === 'sign-pdf') setTimeout(initSigCanvas, 100);
}

function downloadFile () {
    if (!AppState.processedBlob) return;
    saveAs(AppState.processedBlob, AppState.downloadName || 'datapur_output');
    showToast('success', 'Download started!');
}

/* ============================================================
   Utilities
   ============================================================ */
function readBuf (file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsArrayBuffer(file);
    });
}

function offCanvas (w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height= Math.max(1, Math.round(h));
    return c;
}

function fmtSize (bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024, s = ['B','KB','MB','GB'];
    const i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(k)));
    return (bytes / Math.pow(k,i)).toFixed(2) + ' ' + s[i];
}

function parseRange (input, max) {
    const s = new Set();
    input.split(',').forEach(p => {
        p = p.trim();
        if (p.includes('-')) {
            const [a,b] = p.split('-').map(Number);
            for (let i=a; i<=Math.min(b,max); i++) if (i>=1) s.add(i-1);
        } else {
            const n = parseInt(p); if (n>=1 && n<=max) s.add(n-1);
        }
    });
    return [...s].sort((a,b)=>a-b);
}

function lighten (hex, amt) {
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const r = Math.min(255, parseInt(hex.substring(0,2),16)+amt);
    const g = Math.min(255, parseInt(hex.substring(2,4),16)+amt);
    const b = Math.min(255, parseInt(hex.substring(4,6),16)+amt);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function hexRgb (hex) {
    hex = hex.replace('#','');
    if (hex.length===3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r:parseInt(hex.substring(0,2),16), g:parseInt(hex.substring(2,4),16), b:parseInt(hex.substring(4,6),16) };
}

function mimeOf (format) {
    if (format==='jpeg') return 'image/jpeg';
    if (format==='png')  return 'image/png';
    if (format==='webp') return 'image/webp';
    return 'image/jpeg';
}

function showLoading (show, prog = 0) {
    document.getElementById('loadingOverlay').classList.toggle('active', show);
    if (show) setLoadProg(prog);
}

function setLoadText (t)  { const el = document.getElementById('loadingText'); if (el) el.textContent = t; }
function setLoadProg (pct){ const el = document.getElementById('loadingProgressFill'); if (el) el.style.width = pct + '%'; }

function showToast (type, msg) {
    const c     = document.getElementById('toastContainer');
    const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icons[type]||icons.info}"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
}

function showPricing () { showToast('info','All 22 tools are currently 100% free — no limits!'); }

function selectRadio (el, name) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(inp => inp.closest('.radio-card').classList.remove('selected'));
    el.classList.add('selected');
    const inp = el.querySelector('input');
    if (inp) { inp.checked = true; inp.dispatchEvent(new Event('change')); }
}

function rotatePage (deg) {
    AppState.rotationDeg = ((AppState.rotationDeg + deg) % 360 + 360) % 360;
    const d = document.getElementById('rotationDisplay');
    if (d) d.textContent = AppState.rotationDeg + '°';
}
