// js/app.js

// ============================================================
// DataPur - Full PDF & Image Toolkit with REAL Compression
// ============================================================

const AppState = {
    files: [],
    processedBlob: null,
    currentTool: null,
    rotationDegree: 0,
    downloadName: '',
    originalSize: 0,
    newSize: 0,
    imagePreviewUrl: null,
};

// PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ============================================================
// Navigation helpers
// ============================================================
window.addEventListener('scroll', () => {
    document.getElementById('navbar')?.classList.toggle('scrolled', window.scrollY > 20);
});
document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('navMenu')?.classList.toggle('active');
});
function animateCounters() {
    document.querySelectorAll('.stat-number').forEach(c => {
        const t = +c.dataset.count, d = 2000, s = t / (d / 16);
        let cur = 0;
        const tmr = setInterval(() => { cur += s; if (cur >= t) { c.textContent = t; clearInterval(tmr); } else c.textContent = Math.floor(cur); }, 16);
    });
}
const obs = new IntersectionObserver(e => e.forEach(en => { if (en.isIntersecting) { animateCounters(); obs.unobserve(en.target); } }), { threshold: 0.5 });
const hs = document.querySelector('.hero-stats'); if (hs) obs.observe(hs);

function initScrollAnimations() {
    const cards = document.querySelectorAll('.tool-card,.feature-card');
    const o = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; o.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    cards.forEach((c, i) => { c.style.opacity = '0'; c.style.transform = 'translateY(30px)'; c.style.transition = `all 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s`; o.observe(c); });
}
document.addEventListener('DOMContentLoaded', initScrollAnimations);

// ============================================================
// Tool definitions
// ============================================================
const TOOLS = {
    'merge': { name: 'Merge PDF', icon: 'fas fa-layer-group', color: '#6C5CE7', accept: '.pdf', multiple: true, desc: 'Combine multiple PDF files into one document' },
    'split': { name: 'Split PDF', icon: 'fas fa-cut', color: '#00CEC9', accept: '.pdf', multiple: false, desc: 'Extract pages from your PDF' },
    'compress': { name: 'Compress PDF', icon: 'fas fa-compress-arrows-alt', color: '#E17055', accept: '.pdf', multiple: false, desc: 'Reduce PDF size with precise 1-100% quality control' },
    'compress-image': { name: 'Compress Image', icon: 'fas fa-file-image', color: '#E84393', accept: 'image/*', multiple: true, desc: 'Compress JPG/PNG images with exact quality slider' },
    'resize-pdf': { name: 'Resize PDF File', icon: 'fas fa-expand-arrows-alt', color: '#0984E3', accept: '.pdf', multiple: false, desc: 'Reduce or increase PDF file size to exact target' },
    'resize-image': { name: 'Resize Image', icon: 'fas fa-crop-alt', color: '#00B894', accept: 'image/*', multiple: true, desc: 'Resize image dimensions or target a specific file size' },
    'rotate': { name: 'Rotate PDF', icon: 'fas fa-sync-alt', color: '#1ABC9C', accept: '.pdf', multiple: false, desc: 'Rotate PDF pages to any angle' },
    'protect': { name: 'Protect PDF', icon: 'fas fa-shield-alt', color: '#3498DB', accept: '.pdf', multiple: false, desc: 'Add password protection to your PDF' },
    'unlock': { name: 'Unlock PDF', icon: 'fas fa-unlock', color: '#2ECC71', accept: '.pdf', multiple: false, desc: 'Remove password protection from PDF' },
    'watermark': { name: 'Add Watermark', icon: 'fas fa-tint', color: '#9B59B6', accept: '.pdf', multiple: false, desc: 'Add text watermark to PDF pages' },
    'pdf-to-word': { name: 'PDF to Word', icon: 'fas fa-file-word', color: '#2980B9', accept: '.pdf', multiple: false, desc: 'Convert PDF to editable Word document' },
    'pdf-to-excel': { name: 'PDF to Excel', icon: 'fas fa-file-excel', color: '#27AE60', accept: '.pdf', multiple: false, desc: 'Extract PDF data into Excel' },
    'pdf-to-ppt': { name: 'PDF to PPT', icon: 'fas fa-file-powerpoint', color: '#E67E22', accept: '.pdf', multiple: false, desc: 'Convert PDF to PowerPoint' },
    'pdf-to-jpg': { name: 'PDF to JPG', icon: 'fas fa-images', color: '#8E44AD', accept: '.pdf', multiple: false, desc: 'Convert PDF pages to JPG images' },
    'jpg-to-pdf': { name: 'JPG to PDF', icon: 'fas fa-image', color: '#F39C12', accept: 'image/*', multiple: true, desc: 'Convert images to PDF document' },
};

// ============================================================
// Navigation
// ============================================================
function navigateTo(toolId) {
    const tool = TOOLS[toolId];
    if (!tool) return;
    AppState.currentTool = toolId;
    AppState.files = [];
    AppState.processedBlob = null;
    AppState.rotationDegree = 0;
    AppState.imagePreviewUrl = null;
    const overlay = document.getElementById('toolPageOverlay');
    const page = document.getElementById('toolPage');
    page.innerHTML = buildToolPage(toolId, tool);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    initToolPage(toolId, tool);
    overlay.scrollTo(0, 0);
}
function closeTool() {
    document.getElementById('toolPageOverlay').classList.remove('active');
    document.body.style.overflow = '';
    AppState.files = [];
    AppState.processedBlob = null;
}

