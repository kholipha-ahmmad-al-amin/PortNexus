// PortNexus Client Application Logic
// Implements interactive document OCR upload, SWIFT MT700 parsing,
// UCP 600 audits, HS code tariff calculations, Graph RAG traversal, and Contextual RAG search.

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initMobileDrawer();
    initDocumentUpload();
    initSwiftParser();
    initAuditor();
    initHSCode();
    initGraphRAG();
    initContextualRAG();
    initHistory();
    initTelemetry();
    initCopyPrompt();
    initScrollReveal();
});

// 1. Accessible Tab Switching
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');

            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            panes.forEach(p => {
                p.classList.remove('active');
                p.classList.remove('pn-animate-fade-up');
            });

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                targetPane.classList.add('pn-animate-fade-up');
            }
        });
    });
}

// 2. Pillar 1: Document Upload & Multimodal OCR
function initDocumentUpload() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileList = document.getElementById('file-list');
    const btnClear = document.getElementById('btn-clear-upload');
    const btnUpload = document.getElementById('btn-upload-and-audit');
    const uploadProgress = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressLabel = document.getElementById('upload-progress-label');
    const swiftInput = document.getElementById('upload-swift-message');

    let selectedFiles = [];

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            addFiles(dt.files);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
            addFiles(fileInput.files);
        }
    });

    function addFiles(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const exists = selectedFiles.some(f => f.name === file.name && f.size === file.size);
            if (!exists) {
                selectedFiles.push(file);
            }
        }
        renderFileList();
    }

    function renderFileList() {
        if (selectedFiles.length === 0) {
            fileList.style.display = 'none';
            fileList.innerHTML = '';
            return;
        }

        fileList.style.display = 'flex';
        fileList.innerHTML = selectedFiles.map((file, idx) => `
            <div class="file-item">
                <div class="file-item-info">
                    <span class="file-item-name">${escapeHtml(file.name)}</span>
                    <span class="file-item-size">(${formatBytes(file.size)})</span>
                </div>
                <button type="button" class="file-item-remove" data-index="${idx}" aria-label="Remove ${escapeHtml(file.name)}">Remove</button>
            </div>
        `).join('');

        fileList.querySelectorAll('.file-item-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                selectedFiles.splice(idx, 1);
                renderFileList();
            });
        });
    }

    const btnSample = document.getElementById('btn-load-sample-upload');
    if (btnSample) {
        btnSample.addEventListener('click', () => {
            const lcContent = `DOCUMENTARY CREDIT NUMBER: LC2026/ABBL/001
DATE OF ISSUE: 2026-10-01
EXPIRY DATE: 2026-11-30 DHAKA, BANGLADESH
APPLICANT: H&M HENNES & MAURITZ GBC AB, STOCKHOLM, SWEDEN
BENEFICIARY: APEX TEXTILE MILLS LTD, DHAKA, BANGLADESH
CURRENCY CODE / AMOUNT: USD 125,000.00
PORT OF LOADING: CHATTOGRAM PORT, BANGLADESH
PORT OF DISCHARGE: PORT OF ROTTERDAM, NETHERLANDS
LATEST SHIPMENT DATE: 2026-11-15
DESCRIPTION OF GOODS: 100% COMBED COTTON KNITTED T-SHIRTS IN ASSORTED SIZES (EXPORT QUALITY)`;

            const invContent = `COMMERCIAL INVOICE
INVOICE NO: INV-2026-88
DATE: 2026-11-05
BUYER: H&M HENNES & MAURITZ GBC AB, STOCKHOLM, SWEDEN
SELLER: APEX TEXTILE MILLS LTD, DHAKA, BANGLADESH
L/C REFERENCE: LC2026/ABBL/001
DESCRIPTION OF GOODS: 100% COMBED COTTON KNITTED T-SHIRTS IN ASSORTED SIZES (EXPORT QUALITY)
TOTAL INVOICE VALUE: USD 125,000.00
PORT OF LOADING: CHATTOGRAM PORT, BANGLADESH
PORT OF DISCHARGE: PORT OF ROTTERDAM, NETHERLANDS
SHIPPED PER: MV OCEAN TRADER`;

            const lcBlob = new Blob([lcContent], { type: 'text/plain' });
            const invBlob = new Blob([invContent], { type: 'text/plain' });
            const lcFile = new File([lcBlob], 'Sample_Letter_of_Credit_LC2026.txt', { type: 'text/plain' });
            const invFile = new File([invBlob], 'Sample_Commercial_Invoice_INV2026.txt', { type: 'text/plain' });

            selectedFiles = [lcFile, invFile];
            renderFileList();

            if (swiftInput) {
                swiftInput.value = `{1:F01ABABDHDH0000000000}{2:I700XXXXXXXXXBBBBB}{4:\n:40A:IRREVOCABLE\n:20:LC2026/ABBL/001\n:31C:261001\n:31D:261130 DHAKA\n:50:H&M HENNES & MAURITZ GBC AB\nSTOCKHOLM, SWEDEN\n:59:APEX TEXTILE MILLS LTD\nDHAKA, BANGLADESH\n:32B:USD125000,00\n:45A:100% COMBED COTTON KNITTED T-SHIRTS IN ASSORTED SIZES (EXPORT QUALITY)\n:44A:CHATTOGRAM PORT, BANGLADESH\n:44B:PORT OF ROTTERDAM, NETHERLANDS\n:44C:261115\n-}`;
            }
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            selectedFiles = [];
            if (fileInput) fileInput.value = '';
            if (swiftInput) swiftInput.value = '';
            renderFileList();
            const output = document.getElementById('upload-audit-output');
            const badge = document.getElementById('upload-audit-badge');
            const certSec = document.getElementById('upload-cert-section');
            if (output) output.innerHTML = '<p>Upload documents above to run a full UCP 600 compliance audit. The AI engine will extract all fields and check every discrepancy.</p>';
            if (badge) {
                badge.className = 'badge badge-neutral';
                badge.textContent = 'Waiting for upload';
            }
            if (certSec) certSec.style.display = 'none';
        });
    }

    if (btnUpload) {
        btnUpload.addEventListener('click', async () => {
            const swiftMsg = swiftInput ? swiftInput.value.trim() : '';
            if (selectedFiles.length === 0 && !swiftMsg) {
                alert('Please select at least one document file (PDF or image) or paste a SWIFT MT700 message.');
                return;
            }

            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });
            if (swiftMsg) {
                formData.append('swiftMessage', swiftMsg);
            }

            btnUpload.disabled = true;
            if (uploadProgress) {
                uploadProgress.style.display = 'block';
                progressBar.style.width = '30%';
                progressLabel.textContent = 'Extracting document text with OCR engine...';
            }

            try {
                if (progressBar) progressBar.style.width = '60%';
                if (progressLabel) progressLabel.textContent = 'Running UCP 600 documentary cross-examination...';

                const orgKeyInput = document.getElementById('input-org-api-key');
                const orgApiKey = orgKeyInput ? orgKeyInput.value.trim() : '';
                const headers = {};
                if (orgApiKey) headers['x-api-key'] = orgApiKey;

                const res = await fetch('/api/documents/upload-and-audit', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                if (progressBar) progressBar.style.width = '90%';
                if (progressLabel) progressLabel.textContent = 'Finalizing audit and evidence checks...';

                const data = await res.json();
                if (progressBar) progressBar.style.width = '100%';

                if (!res.ok) {
                    throw new Error(data.error || 'Document processing failed.');
                }

                renderUploadAuditResult(data);
            } catch (err) {
                const output = document.getElementById('upload-audit-output');
                if (output) {
                    output.innerHTML = `
                        <div class="discrepancy-item">
                            <div class="discrepancy-header">
                                <span class="discrepancy-title">Processing Error</span>
                                <span class="badge badge-danger">FAILED</span>
                            </div>
                            <div class="discrepancy-msg">${escapeHtml(err.message)}</div>
                        </div>
                    `;
                }
            } finally {
                btnUpload.disabled = false;
                setTimeout(() => {
                    if (uploadProgress) uploadProgress.style.display = 'none';
                }, 800);
            }
        });
    }
}