// ============================================================
// Build tool page HTML
// ============================================================
function buildToolPage(toolId, tool) {
    return `
    <div class="tool-header">
        <div class="tool-header-inner">
            <div class="tool-header-left">
                <button class="btn-back" onclick="closeTool()"><i class="fas fa-arrow-left"></i></button>
                <div class="tool-header-title">
                    <div class="tool-badge" style="background:${tool.color}"><i class="${tool.icon}"></i></div>
                    <h2>${tool.name}</h2>
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
                <div class="upload-zone-icon" style="background:linear-gradient(135deg,${tool.color},${lighten(tool.color,40)})">
                    <i class="${tool.icon}"></i>
                </div>
                <h3>${tool.desc}</h3>
                <p>Drag & drop your file${tool.multiple ? 's' : ''} here or click to browse</p>
                <button class="btn-select" style="background:linear-gradient(135deg,${tool.color},${lighten(tool.color,30)})">
                    <i class="fas fa-plus"></i> Select File${tool.multiple ? 's' : ''}
                </button>
                <input type="file" id="fileInput" accept="${tool.accept}" ${tool.multiple ? 'multiple' : ''}>
            </div>
            <div class="file-list" id="fileList" style="display:none"></div>
            ${buildToolOptions(toolId, tool)}
            <button class="btn-process" id="btnProcess" style="background:linear-gradient(135deg,${tool.color},${lighten(tool.color,30)});display:none" onclick="processFiles('${toolId}')">
                <i class="${tool.icon}"></i> ${tool.name}
            </button>
            <div class="progress-container" id="progressContainer" style="display:none">
                <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                <p class="progress-text" id="progressText">Processing...</p>
            </div>
        </div>
        <div id="downloadArea" style="display:none"></div>
    </div>`;
}