function renderUploadAuditResult(data) {
    const output = document.getElementById('upload-audit-output');
    const badge = document.getElementById('upload-audit-badge');
    const certSec = document.getElementById('upload-cert-section');
    const downloadLink = document.getElementById('upload-cert-download-link');
    const verifyLink = document.getElementById('upload-cert-verify-link');

    const report = data.auditReport || {};
    const score = report.complianceScore !== undefined ? report.complianceScore : 0;
    const isCompliant = report.status === 'COMPLIANT';

    if (badge) {
        if (isCompliant) {
            badge.className = 'badge badge-success';
            badge.textContent = `COMPLIANT (${score}%)`;
        } else if (report.status === 'CRITICAL_DISCREPANCIES') {
            badge.className = 'badge badge-danger';
            badge.textContent = `REJECTION RISK (${report.totalDiscrepancies || 0} Issues)`;
        } else {
            badge.className = 'badge badge-warning';
            badge.textContent = `WARNINGS DETECTED (${score}%)`;
        }
    }

    let html = `
        <div class="score-display">
            <div class="score-number" style="color: ${isCompliant ? 'var(--color-success)' : 'var(--color-danger)'}">${score}%</div>
            <div class="score-meta">
                <span class="score-title">Documentary Compliance Score</span>
                <span class="score-subtitle">${escapeHtml(report.summary || 'Audit completed across uploaded documents.')}</span>
            </div>
        </div>
    `;

    if (data.extractedDocuments && data.extractedDocuments.length > 0) {
        html += `
            <div style="margin-bottom: 1rem; font-size: 0.85rem; color: var(--color-text-secondary);">
                <strong>Extracted Documents:</strong> ${data.extractedDocuments.map(d => `<span class="badge badge-accent" style="margin-right: 0.3rem;">${escapeHtml(d.toUpperCase())}</span>`).join('')}
            </div>
        `;
    }

    if (report.discrepancies && report.discrepancies.length > 0) {
        html += '<div class="discrepancy-list">';
        report.discrepancies.forEach(d => {
            html += `
                <div class="discrepancy-item">
                    <div class="discrepancy-header">
                        <span class="discrepancy-title">${escapeHtml(d.title || 'Discrepancy')}</span>
                        <span class="badge ${d.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}">${escapeHtml(d.severity || 'WARNING')}</span>
                    </div>
                    <div class="discrepancy-msg">${escapeHtml(d.message || '')}</div>
                    ${d.remediation ? `<div class="discrepancy-remedy"><strong>Remediation:</strong> ${escapeHtml(d.remediation)}</div>` : ''}
                </div>
            `;
        });
        html += '</div>';
    } else {
        html += '<div class="empty-state" style="margin: 1rem 0;"><p>No discrepancies identified. The documents satisfy UCP 600 standards.</p></div>';
    }

    if (report.passedChecks && report.passedChecks.length > 0) {
        html += `
            <div class="passed-checks-section" style="margin-top: 1rem;">
                <h4>Verified Checklist (${report.passedChecks.length} checks)</h4>
                <ul class="checklist">
                    ${report.passedChecks.map(c => `<li><strong>${escapeHtml(c.rule || 'UCP 600')}:</strong> ${escapeHtml(c.detail || '')}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (output) output.innerHTML = html;

    if (data.certificateId && certSec) {
        certSec.style.display = 'block';
        if (downloadLink) {
            downloadLink.href = `/api/certificate/${encodeURIComponent(data.certificateId)}/download`;
        }
        if (verifyLink) {
            verifyLink.href = `/verify?id=${encodeURIComponent(data.certificateId)}`;
        }
    }
}

// 3. Pillar 2: SWIFT MT700 Parser
function initSwiftParser() {
    const btnSample = document.getElementById('btn-load-swift-sample');
    const btnParse = document.getElementById('btn-parse-swift');
    const inputRaw = document.getElementById('swift-raw-input');

    if (btnSample && inputRaw) {
        btnSample.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/swift/sample');
                const data = await res.json();
                if (data.sample) {
                    inputRaw.value = data.sample;
                }
            } catch (err) {
                console.error('Failed to load sample SWIFT message:', err);
            }
        });
    }

    if (btnParse && inputRaw) {
        btnParse.addEventListener('click', async () => {
            const raw = inputRaw.value.trim();
            if (!raw) {
                alert('Please enter or load a raw SWIFT MT700 message.');
                return;
            }

            btnParse.disabled = true;
            btnParse.textContent = 'Parsing & Auditing...';

            try {
                const orgKeyInput = document.getElementById('input-org-api-key');
                const orgApiKey = orgKeyInput ? orgKeyInput.value.trim() : '';
                const headers = { 'Content-Type': 'application/json' };
                if (orgApiKey) headers['x-api-key'] = orgApiKey;

                const res = await fetch('/api/audit/full', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ swiftMessage: raw, orgApiKey })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to parse SWIFT message.');
                }

                renderSwiftAuditResult(data, raw);
            } catch (err) {
                const output = document.getElementById('swift-parse-output');
                if (output) {
                    output.innerHTML = `
                        <div class="discrepancy-item">
                            <div class="discrepancy-header">
                                <span class="discrepancy-title">SWIFT Parse Error</span>
                                <span class="badge badge-danger">FAILED</span>
                            </div>
                            <div class="discrepancy-msg">${escapeHtml(err.message)}</div>
                        </div>
                    `;
                }
            } finally {
                btnParse.disabled = false;
                btnParse.textContent = 'Parse & Audit';
            }
        });
    }
}

function renderSwiftAuditResult(data, rawMessage) {
    const output = document.getElementById('swift-parse-output');
    const badge = document.getElementById('swift-parse-badge');
    const certSec = document.getElementById('swift-cert-section');
    const downloadLink = document.getElementById('swift-cert-download-link');
    const verifyLink = document.getElementById('swift-cert-verify-link');

    const report = data.auditReport || {};
    const score = report.complianceScore !== undefined ? report.complianceScore : 100;

    if (badge) {
        badge.className = 'badge badge-success';
        badge.textContent = `Parsed (${score}% Compliance)`;
    }

    let html = `
        <div class="score-display" style="margin-bottom: 1rem;">
            <div class="score-number" style="color: var(--color-success);">${score}%</div>
            <div class="score-meta">
                <span class="score-title">SWIFT MT700 Verification</span>
                <span class="score-subtitle">ISO 15022 message structure validated against UCP 600 standards.</span>
            </div>
        </div>
    `;

    // Extract some visible tags from rawMessage
    const tags = [
        { tag: ':20:', label: 'L/C Reference', regex: /:20:([^\n\r]+)/ },
        { tag: ':40A:', label: 'Form of Credit', regex: /:40A:([^\n\r]+)/ },
        { tag: ':31C:', label: 'Issue Date', regex: /:31C:([^\n\r]+)/ },
        { tag: ':31D:', label: 'Expiry Date & Place', regex: /:31D:([^\n\r]+)/ },
        { tag: ':32B:', label: 'Currency & Amount', regex: /:32B:([^\n\r]+)/ },
        { tag: ':44A:', label: 'Port of Loading', regex: /:44A:([^\n\r]+)/ },
        { tag: ':44B:', label: 'Port of Discharge', regex: /:44B:([^\n\r]+)/ },
        { tag: ':44C:', label: 'Latest Shipment Date', regex: /:44C:([^\n\r]+)/ },
        { tag: ':45A:', label: 'Goods Description', regex: /:45A:([^:\n\r][\s\S]*?)(?=:\d{2}[A-Z]?:|-}|$)/ },
        { tag: ':50:', label: 'Applicant', regex: /:50:([^:\n\r][\s\S]*?)(?=:\d{2}[A-Z]?:|-}|$)/ },
        { tag: ':59:', label: 'Beneficiary', regex: /:59:([^:\n\r][\s\S]*?)(?=:\d{2}[A-Z]?:|-}|$)/ }
    ];

    html += `
        <h4 style="margin-bottom: 0.5rem;">Parsed ISO 15022 Fields</h4>
        <table class="swift-field-table">
            <thead>
                <tr>
                    <th style="width: 70px;">Tag</th>
                    <th style="width: 140px;">Field Name</th>
                    <th>Extracted Content</th>
                </tr>
            </thead>
            <tbody>
    `;

    tags.forEach(t => {
        const match = rawMessage.match(t.regex);
        if (match && match[1]) {
            html += `
                <tr>
                    <td class="swift-field-tag">${t.tag}</td>
                    <td><strong>${t.label}</strong></td>
                    <td>${escapeHtml(match[1].trim())}</td>
                </tr>
            `;
        }
    });

    html += `
            </tbody>
        </table>
    `;

    if (report.passedChecks && report.passedChecks.length > 0) {
        html += `
            <div class="passed-checks-section" style="margin-top: 1rem;">
                <h4>Passed Compliance Checks</h4>
                <ul class="checklist">
                    ${report.passedChecks.map(c => `<li><strong>${escapeHtml(c.rule || 'UCP 600')}:</strong> ${escapeHtml(c.detail || '')}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    if (output) output.innerHTML = html;

    if (data.certificateId && certSec) {
        certSec.style.display = 'block';
        if (downloadLink) {
            downloadLink.href = `/api/certificate/${encodeURIComponent(data.certificateId)}/download`;
        }
        if (verifyLink) {
            verifyLink.href = `/verify?id=${encodeURIComponent(data.certificateId)}`;
        }
    }
}