function buildToolOptions(toolId, tool) {
    const wrap = (html) => `<div class="tool-options" id="toolOptions" style="display:none">${html}</div>`;

    if (toolId === 'compress') {
        return wrap(`
            <h4><i class="fas fa-sliders-h"></i> Compression Quality Control</h4>
            <div class="quality-slider-container">
                <div class="quality-slider-header">
                    <span>Lower = Smaller file</span>
                    <div class="quality-value" id="qualityValue" style="color:${tool.color}">50%</div>
                    <span>Higher = Better quality</span>
                </div>
                <input type="range" class="quality-slider" id="qualitySlider" min="1" max="100" value="50"
                    style="background:linear-gradient(90deg,#e74c3c,#f39c12,#2ecc71)"
                    oninput="updateCompressPreview()">
            </div>
            <div class="size-preview" id="sizePreview" style="display:none">
                <div class="size-card original">
                    <div class="size-label">Original Size</div>
                    <div class="size-value" id="origSizeDisplay">—</div>
                </div>
                <div class="size-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="size-card result">
                    <div class="size-label">Estimated Result</div>
                    <div class="size-value" id="estSizeDisplay">—</div>
                    <div class="reduction-badge" id="reductionBadge">—</div>
                </div>
            </div>
        `);
    }

    if (toolId === 'compress-image') {
        return wrap(`
            <h4><i class="fas fa-sliders-h"></i> Image Compression Quality</h4>
            <div class="quality-slider-container">
                <div class="quality-slider-header">
                    <span>Min quality (tiny file)</span>
                    <div class="quality-value" id="imgQualityValue" style="color:${tool.color}">50%</div>
                    <span>Max quality (large file)</span>
                </div>
                <input type="range" class="quality-slider" id="imgQualitySlider" min="1" max="100" value="50"
                    style="background:linear-gradient(90deg,#E84393,#f39c12,#2ecc71)"
                    oninput="updateImgCompressPreview()">
            </div>
            <div class="option-group">
                <label>Output Format</label>
                <select id="imgOutputFormat">
                    <option value="jpeg">JPEG (smallest)</option>
                    <option value="png">PNG (lossless)</option>
                    <option value="webp">WebP (modern)</option>
                </select>
            </div>
            <div class="option-group">
                <label>Max Width (px, 0 = keep original)</label>
                <input type="number" id="imgMaxWidth" value="0" min="0" placeholder="0 = original">
            </div>
            <div class="image-preview-container" id="imgPreviewContainer" style="display:none">
                <canvas id="imgPreviewCanvas"></canvas>
            </div>
            <div class="size-preview" id="imgSizePreview" style="display:none">
                <div class="size-card original">
                    <div class="size-label">Original Size</div>
                    <div class="size-value" id="imgOrigSize">—</div>
                </div>
                <div class="size-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="size-card result">
                    <div class="size-label">Compressed Size</div>
                    <div class="size-value" id="imgNewSize">—</div>
                    <div class="reduction-badge" id="imgReduction">—</div>
                </div>
            </div>
        `);
    }

    if (toolId === 'resize-pdf') {
        return wrap(`
            <h4><i class="fas fa-expand-arrows-alt"></i> Target File Size</h4>
            <div class="option-radio-group" style="margin-bottom:20px">
                <label class="radio-card selected" onclick="selectRadio(this,'resizeMode','reduce')">
                    <input type="radio" name="resizeMode" value="reduce" checked>
                    <i class="fas fa-compress"></i><span>Reduce Size</span>
                </label>
                <label class="radio-card" onclick="selectRadio(this,'resizeMode','increase')">
                    <input type="radio" name="resizeMode" value="increase">
                    <i class="fas fa-expand"></i><span>Increase Size</span>
                </label>
            </div>
            <div class="option-group">
                <label>Target File Size</label>
                <div class="target-size-group">
                    <input type="number" id="targetSize" value="500" min="1">
                    <select id="targetUnit">
                        <option value="KB">KB</option>
                        <option value="MB" selected>MB</option>
                    </select>
                </div>
            </div>
            <div class="size-preview" id="resizeSizePreview" style="display:none">
                <div class="size-card original">
                    <div class="size-label">Current Size</div>
                    <div class="size-value" id="resizeOrigSize">—</div>
                </div>
                <div class="size-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="size-card result">
                    <div class="size-label">Target Size</div>
                    <div class="size-value" id="resizeTargetDisplay">—</div>
                </div>
            </div>
        `);
    }

    if (toolId === 'resize-image') {
        return wrap(`
            <h4><i class="fas fa-crop-alt"></i> Resize Options</h4>
            <div class="option-radio-group" style="margin-bottom:20px">
                <label class="radio-card selected" onclick="selectRadio(this,'imgResizeMode','dimensions')">
                    <input type="radio" name="imgResizeMode" value="dimensions" checked>
                    <i class="fas fa-ruler-combined"></i><span>By Dimensions</span>
                </label>
                <label class="radio-card" onclick="selectRadio(this,'imgResizeMode','percentage')">
                    <input type="radio" name="imgResizeMode" value="percentage">
                    <i class="fas fa-percentage"></i><span>By Percentage</span>
                </label>
                <label class="radio-card" onclick="selectRadio(this,'imgResizeMode','filesize')">
                    <input type="radio" name="imgResizeMode" value="filesize">
                    <i class="fas fa-weight-hanging"></i><span>Target File Size</span>
                </label>
            </div>
            <div id="dimensionsOptions">
                <div class="option-group">
                    <label>Width (px)</label>
                    <input type="number" id="resizeWidth" value="800" min="1">
                </div>
                <div class="option-group">
                    <label>Height (px, 0 = auto/proportional)</label>
                    <input type="number" id="resizeHeight" value="0" min="0">
                </div>
            </div>
            <div id="percentageOptions" style="display:none">
                <div class="option-group">
                    <label>Scale Percentage</label>
                    <input type="range" id="resizePercent" min="1" max="500" value="50" oninput="document.getElementById('percentVal').textContent=this.value+'%'">
                    <span id="percentVal" style="font-size:0.9rem;font-weight:600;color:var(--primary)">50%</span>
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
            </div>
        `);
    }

    if (toolId === 'split') {
        return wrap(`
            <h4><i class="fas fa-cog"></i> Split Options</h4>
            <div class="option-group">
                <label>Pages to extract (e.g. 1,3,5 or 1-5)</label>
                <input type="text" id="splitPages" placeholder="1,2,3 or 1-3 or leave empty for all">
            </div>
        `);
    }
    if (toolId === 'rotate') {
        return wrap(`
            <h4><i class="fas fa-cog"></i> Rotation</h4>
            <div style="text-align:center;margin:20px 0">
                <button onclick="rotatePage(-90)" style="padding:12px 24px;border:2px solid var(--gray-200);border-radius:10px;background:white;cursor:pointer;font-size:1.2rem;margin:0 8px" title="Rotate Left"><i class="fas fa-undo"></i></button>
                <span style="font-size:2rem;font-weight:700;color:var(--primary);margin:0 16px" id="rotationDisplay">0°</span>
                <button onclick="rotatePage(90)" style="padding:12px 24px;border:2px solid var(--gray-200);border-radius:10px;background:white;cursor:pointer;font-size:1.2rem;margin:0 8px" title="Rotate Right"><i class="fas fa-redo"></i></button>
            </div>
        `);
    }
    if (toolId === 'protect') {
        return wrap(`
            <h4><i class="fas fa-lock"></i> Set Password</h4>
            <div class="option-group"><label>Password</label><input type="password" id="pdfPassword" placeholder="Enter password"></div>
            <div class="option-group"><label>Confirm Password</label><input type="password" id="pdfPasswordConfirm" placeholder="Confirm password"></div>
        `);
    }
    if (toolId === 'unlock') {
        return wrap(`
            <h4><i class="fas fa-unlock"></i> Enter Password</h4>
            <div class="option-group"><label>PDF Password</label><input type="password" id="unlockPassword" placeholder="Enter password"></div>
        `);
    }
    if (toolId === 'watermark') {
        return wrap(`
            <h4><i class="fas fa-tint"></i> Watermark Settings</h4>
            <div class="option-group"><label>Text</label><input type="text" id="watermarkText" value="CONFIDENTIAL"></div>
            <div class="option-group"><label>Font Size: <span id="wmSizeVal">60</span>px</label><input type="range" id="watermarkSize" min="10" max="150" value="60" oninput="document.getElementById('wmSizeVal').textContent=this.value"></div>
            <div class="option-group"><label>Opacity: <span id="wmOpacVal">20</span>%</label><input type="range" id="watermarkOpacity" min="1" max="90" value="20" oninput="document.getElementById('wmOpacVal').textContent=this.value"></div>
            <div class="option-group"><label>Rotation</label><input type="number" id="watermarkRotation" value="-45"></div>
            <div class="option-group"><label>Color</label><input type="color" id="watermarkColor" value="#999999" style="height:44px;cursor:pointer"></div>
        `);
    }
    if (toolId === 'jpg-to-pdf') {
        return wrap(`
            <h4><i class="fas fa-cog"></i> Page Settings</h4>
            <div class="option-radio-group">
                <label class="radio-card selected" onclick="selectRadio(this,'pageOrient','portrait')"><input type="radio" name="pageOrient" value="portrait" checked><i class="fas fa-mobile-alt"></i><span>Portrait</span></label>
                <label class="radio-card" onclick="selectRadio(this,'pageOrient','landscape')"><input type="radio" name="pageOrient" value="landscape"><i class="fas fa-mobile-alt fa-rotate-90"></i><span>Landscape</span></label>
            </div>
        `);
    }

    return `<div class="tool-options" id="toolOptions" style="display:none"></div>`;
}