// 4. L/C Discrepancy Auditor Engine (Manual Form)
function initAuditor() {
    const btnRunAudit = document.getElementById('btn-run-audit');
    const btnClean = document.getElementById('btn-load-sample-clean');
    const btnDiscrepant = document.getElementById('btn-load-sample-discrepant');

    if (btnClean) {
        btnClean.addEventListener('click', () => {
            document.getElementById('input-lc-beneficiary').value = 'Apex Textile Mills Ltd, Dhaka, Bangladesh';
            document.getElementById('input-inv-beneficiary').value = 'Apex Textile Mills Ltd, Dhaka, Bangladesh';
            document.getElementById('input-lc-goods').value = '100% Combed Cotton Knitted T-Shirts in Assorted Sizes (Export Quality)';
            document.getElementById('input-inv-goods').value = '100% Combed Cotton Knitted T-Shirts in Assorted Sizes (Export Quality)';
            document.getElementById('input-lc-amount').value = '125000';
            document.getElementById('input-inv-amount').value = '125000';
            document.getElementById('input-lc-pod').value = 'Port of Rotterdam, Netherlands';
            document.getElementById('input-bl-pod').value = 'Port of Rotterdam, Netherlands';
            document.getElementById('input-lc-date').value = '2026-11-15';
            document.getElementById('input-bl-date').value = '2026-11-10';
            runAudit();
        });
    }

    if (btnDiscrepant) {
        btnDiscrepant.addEventListener('click', () => {
            document.getElementById('input-lc-beneficiary').value = 'Apex Textile Mills Ltd, Dhaka, Bangladesh';
            document.getElementById('input-inv-beneficiary').value = 'Apex Garments & Knitwear BD Ltd'; // Mismatch
            document.getElementById('input-lc-goods').value = '100% Combed Cotton Knitted T-Shirts in Assorted Sizes (Export Quality)';
            document.getElementById('input-inv-goods').value = 'Cotton T-Shirts, various colors'; // UCP 18c violation
            document.getElementById('input-lc-amount').value = '125000';
            document.getElementById('input-inv-amount').value = '132000'; // Exceeds ceiling
            document.getElementById('input-lc-pod').value = 'Port of Rotterdam, Netherlands';
            document.getElementById('input-bl-pod').value = 'Port of Antwerp, Belgium'; // Port mismatch
            document.getElementById('input-lc-date').value = '2026-11-15';
            document.getElementById('input-bl-date').value = '2026-11-20'; // Late shipment
            runAudit();
        });
    }

    if (btnRunAudit) {
        btnRunAudit.addEventListener('click', runAudit);
    }
}

async function runAudit() {
    const payload = {
        lc: {
            beneficiary: document.getElementById('input-lc-beneficiary').value,
            applicant: 'H&M Hennes & Mauritz GBC AB, Stockholm, Sweden',
            goodsDescription: document.getElementById('input-lc-goods').value,
            amount: parseFloat(document.getElementById('input-lc-amount').value) || 0,
            currency: 'USD',
            portOfLoading: 'Chattogram Port, Bangladesh',
            portOfDischarge: document.getElementById('input-lc-pod').value,
            latestShipmentDate: document.getElementById('input-lc-date').value
        },
        invoice: {
            beneficiary: document.getElementById('input-inv-beneficiary').value,
            applicant: 'H&M Hennes & Mauritz GBC AB, Stockholm, Sweden',
            goodsDescription: document.getElementById('input-inv-goods').value,
            amount: parseFloat(document.getElementById('input-inv-amount').value) || 0,
            currency: 'USD',
            totalCartons: 1250
        },
        bl: {
            portOfLoading: 'Chattogram Port, Bangladesh',
            portOfDischarge: document.getElementById('input-bl-pod').value,
            onBoardDate: document.getElementById('input-bl-date').value,
            totalCartons: 1250
        },
        packingList: {
            totalCartons: 1250
        }
    };

    try {
        const orgKeyInput = document.getElementById('input-org-api-key');
        const headers = { 'Content-Type': 'application/json' };
        if (orgKeyInput?.value.trim()) headers['x-api-key'] = orgKeyInput.value.trim();
        const res = await fetch('/api/audit/trade-package', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        renderAuditResults(data);
    } catch (err) {
        console.error('Audit execution error:', err);
    }
}

function animateScoreCounter(targetScore, element) {
    if (!element) return;
    if (targetScore === null || targetScore === undefined || !Number.isFinite(Number(targetScore))) {
        element.textContent = 'N/A';
        return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.textContent = `${targetScore}%`;
        return;
    }
    const duration = 350;
    const startTime = performance.now();
    const startScore = 0;

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentScore = Math.round(startScore + (targetScore - startScore) * easeProgress);
        element.textContent = `${currentScore}%`;

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = `${targetScore}%`;
        }
    }
    requestAnimationFrame(step);
}