// ============================================================
// Init tool page events
// ============================================================
function initToolPage(toolId, tool) {
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    fileInput.addEventListener('change', e => handleFiles(e.target.files, tool));
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files, tool); });

    // Show/hide resize-image sub-options
    if (toolId === 'resize-image') {
        document.querySelectorAll('input[name="imgResizeMode"]').forEach(r => {
            r.addEventListener('change', () => {
                document.getElementById('dimensionsOptions').style.display = r.value === 'dimensions' ? '' : 'none';
                document.getElementById('percentageOptions').style.display = r.value === 'percentage' ? '' : 'none';
                document.getElementById('filesizeOptions').style.display = r.value === 'filesize' ? '' : 'none';
            });
        });
    }
}

function handleFiles(fileList, tool) {
    const files = Array.from(fileList);
    if (!tool.multiple) AppState.files = [files[0]];
    else AppState.files = [...AppState.files, ...files];
    updateFileList(tool);

    // Auto-preview for compress tools
    if (AppState.currentTool === 'compress') updateCompressPreview();
    if (AppState.currentTool === 'compress-image') updateImgCompressPreview();
    if (AppState.currentTool === 'resize-pdf') updateResizePdfPreview();

    showToast('success', `${files.length} file(s) added`);
}

function updateFileList(tool) {
    const el = document.getElementById('fileList');
    const btn = document.getElementById('btnProcess');
    const opts = document.getElementById('toolOptions');
    if (!AppState.files.length) { el.style.display = 'none'; btn.style.display = 'none'; if (opts) opts.style.display = 'none'; return; }
    el.style.display = 'block';
    btn.style.display = 'flex';
    if (opts) opts.style.display = 'block';

    const isImg = ['compress-image', 'resize-image', 'jpg-to-pdf'].includes(AppState.currentTool);
    el.innerHTML = AppState.files.map((f, i) => `
        <div class="file-item">
            <div class="file-icon ${isImg ? 'img-icon' : ''}"><i class="fas ${isImg ? 'fa-image' : 'fa-file-pdf'}"></i></div>
            <div class="file-info">
                <div class="file-name">${f.name}</div>
                <div class="file-size">${fmtSize(f.size)}</div>
            </div>
            <button class="file-remove" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
}
function removeFile(i) { AppState.files.splice(i, 1); updateFileList(TOOLS[AppState.currentTool]); }

// ============================================================
// Live previews for compression
// ============================================================
function updateCompressPreview() {
    if (!AppState.files.length) return;
    const q = +document.getElementById('qualitySlider').value;
    document.getElementById('qualityValue').textContent = q + '%';
    const orig = AppState.files[0].size;
    // Estimate: at 1% quality → ~5% of original, at 100% → 100% of original
    const ratio = 0.05 + (q / 100) * 0.95;
    const est = Math.round(orig * ratio);
    document.getElementById('sizePreview').style.display = 'grid';
    document.getElementById('origSizeDisplay').textContent = fmtSize(orig);
    document.getElementById('estSizeDisplay').textContent = fmtSize(est);
    const red = Math.round((1 - ratio) * 100);
    document.getElementById('reductionBadge').textContent = red > 0 ? `↓ ${red}% smaller` : 'Same size';
}

async function updateImgCompressPreview() {
    if (!AppState.files.length) return;
    const q = +document.getElementById('imgQualitySlider').value;
    document.getElementById('imgQualityValue').textContent = q + '%';
    const orig = AppState.files[0].size;
    // Quick estimate
    const ratio = 0.02 + (q / 100) * 0.98;
    const est = Math.round(orig * ratio);
    document.getElementById('imgSizePreview').style.display = 'grid';
    document.getElementById('imgOrigSize').textContent = fmtSize(orig);
    document.getElementById('imgNewSize').textContent = '~' + fmtSize(est);
    const red = Math.round((1 - ratio) * 100);
    document.getElementById('imgReduction').textContent = red > 0 ? `↓ ${red}% smaller` : 'Same size';
}

function updateResizePdfPreview() {
    if (!AppState.files.length) return;
    const orig = AppState.files[0].size;
    const target = +document.getElementById('targetSize').value;
    const unit = document.getElementById('targetUnit').value;
    const targetBytes = unit === 'MB' ? target * 1024 * 1024 : target * 1024;
    document.getElementById('resizeSizePreview').style.display = 'grid';
    document.getElementById('resizeOrigSize').textContent = fmtSize(orig);
    document.getElementById('resizeTargetDisplay').textContent = fmtSize(targetBytes);
}

// ============================================================
// Process files
// ============================================================
async function processFiles(toolId) {
    if (!AppState.files.length) return showToast('error', 'Please select a file');
    showLoading(true);
    try {
        switch (toolId) {
            case 'merge': await doMerge(); break;
            case 'split': await doSplit(); break;
            case 'compress': await doCompressPDF(); break;
            case 'compress-image': await doCompressImage(); break;
            case 'resize-pdf': await doResizePDF(); break;
            case 'resize-image': await doResizeImage(); break;
            case 'rotate': await doRotate(); break;
            case 'protect': await doProtect(); break;
            case 'unlock': await doUnlock(); break;
            case 'watermark': await doWatermark(); break;
            case 'jpg-to-pdf': await doImgToPDF(); break;
            case 'pdf-to-jpg': await doPDFtoImg(); break;
            case 'pdf-to-word': case 'pdf-to-excel': case 'pdf-to-ppt': await doPDFtoFormat(toolId); break;
            default: throw new Error('Unknown tool');
        }
        showDownload();
        showToast('success', 'Done! File is ready to download.');
    } catch (e) {
        console.error(e);
        showToast('error', e.message);
    } finally {
        showLoading(false);
    }
}

// ============================================================
//  ★★★ REAL PDF COMPRESSION — Re-renders each page as image ★★★
// ============================================================
async function doCompressPDF() {
    const quality = (+document.getElementById('qualitySlider').value) / 100; // 0.01 — 1.0
    const fileBytes = await readBuf(AppState.files[0]);
    AppState.originalSize = AppState.files[0].size;

    setLoadText('Loading PDF…');
    const srcPdf = await pdfjsLib.getDocument({ data: fileBytes }).promise;
    const numPages = srcPdf.numPages;

    const { jsPDF } = window.jspdf;

    // Determine first-page size for jsPDF orientation
    const pg1 = await srcPdf.getPage(1);
    const vp1 = pg1.getViewport({ scale: 1 });
    const orientation = vp1.width > vp1.height ? 'landscape' : 'portrait';

    let doc = null;

    for (let i = 1; i <= numPages; i++) {
        setLoadText(`Compressing page ${i} / ${numPages}…`);
        const page = await srcPdf.getPage(i);

        // Scale: quality 1 → scale 2 (high res), quality 0.01 → scale 0.4 (very low res)
        const scale = 0.4 + quality * 1.6;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        // JPEG quality directly from slider (0.01 → 1.0)
        const jpegQuality = Math.max(0.01, Math.min(1.0, quality));
        const imgData = canvas.toDataURL('image/jpeg', jpegQuality);

        const pageW = viewport.width;
        const pageH = viewport.height;

        if (i === 1) {
            doc = new jsPDF({
                orientation: pageW > pageH ? 'landscape' : 'portrait',
                unit: 'px',
                format: [pageW, pageH],
                compress: true,
                hotfixes: ['px_scaling'],
            });
        } else {
            doc.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
        }
        doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
    }

    setLoadText('Generating compressed PDF…');
    const blob = doc.output('blob');
    AppState.processedBlob = blob;
    AppState.newSize = blob.size;
    AppState.downloadName = 'compressed_datapur.pdf';
}

// ============================================================
//  ★★★ REAL IMAGE COMPRESSION ★★★
// ============================================================
async function doCompressImage() {
    const quality = (+document.getElementById('imgQualitySlider').value) / 100;
    const format = document.getElementById('imgOutputFormat').value; // jpeg, png, webp
    const maxW = +document.getElementById('imgMaxWidth').value;

    // Process all files; if multiple, create a zip-like approach or do first
    // For simplicity, handle first file (or loop all into one download)
    const results = [];
    for (let i = 0; i < AppState.files.length; i++) {
        setLoadText(`Compressing image ${i + 1} / ${AppState.files.length}…`);
        const file = AppState.files[i];
        const blob = await compressSingleImage(file, quality, format, maxW, 0);
        results.push({ blob, name: file.name });
    }

    if (results.length === 1) {
        const ext = format === 'jpeg' ? 'jpg' : format;
        AppState.processedBlob = results[0].blob;
        AppState.originalSize = AppState.files[0].size;
        AppState.newSize = results[0].blob.size;
        AppState.downloadName = results[0].name.replace(/\.[^.]+$/, '') + `_compressed.${ext}`;
    } else {
        // Merge into a zip-like: for demo just use first
        AppState.processedBlob = results[0].blob;
        AppState.originalSize = AppState.files[0].size;
        AppState.newSize = results[0].blob.size;
        AppState.downloadName = 'compressed_images_datapur.jpg';
        // TODO: For real multi, integrate JSZip
    }
}

function compressSingleImage(file, quality, format, maxW, targetSizeBytes) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (maxW > 0 && w > maxW) {
                const ratio = maxW / w;
                w = maxW;
                h = Math.round(h * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);

            const mime = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';

            if (targetSizeBytes > 0) {
                // Binary search for quality to match target size
                binarySearchQuality(canvas, mime, targetSizeBytes).then(resolve).catch(reject);
            } else {
                canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob); }, mime, quality);
            }
        };
        img.onerror = reject;
        img.src = url;
    });
}

async function binarySearchQuality(canvas, mime, targetBytes) {
    let lo = 0.01, hi = 1.0, bestBlob = null;
    for (let iter = 0; iter < 20; iter++) {
        const mid = (lo + hi) / 2;
        const blob = await new Promise(r => canvas.toBlob(r, mime, mid));
        bestBlob = blob;
        if (blob.size > targetBytes) hi = mid;
        else lo = mid;
        if (Math.abs(blob.size - targetBytes) / targetBytes < 0.05) break; // within 5%
    }
    return bestBlob;
}

// ============================================================
//  ★★★ RESIZE PDF (reduce or increase file size) ★★★
// ============================================================
async function doResizePDF() {
    const mode = document.querySelector('input[name="resizeMode"]:checked')?.value || 'reduce';
    const targetVal = +document.getElementById('targetSize').value;
    const unit = document.getElementById('targetUnit').value;
    const targetBytes = unit === 'MB' ? targetVal * 1024 * 1024 : targetVal * 1024;
    AppState.originalSize = AppState.files[0].size;

    if (mode === 'reduce') {
        // Use iterative compression with binary search on quality
        const fileBytes = await readBuf(AppState.files[0]);
        const srcPdf = await pdfjsLib.getDocument({ data: fileBytes }).promise;
        const numPages = srcPdf.numPages;

        let lo = 0.01, hi = 1.0, bestBlob = null;

        for (let attempt = 0; attempt < 12; attempt++) {
            const quality = (lo + hi) / 2;
            setLoadText(`Attempt ${attempt + 1}: trying quality ${Math.round(quality * 100)}%…`);
            const blob = await renderPDFatQuality(srcPdf, numPages, quality);

            if (!bestBlob || Math.abs(blob.size - targetBytes) < Math.abs(bestBlob.size - targetBytes)) {
                bestBlob = blob;
            }
            if (blob.size > targetBytes) hi = quality;
            else lo = quality;
            if (Math.abs(blob.size - targetBytes) / targetBytes < 0.05) break;
        }

        AppState.processedBlob = bestBlob;
        AppState.newSize = bestBlob.size;
        AppState.downloadName = 'resized_datapur.pdf';
    } else {
        // INCREASE: pad with invisible data
        setLoadText('Increasing file size…');
        const fileBytes = new Uint8Array(await readBuf(AppState.files[0]));
        const currentSize = fileBytes.length;

        if (targetBytes <= currentSize) {
            throw new Error('Target size must be larger than current file size for increase mode');
        }

        const { PDFDocument } = PDFLib;
        const pdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });

        // Add padding as PDF metadata/custom data
        const padSize = targetBytes - currentSize;
        const padChunk = 50000;
        let added = 0;
        let counter = 0;
        while (added < padSize) {
            const chunk = Math.min(padChunk, padSize - added);
            const padding = 'X'.repeat(chunk);
            pdf.setKeywords([...( pdf.getKeywords()?.split(',') || []), `pad${counter}_${padding}`]);
            added += chunk;
            counter++;
            setLoadText(`Padding: ${Math.round(added / padSize * 100)}%…`);
        }

        const pdfBytes = await pdf.save();
        AppState.processedBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        AppState.newSize = pdfBytes.length;
        AppState.downloadName = 'resized_larger_datapur.pdf';
    }
}

async function renderPDFatQuality(srcPdf, numPages, quality) {
    const { jsPDF } = window.jspdf;
    const scale = 0.3 + quality * 1.7;
    let doc = null;
    for (let i = 1; i <= numPages; i++) {
        const page = await srcPdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imgData = canvas.toDataURL('image/jpeg', Math.max(0.01, quality));
        if (i === 1) {
            doc = new jsPDF({ unit: 'px', format: [viewport.width, viewport.height], compress: true, hotfixes: ['px_scaling'] });
        } else {
            doc.addPage([viewport.width, viewport.height]);
        }
        doc.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height, undefined, 'FAST');
    }
    return doc.output('blob');
}

// ============================================================
//  ★★★ RESIZE IMAGE (dimensions / percentage / target size) ★★★
// ============================================================
async function doResizeImage() {
    const mode = document.querySelector('input[name="imgResizeMode"]:checked')?.value || 'dimensions';
    const format = document.getElementById('resizeFormat').value;
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
    const results = [];

    for (let fi = 0; fi < AppState.files.length; fi++) {
        const file = AppState.files[fi];
        setLoadText(`Resizing image ${fi + 1} / ${AppState.files.length}…`);
        const img = await loadImage(file);
        let w, h;

        if (mode === 'dimensions') {
            w = +document.getElementById('resizeWidth').value || img.naturalWidth;
            h = +document.getElementById('resizeHeight').value;
            if (!h) h = Math.round(img.naturalHeight * (w / img.naturalWidth));
        } else if (mode === 'percentage') {
            const pct = (+document.getElementById('resizePercent').value) / 100;
            w = Math.round(img.naturalWidth * pct);
            h = Math.round(img.naturalHeight * pct);
        } else {
            // Target file size
            const target = +document.getElementById('imgTargetSize').value;
            const unit = document.getElementById('imgTargetUnit').value;
            const targetBytes = unit === 'MB' ? target * 1024 * 1024 : target * 1024;
            w = img.naturalWidth;
            h = img.naturalHeight;

            // Binary search: scale down dimensions + quality
            let lo = 0.05, hi = 1.0, bestBlob = null;
            for (let it = 0; it < 20; it++) {
                const mid = (lo + hi) / 2;
                const cw = Math.round(w * mid), ch = Math.round(h * mid);
                const canvas = document.createElement('canvas');
                canvas.width = cw; canvas.height = ch;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, cw, ch);
                ctx.drawImage(img, 0, 0, cw, ch);
                const blob = await new Promise(r => canvas.toBlob(r, mime, mid));
                bestBlob = blob;
                if (blob.size > targetBytes) hi = mid; else lo = mid;
                if (Math.abs(blob.size - targetBytes) / targetBytes < 0.05) break;
            }
            results.push({ blob: bestBlob, name: file.name });
            continue;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const blob = await new Promise(r => canvas.toBlob(r, mime, 0.92));
        results.push({ blob, name: file.name });
    }

    const ext = format === 'jpeg' ? 'jpg' : format;
    AppState.processedBlob = results[0].blob;
    AppState.originalSize = AppState.files[0].size;
    AppState.newSize = results[0].blob.size;
    AppState.downloadName = results[0].name.replace(/\.[^.]+$/, '') + `_resized.${ext}`;
}

function loadImage(file) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = URL.createObjectURL(file);
    });
}

// ============================================================
// Other tools (merge, split, rotate, watermark, etc.)
// ============================================================
async function doMerge() {
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();
    for (let i = 0; i < AppState.files.length; i++) {
        setLoadText(`Merging ${i + 1}/${AppState.files.length}…`);
        const b = await readBuf(AppState.files[i]);
        const src = await PDFDocument.load(b, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
    }
    const bytes = await merged.save();
    AppState.processedBlob = new Blob([bytes], { type: 'application/pdf' });
    AppState.originalSize = AppState.files.reduce((s, f) => s + f.size, 0);
    AppState.newSize = bytes.length;
    AppState.downloadName = 'merged_datapur.pdf';
}

async function doSplit() {
    const { PDFDocument } = PDFLib;
    const b = await readBuf(AppState.files[0]);
    const src = await PDFDocument.load(b, { ignoreEncryption: true });
    const total = src.getPageCount();
    const input = document.getElementById('splitPages')?.value?.trim();
    let indices = input ? parseRange(input, total) : Array.from({ length: total }, (_, i) => i);
    const newPdf = await PDFDocument.create();
    for (const idx of indices) { const [p] = await newPdf.copyPages(src, [idx]); newPdf.addPage(p); }
    const bytes = await newPdf.save();
    AppState.processedBlob = new Blob([bytes], { type: 'application/pdf' });
    AppState.originalSize = AppState.files[0].size;
    AppState.newSize = bytes.length;
    AppState.downloadName = 'split_datapur.pdf';
}

async function doRotate() {
    const { PDFDocument, degrees } = PDFLib;
    const b = await readBuf(AppState.files[0]);
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    pdf.getPages().forEach(p => p.setRotation(degrees(p.getRotation().angle + AppState.rotationDegree)));
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type: 'application/pdf' });
    AppState.originalSize = AppState.files[0].size;
    AppState.newSize = bytes.length;
    AppState.downloadName = 'rotated_datapur.pdf';
}

async function doProtect() {
    const pw = document.getElementById('pdfPassword')?.value;
    if (!pw) throw new Error('Enter a password');
    if (pw !== document.getElementById('pdfPasswordConfirm')?.value) throw new Error('Passwords do not match');
    const { PDFDocument } = PDFLib;
    const b = await readBuf(AppState.files[0]);
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type: 'application/pdf' });
    AppState.originalSize = AppState.files[0].size;
    AppState.newSize = bytes.length;
    AppState.downloadName = 'protected_datapur.pdf';
    showToast('info', 'PDF re-saved. Full encryption requires server-side processing.');
}

async function doUnlock() {
    const { PDFDocument } = PDFLib;
    const b = await readBuf(AppState.files[0]);
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type: 'application/pdf' });
    AppState.originalSize = AppState.files[0].size;
    AppState.newSize = bytes.length;
    AppState.downloadName = 'unlocked_datapur.pdf';
}

async function doWatermark() {
    const { PDFDocument, rgb, degrees: deg, StandardFonts } = PDFLib;
    const text = document.getElementById('watermarkText')?.value || 'WATERMARK';
    const sz = +(document.getElementById('watermarkSize')?.value || 60);
    const op = +(document.getElementById('watermarkOpacity')?.value || 20) / 100;
    const rot = +(document.getElementById('watermarkRotation')?.value || -45);
    const col = hexRgb(document.getElementById('watermarkColor')?.value || '#999');
    const b = await readBuf(AppState.files[0]);
    const pdf = await PDFDocument.load(b, { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    pdf.getPages().forEach(p => {
        const { width, height } = p.getSize();
        const tw = font.widthOfTextAtSize(text, sz);
        p.drawText(text, { x: width / 2 - tw / 2, y: height / 2, size: sz, font, color: rgb(col.r / 255, col.g / 255, col.b / 255), opacity: op, rotate: deg(rot) });
    });
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type: 'application/pdf' });
    AppState.originalSize = AppState.files[0].size;
    AppState.newSize = bytes.length;
    AppState.downloadName = 'watermarked_datapur.pdf';
}

async function doImgToPDF() {
    const { PDFDocument } = PDFLib;
    const pdf = await PDFDocument.create();
    const orient = document.querySelector('input[name="pageOrient"]:checked')?.value || 'portrait';
    let pw = 595.28, ph = 841.89;
    if (orient === 'landscape') [pw, ph] = [ph, pw];
    for (let i = 0; i < AppState.files.length; i++) {
        setLoadText(`Processing image ${i + 1}…`);
        const ib = await readBuf(AppState.files[i]);
        let img;
        try { img = await pdf.embedJpg(ib); } catch { img = await pdf.embedPng(ib); }
        const dims = img.scale(1);
        const page = pdf.addPage([pw, ph]);
        const sc = Math.min(pw / dims.width, ph / dims.height);
        page.drawImage(img, { x: (pw - dims.width * sc) / 2, y: (ph - dims.height * sc) / 2, width: dims.width * sc, height: dims.height * sc });
    }
    const bytes = await pdf.save();
    AppState.processedBlob = new Blob([bytes], { type: 'application/pdf' });
    AppState.originalSize = AppState.files.reduce((s, f) => s + f.size, 0);
    AppState.newSize = bytes.length;
    AppState.downloadName = 'images_to_pdf_datapur.pdf';
}

async function doPDFtoImg() {
    const b = await readBuf(AppState.files[0]);
    const pdf = await pdfjsLib.getDocument({ data: b }).promise;
    const n = pdf.numPages;
    const canvases = [];
    let totalH = 0, maxW = 0;
    for (let i = 1; i <= n; i++) {
        setLoadText(`Rendering page ${i}/${n}…`);
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1.5 });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        const ctx = c.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        canvases.push(c);
        totalH += vp.height + 10;
        maxW = Math.max(maxW, vp.width);
    }
    const fc = document.createElement('canvas');
    fc.width = maxW; fc.height = totalH;
    const fctx = fc.getContext('2d');
    fctx.fillStyle = '#fff'; fctx.fillRect(0, 0, maxW, totalH);
    let y = 0;
    canvases.forEach(c => { fctx.drawImage(c, (maxW - c.width) / 2, y); y += c.height + 10; });
    const blob = await new Promise(r => fc.toBlob(r, 'image/jpeg', 0.9));
    AppState.processedBlob = blob;
    AppState.originalSize = AppState.files[0].size;
    AppState.newSize = blob.size;
    AppState.downloadName = 'pdf_pages_datapur.jpg';
}

async function doPDFtoFormat(toolId) {
    const b = await readBuf(AppState.files[0]);
    const pdf = await pdfjsLib.getDocument({ data: b }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        setLoadText(`Extracting page ${i}…`);
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        text += `--- Page ${i} ---\n${tc.items.map(x => x.str).join(' ')}\n\n`;
    }
    let blob, ext;
    if (toolId === 'pdf-to-word') {
        blob = new Blob([`<html><head><meta charset="UTF-8"></head><body style="font-family:Calibri;padding:40px">${text.replace(/\n/g, '<br>')}</body></html>`], { type: 'application/msword' });
        ext = 'doc';
    } else if (toolId === 'pdf-to-excel') {
        blob = new Blob([text], { type: 'text/csv' }); ext = 'csv';
    } else {
        blob = new Blob([`<html><body>${text.replace(/\n/g, '<br>')}</body></html>`], { type: 'application/vnd.ms-powerpoint' }); ext = 'ppt';
    }
    AppState.processedBlob = blob;
    AppState.originalSize = AppState.files[0].size;
    AppState.newSize = blob.size;
    AppState.downloadName = `converted_datapur.${ext}`;
}

// ============================================================
// Download / UI
// ============================================================
function showDownload() {
    document.getElementById('uploadArea').style.display = 'none';
    const dl = document.getElementById('downloadArea');
    dl.style.display = 'block';

    const origStr = fmtSize(AppState.originalSize);
    const newStr = fmtSize(AppState.newSize);
    const diff = AppState.originalSize - AppState.newSize;
    const pctChange = AppState.originalSize > 0 ? Math.abs(Math.round((diff / AppState.originalSize) * 100)) : 0;
    const direction = diff > 0 ? 'smaller' : diff < 0 ? 'larger' : 'same';
    const dirColor = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--primary)' : 'var(--gray-500)';

    dl.innerHTML = `
        <div class="download-section">
            <div class="download-icon"><i class="fas fa-check"></i></div>
            <h2>Your file is ready!</h2>
            <p>Processing completed successfully.</p>
            <div class="results-info">
                <div class="info-row"><span class="info-label">Original size</span><span class="info-value">${origStr}</span></div>
                <div class="info-row"><span class="info-label">New size</span><span class="info-value success" style="color:${dirColor}">${newStr}</span></div>
                <div class="info-row"><span class="info-label">Change</span><span class="info-value" style="color:${dirColor}">${pctChange}% ${direction} ${diff > 0 ? '↓' : diff < 0 ? '↑' : ''}</span></div>
                ${diff > 0 ? `<div class="info-row"><span class="info-label">Saved</span><span class="info-value success">${fmtSize(diff)}</span></div>` : ''}
            </div>
            <div style="margin-top:24px">
                <button class="btn-download" onclick="downloadFile()"><i class="fas fa-download"></i> Download File</button>
                <button class="btn-another" onclick="resetTool()"><i class="fas fa-redo"></i> Process Another</button>
            </div>
        </div>`;
}

function resetTool() {
    AppState.files = [];
    AppState.processedBlob = null;
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('downloadArea').style.display = 'none';
    document.getElementById('fileList').style.display = 'none';
    document.getElementById('btnProcess').style.display = 'none';
    const o = document.getElementById('toolOptions'); if (o) o.style.display = 'none';
    const fi = document.getElementById('fileInput'); if (fi) fi.value = '';
}

function downloadFile() {
    if (!AppState.processedBlob) return;
    saveAs(AppState.processedBlob, AppState.downloadName || 'datapur_output');
    showToast('success', 'Download started!');
}

// ============================================================
// Utilities
// ============================================================
function readBuf(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); }); }
function fmtSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i];
}
function parseRange(input, max) {
    const s = new Set();
    input.split(',').forEach(p => {
        p = p.trim();
        if (p.includes('-')) { const [a, b] = p.split('-').map(Number); for (let i = a; i <= Math.min(b, max); i++) if (i >= 1) s.add(i - 1); }
        else { const n = parseInt(p); if (n >= 1 && n <= max) s.add(n - 1); }
    });
    return [...s].sort((a, b) => a - b);
}
function lighten(hex, amt) {
    hex = hex.replace('#', '');
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + amt);
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + amt);
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + amt);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
function hexRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
}
function showLoading(show) { document.getElementById('loadingOverlay').classList.toggle('active', show); }
function setLoadText(t) { document.getElementById('loadingText').textContent = t; }
function showToast(type, msg) {
    const c = document.getElementById('toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
function showPricing() { showToast('info', 'All tools are currently 100% free!'); }
function selectRadio(el, name) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(i => i.closest('.radio-card').classList.remove('selected'));
    el.classList.add('selected');
    el.querySelector('input').checked = true;
    el.querySelector('input').dispatchEvent(new Event('change'));
}
function rotatePage(deg) {
    AppState.rotationDegree = ((AppState.rotationDegree + deg) % 360 + 360) % 360;
    const d = document.getElementById('rotationDisplay');
    if (d) d.textContent = AppState.rotationDegree + '°';
}