function renderAuditResults(report) {
    const scoreNum = document.getElementById('audit-score-num');
    const badgeStatus = document.getElementById('audit-badge-status');
    const summaryText = document.getElementById('audit-summary-text');
    const discContainer = document.getElementById('discrepancy-container');
    const passedList = document.getElementById('passed-checks-list');

    animateScoreCounter(report.complianceScore, scoreNum);

    if (report.status === 'REVIEW_REQUIRED') {
        scoreNum.style.color = 'var(--color-warning)';
        badgeStatus.className = 'badge badge-warning';
        badgeStatus.textContent = 'HUMAN REVIEW REQUIRED';
        summaryText.textContent = 'The available fields are insufficient to determine a complete audit result. Resolve the review items before relying on this screening.';
    } else if (report.status === 'COMPLIANT') {
        scoreNum.style.color = 'var(--color-success)';
        badgeStatus.className = 'badge badge-success';
        badgeStatus.textContent = 'NO DIFFERENCES FOUND IN CHECKED FIELDS';
        summaryText.textContent = 'The checked fields matched. This result is a screening aid and does not replace bank examination.';
    } else if (report.status === 'CRITICAL_DISCREPANCIES') {
        scoreNum.style.color = 'var(--color-danger)';
        badgeStatus.className = 'badge badge-danger';
        badgeStatus.textContent = `REJECTION RISK (${report.totalDiscrepancies} Discrepancies)`;
        summaryText.textContent = 'Critical discrepancies identified under UCP 600. Bank payment rejection likely.';
    } else if (report.status === 'WARNINGS_DETECTED') {
        scoreNum.style.color = 'var(--color-warning)';
        badgeStatus.className = 'badge badge-warning';
        badgeStatus.textContent = 'REVIEW FINDINGS DETECTED';
        summaryText.textContent = 'Differences were found in the checked fields. A qualified reviewer must assess them.';
    } else {
        scoreNum.style.color = 'var(--color-danger)';
        badgeStatus.className = 'badge badge-danger';
        badgeStatus.textContent = `CRITICAL FINDINGS (${report.totalDiscrepancies || 0})`;
        summaryText.textContent = 'The screening found a high-risk difference that needs review before presentation.';
    }

    // Render Discrepancies
    const discrepancies = report.discrepancies || [];
    const reviewItems = report.reviewItems || [];
    const findings = discrepancies.map(d => `
            <div class="discrepancy-item">
                <div class="discrepancy-header">
                    <span class="discrepancy-title">${escapeHtml(d.title)}</span>
                    <span class="badge ${d.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}">${escapeHtml(d.severity)}</span>
                </div>
                <div class="discrepancy-msg">${escapeHtml(d.message)}</div>
                <div class="discrepancy-remedy"><strong>Remediation:</strong> ${escapeHtml(d.remediation)}</div>
            </div>
        `);
    reviewItems.forEach(item => findings.push(`
            <div class="discrepancy-item">
                <div class="discrepancy-header">
                    <span class="discrepancy-title">${escapeHtml(item.title)}</span>
                    <span class="badge badge-warning">REVIEW REQUIRED</span>
                </div>
                <div class="discrepancy-msg">${escapeHtml((item.missing || []).join('; '))}</div>
            </div>
        `));
    if (findings.length === 0) {
        discContainer.innerHTML = '<div class="empty-state"><p>No differences were found in the fields checked. Human review is still required for legal and banking acceptance.</p></div>';
    } else {
        discContainer.innerHTML = findings.join('');
    }

    // Render Passed Checks
    passedList.innerHTML = (report.passedChecks || []).map(c => `
        <li><strong>${escapeHtml(c.rule)}:</strong> ${escapeHtml(c.detail)}</li>
    `).join('');
}

// 5. WCO HS Code Classification & Tariff Calculator
function initHSCode() {
    const btnClassify = document.getElementById('btn-classify-hs');
    if (btnClassify) {
        btnClassify.addEventListener('click', async () => {
            const desc = document.getElementById('input-commodity-desc').value;
            const val = parseFloat(document.getElementById('input-invoice-val').value) || 0;
            const rate = parseFloat(document.getElementById('input-exchange-rate').value);
            if (!desc.trim() || val <= 0 || !Number.isFinite(rate) || rate <= 0) {
                alert('Enter a commodity description, positive invoice value, and current USD to BDT rate.');
                return;
            }

            try {
                const res = await fetch('/api/hscode/classify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commodityDescription: desc, invoiceValueUsd: val, exchangeRateBdt: rate })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Classification could not be completed.');
                renderHSCodeResults(data, rate);
            } catch (err) {
                console.error('HS classification error:', err);
                alert(err.message);
            }
        });
    }
}

function renderHSCodeResults(data, rate) {
    const pill = document.getElementById('hs-code-pill');
    const valAssessable = document.getElementById('val-assessable');
    const valCd = document.getElementById('val-cd');
    const valVat = document.getElementById('val-vat');
    const valTotal = document.getElementById('val-total-tax');
    const valOrigin = document.getElementById('val-origin-rule');
    const valDocs = document.getElementById('val-docs-list');

    const item = data.classification?.match;
    const duties = data.duties;

    if (!item) {
        pill.textContent = 'No candidate in sample dataset';
        valAssessable.textContent = 'Unavailable';
        valCd.textContent = 'Unavailable';
        valVat.textContent = 'Unavailable';
        valTotal.textContent = 'No tariff estimate';
        valOrigin.textContent = 'No candidate found. Use an authoritative tariff source and qualified classifier.';
        valDocs.innerHTML = '';
        return;
    }

    pill.textContent = `Candidate HS: ${item.code} - Human review required`;
    valAssessable.textContent = duties ? duties.assessableValueBdt.toLocaleString('en-US') : 'Enter value and exchange rate';
    valCd.textContent = duties ? duties.customsDutyBdt.toLocaleString('en-US') : 'Unavailable';
    valVat.textContent = duties ? duties.vatBdt.toLocaleString('en-US') : 'Unavailable';
    valTotal.textContent = duties ? `${duties.totalTaxBdt.toLocaleString('en-US')} BDT (${duties.effectiveDutyRatePercent}%) - indicative only` : 'No tariff estimate';

    valOrigin.textContent = `${data.classification.rationale} Bundled rates are unverified demonstration data, not statutory rates.`;
    valDocs.innerHTML = item.requiredDocs.map(d => `<li>${escapeHtml(d)}</li>`).join('');
}

// 6. Graph RAG Traversal
function initGraphRAG() {
    const btnTraverse = document.getElementById('btn-traverse-graph');
    if (btnTraverse) {
        btnTraverse.addEventListener('click', async () => {
            const comm = document.getElementById('select-graph-commodity').value;
            const port = document.getElementById('select-graph-port').value;

            try {
                const res = await fetch('/api/graph/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ commodityId: comm, destinationPortId: port })
                });
                const data = await res.json();
                renderGraphResults(data);
            } catch (err) {
                console.error('Graph traversal error:', err);
            }
        });
    }
}

function renderGraphResults(data) {
    const output = document.getElementById('graph-traversal-output');
    output.innerHTML = `
        <div class="traversal-step">
            <span class="traversal-step-badge">HOP 1: CLASSIFICATION</span>
            <div>
                <strong>${escapeHtml(data.commodity.label)}</strong> is classified under <strong>${escapeHtml(data.classifiedHS.label)}</strong> (Chapter ${escapeHtml(String(data.classifiedHS.chapter))}).
            </div>
        </div>
        <div class="traversal-step">
            <span class="traversal-step-badge">HOP 2: SHIPPING CORRIDOR</span>
            <div>
                Transit from <strong>${escapeHtml(data.shippingLane.origin)}</strong> to <strong>${escapeHtml(data.shippingLane.destination)}</strong> takes estimated <strong>${escapeHtml(String(data.shippingLane.transitDays))} days</strong>.
            </div>
        </div>
        <div class="traversal-step">
            <span class="traversal-step-badge">HOP 3: PREFERENTIAL TARIFF</span>
            <div>
                Governed by <strong>${escapeHtml(data.tradeAgreement.agreement)}</strong>: ${escapeHtml(data.tradeAgreement.benefit)}.
            </div>
        </div>
        <div class="traversal-step">
            <span class="traversal-step-badge">HOP 4: COMPLIANCE DIRECTIVE</span>
            <div>
                Subject to ${data.applicableRegulations.length > 0 ? data.applicableRegulations.map(r => `<strong>${escapeHtml(r.regNode.label)}</strong> (${escapeHtml(r.requirement)})`).join(' and ') : 'standard international customs protocol'}.
            </div>
        </div>
    `;
}

// 7. Contextual RAG Search
function initContextualRAG() {
    const btnSearch = document.getElementById('btn-search-rag');
    const input = document.getElementById('input-rag-query');

    async function search() {
        const query = input.value;
        try {
            const res = await fetch(`/api/rag/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            renderRAGResults(data.citations);
        } catch (err) {
            console.error('Contextual RAG search error:', err);
        }
    }

    if (btnSearch) {
        btnSearch.addEventListener('click', search);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') search();
        });
    }
}

function renderRAGResults(citations) {
    const container = document.getElementById('rag-results-container');
    if (!citations || citations.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No relevant regulatory clauses matched your query.</p></div>';
        return;
    }

    container.innerHTML = citations.map(c => `
        <div class="rag-result-card">
            <span class="rag-context-tag">${escapeHtml(c.document)} : ${escapeHtml(c.section)}</span>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.4rem;">
                Semantic Focus: ${escapeHtml(c.semanticBoundary)}
            </div>
            <div class="rag-snippet-text">${escapeHtml(c.rawText)}</div>
        </div>
    `).join('');
}

// 8. Live Telemetry
async function initTelemetry() {
    try {
        const resHealth = await fetch('/api/health');
        const dataHealth = await resHealth.json();
        const engStatus = document.getElementById('engine-status');
        if (engStatus) {
            engStatus.textContent = `Online (${dataHealth.memory.heapUsedMb}MB / Node ${dataHealth.runtimes.node})`;
        }

        const resOllama = await fetch('/api/ollama/status');
        const dataOllama = await resOllama.json();
        const ollamaStatus = document.getElementById('ollama-status');
        if (ollamaStatus && dataOllama.status) {
            ollamaStatus.textContent = 'DeepSeek-R1 (Air-Gapped)';
        }
    } catch (err) {
        // Silently tolerate if telemetry is offline
    }
}

// 9. Copy MCP / Master Prompt Buttons
function initCopyPrompt() {
    const btnCopyMcp = document.getElementById('btn-copy-mcp-config');
    const codeMcp = document.getElementById('mcp-config-code');
    if (btnCopyMcp && codeMcp) {
        btnCopyMcp.addEventListener('click', () => {
            navigator.clipboard.writeText(codeMcp.textContent).then(() => {
                const orig = btnCopyMcp.textContent;
                btnCopyMcp.textContent = 'Copied to Clipboard!';
                setTimeout(() => { btnCopyMcp.textContent = orig; }, 2000);
            });
        });
    }
}

// 10. Multi-Tenant Audit Ledger & History
function initHistory() {
    const btnFetch = document.getElementById('btn-fetch-history');
    const apiKeyInput = document.getElementById('input-org-api-key');
    const container = document.getElementById('history-table-container');
    const metaBox = document.getElementById('history-org-meta');
    const orgNameSpan = document.getElementById('history-org-name');
    const orgCountSpan = document.getElementById('history-org-count');

    if (!btnFetch || !apiKeyInput || !container) return;

    btnFetch.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter an organization API key.');
            return;
        }

        btnFetch.disabled = true;
        btnFetch.textContent = 'Fetching...';

        try {
            const res = await fetch('/api/history', {
                headers: { 'x-api-key': apiKey }
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch audit history.');
            }

            if (metaBox && orgNameSpan && orgCountSpan) {
                metaBox.style.display = 'block';
                orgNameSpan.textContent = data.organization || 'Registered Organization';
                orgCountSpan.textContent = data.total || 0;
            }

            const audits = data.audits || [];
            if (audits.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>No audit records found for this organization yet. Run an audit to record your first compliance certificate.</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="ledger-table-wrapper">
                    <table class="ledger-table">
                        <thead>
                            <tr>
                                <th>Certificate ID</th>
                                <th>Consignment Reference</th>
                                <th>Timestamp</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            audits.forEach(item => {
                const isCompliant = item.status === 'COMPLIANT';
                const isCritical = item.status === 'CRITICAL_DISCREPANCIES';
                const badgeClass = isCompliant ? 'badge-success' : (isCritical ? 'badge-danger' : 'badge-warning');
                const consignment = item.trade_consignments || {};
                const ref = consignment.lc_number || consignment.invoice_number || 'Consignment ' + item.cert_id;
                const dateStr = item.audit_timestamp ? new Date(item.audit_timestamp).toLocaleString() : 'N/A';

                html += `
                    <tr>
                        <td>
                            <a href="/verify?id=${encodeURIComponent(item.cert_id)}" target="_blank" style="font-family: var(--font-mono); font-weight: 600; color: var(--color-accent); text-decoration: none;">
                                ${escapeHtml(item.cert_id)}
                            </a>
                        </td>
                        <td>
                            <strong>${escapeHtml(ref)}</strong><br>
                            <small style="color: var(--color-text-muted);">${escapeHtml(consignment.beneficiary || 'N/A')}</small>
                        </td>
                        <td style="font-size: 0.8rem; color: var(--color-text-muted);">${escapeHtml(dateStr)}</td>
                        <td><strong>${item.compliance_score}%</strong></td>
                        <td><span class="badge ${badgeClass}">${escapeHtml(item.status)}</span></td>
                        <td>
                            <a href="/api/certificate/${encodeURIComponent(item.cert_id)}/download" class="btn btn-secondary btn-sm" target="_blank" style="padding: 0.25rem 0.65rem; font-size: 0.75rem; text-decoration: none;">
                                Download PDF
                            </a>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = html;
        } catch (err) {
            container.innerHTML = `
                <div class="discrepancy-item">
                    <div class="discrepancy-header">
                        <span class="discrepancy-title">Query Error</span>
                        <span class="badge badge-danger">FAILED</span>
                    </div>
                    <div class="discrepancy-msg">${escapeHtml(err.message)}</div>
                </div>
            `;
        } finally {
            btnFetch.disabled = false;
            btnFetch.textContent = 'Fetch Ledger Records';
        }
    });
}


// 11. Mobile Drawer Toggle
function initMobileDrawer() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const overlay = document.getElementById('mobileDrawerOverlay');
    const drawer = document.getElementById('mobileDrawer');
    const closeBtn = document.getElementById('btnCloseDrawer');

    if (!toggle || !overlay || !drawer) return;

    function openDrawer() {
        overlay.classList.add('open');
        drawer.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        overlay.classList.remove('open');
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    toggle.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // Auto-close drawer on link click
    drawer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeDrawer);
    });

    // Close drawer on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) {
            closeDrawer();
        }
    });
}

// 12. Scroll Reveal Animations
function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('pn-animate-fade-up');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.feature-card, .card, .stat-box, .proof-item, .faq-card').forEach(el => {
        observer.observe(el);
    });
}

// Helpers
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
