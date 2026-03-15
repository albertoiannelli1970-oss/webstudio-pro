/**
 * WebStudio Pro 1.0 - Interfaccia Utente e Gestione Sandbox
 */

document.addEventListener('DOMContentLoaded', () => {
    // Gestione Navigazione Sidebar
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');

    const viewTitles = {
        'dashboard': { title: 'Dashboard Operativa', desc: 'Benvenuto nel tuo centro di comando unificato.' },
        'data-flow': { title: 'Gestione Flussi & Privacy', desc: 'Controlla quali applicazioni possono scambiarsi informazioni.' },
        'contacts': { title: 'Rubrica Intelligente', desc: 'Gestisci i tuoi contatti, clienti e fornitori.' },
        'quotes': { title: 'Preventivi PRO®', desc: 'Realizza offerte commerciali e trasformale con un click.' },
        'invoices': { title: 'Fatturazione P.IVA (PRO)', desc: 'Crea e gestisci le tue fatture elettroniche sincronizzate.' },
        'inventory': { title: 'Magazzino Intelligente®', desc: 'Controlla le tue giacenze sincronizzate in automatico.' },
        'calendar': { title: 'Agenda Condivisa®', desc: 'Il tuo tempo sotto controllo totale.' },
        'modules': { title: 'Hub Moduli e Sandbox', desc: 'Testa la comunicazione delle tue mini-app installate.' },
        'settings': { title: 'Impostazioni Piattaforma', desc: 'Personalizza il contenitore globale e gli accessi.' },
        'pos': { title: 'Punto Cassa Veloce®', desc: 'Design ottimizzato per operazioni touch.' },
        'fiscal': { title: 'Cassetto Chiusure Fiscali G.d.F.', desc: 'Archivio Sigillato Trasmissioni Agenzia delle Entrate.' },
        'primanota': { title: 'Prima Nota Master®', desc: 'Il battito finanziario della tua azienda. Entrate, Uscite, Banca e Statistiche.' },
        'falco-hq': { title: 'FALCO COMMAND CENTER', desc: 'Pannello di controllo globale per il Creator.' }
    };

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Chiudi il menu a tendina dopo la selezione
            toggleSidebar(false);

            // Rimuovi toggle attivi
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));

            // Setta toggle nuovo
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(`view-${targetId}`).classList.add('active');

            // Cambio Titolo
            const titleEl = document.getElementById('current-page-title');
            const descEl = document.getElementById('current-page-desc');
            if (viewTitles[targetId]) {
                titleEl.textContent = viewTitles[targetId].title;
                descEl.textContent = viewTitles[targetId].desc;
            }
        });
    });

    setupSandboxSimulators();
});

// --- WebStudio UI Logic ---
function toggleSidebar(force) {
    const sidebar = document.getElementById('main-sidebar');
    if(force === true) {
        sidebar.classList.add('open');
    } else if (force === false) {
        sidebar.classList.remove('open');
    } else {
        sidebar.classList.toggle('open');
    }
}

// --- WebStudio Landing Page Logic ---
function showStep2() {
    document.getElementById('landing-step-1').classList.add('hidden');
    document.getElementById('landing-step-2').classList.remove('hidden');
    if(window.lucide) window.lucide.createIcons();
}

function enterApp(type) {
    const overlay = document.getElementById('landing-overlay');
    const app = document.getElementById('app-container');
    
    // Hide overlay with animation
    overlay.style.opacity = '0';
    overlay.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
        overlay.classList.add('hidden');
        app.classList.remove('hidden-app');
        app.classList.add('app-visible');
        
        window.coreSystem.logMessage(`[SECURITY] Accesso autorizzato come profilo: ${type.toUpperCase()}`, 'success');
        
        // Update user profile in sidebar
        const badge = document.querySelector('.user-info span');
        if(badge) badge.textContent = `Profilo: ${type}`;
    }, 800);
}

function setupSandboxSimulators() {
    // Popola dinamicamente le scorciatoie delle App nella Dashboard (Homepage pulita)
    const grid = document.getElementById('quick-launch-grid');
    if(grid) {
        const apps = [
            { id: 'primanota', name: 'Prima Nota®', icon: 'logo-primanota.png' },
            { id: 'contacts', name: 'Rubrica®', icon: 'logo-rubrica.png' },
            { id: 'invoices', name: 'Fatturazione®', icon: 'logo-fatture.png' },
            { id: 'inventory', name: 'Magazzino®', icon: 'logo-magazzino.png' },
            { id: 'calendar', name: 'Agenda®', icon: 'logo-agenda.png' },
            { id: 'pos', name: 'Punto Cassa®', icon: 'logo-cassa.png' },
            { id: 'quotes', name: 'Preventivi®', icon: 'logo-preventivi.png' }
        ];

        let html = '';
        apps.forEach(app => {
            html += `
                <div class="launch-item animate-fade-in" onclick="document.querySelector('.nav-item[data-target=\\'${app.id}\\']').click()">
                    <img src="${app.icon}" alt="${app.name}">
                    <span>${app.name}</span>
                </div>
            `;
        });
        grid.innerHTML = html;
        if(window.lucide) window.lucide.createIcons();
    }
}

/**
 * App: Fatturazione Elettronica
 * Gestisce fatture, calcoli e interfaccia col Core System.
 */
class FattureApp {
    constructor() {
        this.invoices = JSON.parse(localStorage.getItem('webstudio_invoices')) || [];
        // Mantiene una lista locale dei clienti syncati dalla Rubrica
        this.syncedClients = [];
        this.syncedInventory = window.appInventory ? window.appInventory.products : [];
        this.trendChart = null;
        this.statusChart = null;
        this.init();
    }

    init() {
        this.renderStats();
        this.renderInvoices();

        // --- INTEGRAZIONE EVENT BUS (Il Core) ---
        // Al caricamento, se l'interruttore Rubrica->Fatture è Verde, riceve tutti 
        // i clienti creati nell'app Rubrica!
        window.coreSystem.subscribe('fatture', 'nuovo_cliente', (data) => {
            // Se esiste già, aggiorna, altrimenti inserisci
            const existing = this.syncedClients.findIndex(c => c.id === data.id);
            if(existing !== -1) {
                this.syncedClients[existing] = data;
            } else {
                this.syncedClients.push(data);
            }
            this.updateClientDropdown();
        });

        // Nasconde il dropdown al primo caricamento o sincronizza
        window.coreSystem.subscribe('fatture', 'catalogo_aggiornato', (data) => {
            this.syncedInventory = data;
            this.updateInventoryDropdown();
        });

        // Imposta numero fattura autoincrementale base e scadenza a 30 giorni
        const today = new Date();
        document.getElementById('inv-date').valueAsDate = today;
        
        const due30 = new Date(today);
        due30.setDate(due30.getDate() + 30);
        document.getElementById('inv-due-date').valueAsDate = due30;
    }

    updateClientDropdown() {
        const select = document.getElementById('inv-client-select');
        if(!select) return;

        let optionsHtml = '<option value="">-- Manuale / Nessun Cliente Importato --</option>';
        this.syncedClients.forEach(c => {
            optionsHtml += `<option value="${c.id}">${c.nome}</option>`;
        });
        select.innerHTML = optionsHtml;
    }

    autoFillClientData() {
        const val = document.getElementById('inv-client-select').value;
        if(val) {
            const client = this.syncedClients.find(c => c.id == val);
            if(client) {
                document.getElementById('inv-client-name').value = client.nome;
                window.coreSystem.logMessage(`[APP: FATTURE] Dati importati dalla scheda di ${client.nome}.`, 'success');
            }
        }
    }

    updateInventoryDropdown() {
        const select = document.getElementById('inv-inv-select');
        if(!select) return;
        let optionsHtml = '<option value="">-- Seleziona Articolo dal Catalogo --</option>';
        this.syncedInventory.forEach(p => { 
            optionsHtml += `<option value="${p.id}">${p.name} - €${p.price.toFixed(2)}</option>`; 
        });
        select.innerHTML = optionsHtml;
    }

    fillFromInventory() {
        const val = document.getElementById('inv-inv-select').value;
        if(val) {
            const item = this.syncedInventory.find(i => i.id == val);
            if(item) {
                document.getElementById('inv-desc').value = item.name;
                document.getElementById('inv-amount').value = item.price.toFixed(2);
                this.calcTotal();
                window.coreSystem.logMessage(`[APP: FATTURE] Articolo fatturato: ${item.name}`, 'system');
            }
        }
    }

    openNewInvoiceModal() {
        // Genera numero fattura
        const nextNum = this.invoices.length + 1;
        document.getElementById('inv-number').value = `FATT-2026-${nextNum.toString().padStart(3, '0')}`;
        this.updateInventoryDropdown();
        document.getElementById('invoice-modal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('invoice-form').reset();
        document.getElementById('inv-date').valueAsDate = new Date();
        this.calcTotal();
        document.getElementById('invoice-modal').classList.add('hidden');
    }

    calcTotal() {
        const amount = parseFloat(document.getElementById('inv-amount').value) || 0;
        const taxRate = parseFloat(document.getElementById('inv-tax').value) || 0;
        
        const taxAmount = amount * (taxRate / 100);
        const total = amount + taxAmount;

        document.getElementById('inv-tax-amount').textContent = taxAmount.toFixed(2);
        document.getElementById('inv-total-final').textContent = total.toFixed(2);
        
        return { amount, taxAmount, total };
    }

    saveInvoice(e) {
        e.preventDefault();
        
        const totals = this.calcTotal();
        
        const newInvoice = {
            id: Date.now(),
            number: document.getElementById('inv-number').value,
            date: document.getElementById('inv-date').value,
            dueDate: document.getElementById('inv-due-date').value,
            clientName: document.getElementById('inv-client-name').value,
            desc: document.getElementById('inv-desc').value,
            amount: totals.amount,
            total: totals.total,
            status: document.getElementById('inv-status').value // pending, paid, suspended
        };

        this.invoices.push(newInvoice);
        localStorage.setItem('webstudio_invoices', JSON.stringify(this.invoices));
        
        window.coreSystem.logMessage(`[APP: FATTURE] Fattura emessa a ${newInvoice.clientName}. Totale: €${totals.total.toFixed(2)}`, 'action');
        
        // Se c'è un prodotto selezionato e stiamo emettendo, scaliamo
        const selectedProdId = document.getElementById('inv-inv-select')?.value;
        if(selectedProdId && window.appInventory) {
            window.appInventory.deductStock(Number(selectedProdId), 1);
        }

        this.renderStats();
        this.renderInvoices();
        this.closeModal();
    }

    markAsPaid(id) {
        const invoice = this.invoices.find(i => i.id === id);
        if(invoice) {
            // Cicla tra gli stati
            if (invoice.status === 'pending') invoice.status = 'paid';
            else if (invoice.status === 'paid') invoice.status = 'suspended';
            else invoice.status = 'pending';

            localStorage.setItem('webstudio_invoices', JSON.stringify(this.invoices));
            window.coreSystem.logMessage(`[APP: FATTURE] Stato fattura ${invoice.number} modificato in: ${invoice.status}`, 'system');
            this.renderStats();
            this.renderInvoices();
        }
    }

    renderStats() {
        const totalInv = this.invoices.length;
        
        let pendingSum = 0;
        let totalSum = 0;
        let overdueSum = 0;
        
        const today = new Date().toISOString().split('T')[0];

        this.invoices.forEach(inv => {
            totalSum += inv.total;
            if(inv.status === 'pending') {
                pendingSum += inv.total;
                if (inv.dueDate && inv.dueDate < today) {
                    overdueSum += inv.total;
                }
            } else if (inv.status === 'suspended') {
                pendingSum += inv.total;
                overdueSum += inv.total; // Le sospese contano sempre come problematiche/da sollecitare
            }
        });

        document.getElementById('inv-count').textContent = totalInv;
        document.getElementById('inv-total-month').textContent = totalSum.toFixed(2);
        document.getElementById('inv-pending').textContent = pendingSum.toFixed(2);
        
        const elOverdue = document.getElementById('inv-overdue');
        if(elOverdue) elOverdue.textContent = overdueSum.toFixed(2);

        this.renderAlerts(today);
        this.renderCharts();
    }

    renderAlerts(today) {
        const panel = document.getElementById('invoice-alerts-panel');
        if(!panel) return;

        const overdueInvoices = this.invoices.filter(i => (i.status === 'pending' && i.dueDate && i.dueDate < today) || i.status === 'suspended');

        if(overdueInvoices.length > 0) {
            panel.style.display = 'block';
            panel.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; color:var(--danger); font-weight:bold; margin-bottom: 8px;">
                    <i data-lucide="alert-triangle"></i> ATTENZIONE: ${overdueInvoices.length} Documenti Richiedono Azione
                </div>
                <ul style="margin:0; padding-left: 20px; font-size:13px; color:#fca5a5;">
                    ${overdueInvoices.map(i => `
                        <li>Doc. <strong>${i.number}</strong> (${i.clientName}) - €${i.total.toFixed(2)} - 
                        ${i.status === 'suspended' ? 'STATO: SOSPESO/CONTESTATO' : 'SCADUTA IL ' + i.dueDate}
                        </li>
                    `).join('')}
                </ul>
            `;
            lucide.createIcons();
        } else {
            panel.style.display = 'none';
        }
    }

    renderCharts() {
        const trendCanvas = document.getElementById('invoiceTrendChart');
        const statusCanvas = document.getElementById('invoiceStatusChart');
        if (!trendCanvas || !statusCanvas) return;
        
        if (typeof Chart === 'undefined') {
            console.warn("[SYSTEM] Chart.js non trovato. Grafici disabilitati.");
            return;
        }

        // Raccolta dati status
        let paid = 0, pending = 0, suspended = 0;
        this.invoices.forEach(inv => {
            if (inv.status === 'paid') paid += inv.total;
            else if (inv.status === 'suspended') suspended += inv.total;
            else pending += inv.total;
        });

        // Configurazione e aggiornamento Status Chart (Doughnut)
        if (this.statusChart) {
            this.statusChart.destroy();
        }
        this.statusChart = new Chart(statusCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Saldato', 'In Attesa', 'Sospeso'],
                datasets: [{
                    data: [paid, pending, suspended],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
                }
            }
        });

        // Raccolta dati trend (ultimi 6 mesi, semplice simulazione raggruppata per mese-anno)
        const monthlyData = {};
        const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
        
        // Inizializza gli ultimi 6 mesi vuoti
        const d = new Date();
        for(let i=5; i>=0; i--) {
            const tempD = new Date(d.getFullYear(), d.getMonth() - i, 1);
            const key = `${monthNames[tempD.getMonth()]} ${tempD.getFullYear()}`;
            monthlyData[key] = 0;
        }

        this.invoices.forEach(inv => {
            if(inv.status !== 'suspended') {
                const invD = new Date(inv.date);
                const key = `${monthNames[invD.getMonth()]} ${invD.getFullYear()}`;
                if(monthlyData[key] !== undefined) {
                    monthlyData[key] += inv.total;
                }
            }
        });

        const labels = Object.keys(monthlyData);
        const dataVals = Object.values(monthlyData);

        if (this.trendChart) {
            this.trendChart.destroy();
        }
        this.trendChart = new Chart(trendCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Fatturato (€)',
                    data: dataVals,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#8b5cf6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    renderInvoices() {
        const list = document.getElementById('invoices-list');
        if(!list) return;

        if(this.invoices.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i data-lucide="file-x" style="width:40px; height:40px; opacity:0.3; margin-bottom:10px;"></i>
                    <p>Nessuna fattura emessa. Il registro è vuoto.</p>
                </div>`;
            lucide.createIcons();
            return;
        }

        list.innerHTML = '';
        
        const sorted = [...this.invoices].sort((a,b) => b.id - a.id);
        const today = new Date().toISOString().split('T')[0];

        sorted.forEach(inv => {
            let statusColor, statusText, statusIcon;
            let bgColor = 'rgba(0,0,0,0.2)';

            if (inv.status === 'paid') {
                statusColor = 'var(--success)';
                statusText = 'Saldato';
                statusIcon = 'check-circle-2';
            } else if (inv.status === 'suspended') {
                statusColor = 'var(--danger)';
                statusText = 'Sospeso';
                statusIcon = 'alert-octagon';
                bgColor = 'rgba(239, 68, 68, 0.1)';
            } else {
                // Pending
                if (inv.dueDate && inv.dueDate < today) {
                    statusColor = 'var(--danger)';
                    statusText = 'SCADUTA';
                    statusIcon = 'alert-triangle';
                    bgColor = 'rgba(245, 158, 11, 0.1)';
                } else {
                    statusColor = 'var(--warning)';
                    statusText = 'In attesa';
                    statusIcon = 'clock';
                }
            }

            const card = document.createElement('div');
            card.style.cssText = `
                display:flex; justify-content:space-between; align-items:center; 
                padding:15px; margin-bottom:10px; background:${bgColor}; 
                border-radius:12px; border:1px solid ${inv.status === 'suspended' ? 'rgba(239,68,68,0.3)' : 'var(--glass-border)'};
            `;

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:20px; flex: 1;">
                    <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                        <i data-lucide="file-text" style="color:var(--accent);"></i>
                    </div>
                    <div>
                        <h4 style="color:#fff; margin:0 0 4px 0;">${inv.clientName}</h4>
                        <span style="color:var(--text-muted); font-size:12px;">Num: <strong>${inv.number}</strong> | Scadenza: <strong style="color:${inv.status==='pending' && inv.dueDate < today ? 'var(--danger)' : 'inherit'}">${inv.dueDate}</strong></span>
                        <div style="font-size:11px; margin-top:4px; opacity:0.7;">${inv.desc}</div>
                    </div>
                </div>
                <div style="text-align:right; margin-right: 20px;">
                    <h3 style="color:#fff; font-family:'Outfit'; font-size:18px;">€ ${inv.total.toFixed(2)}</h3>
                    <div style="display:inline-flex; align-items:center; gap:4px; font-size:11px; color:${statusColor}; margin-top:5px; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:10px;">
                        <i data-lucide="${statusIcon}" style="width:12px;"></i> ${statusText}
                    </div>
                </div>
                <!-- Nuovi Bottoni Invio -->
                <div style="display:flex; gap: 8px; border-left: 1px solid var(--glass-border); padding-left: 20px;">
                     <button class="btn btn-icon" title="Genera/Stampa e Scarica PDF" onclick="appFatture.generatePDF(${inv.id})">
                        <i data-lucide="printer" style="color:#a855f7;"></i>
                     </button>
                     <button class="btn btn-icon" title="Invia a SDI (Agenzia Entrate)" onclick="appFatture.sendToSDI('${inv.number}')">
                        <i data-lucide="send" style="color:#3b82f6;"></i>
                     </button>
                     <button class="btn btn-icon" title="Invia al Commercialista" onclick="appFatture.sendToAccountant('${inv.number}')">
                        <i data-lucide="briefcase" style="color:#f59e0b;"></i>
                     </button>
                     <button class="btn btn-icon" onclick="appFatture.markAsPaid(${inv.id})" title="Cambia Stato (Attesa / Saldato / Sospeso)">
                        <i data-lucide="refresh-cw"></i>
                     </button>
                </div>
            `;
            list.appendChild(card);
        });
        lucide.createIcons();
    }

    sendToSDI(invNumber) {
        window.coreSystem.logMessage(`[SDI XML] Fattura ${invNumber} firmata digitalmente e inviata in simulazione all'Agenzia delle Entrate.`, 'success');
        alert(`Fattura ${invNumber} inviata con successo allo SDI!`);
    }

    sendToAccountant(invNumber) {
        window.coreSystem.logMessage(`[EXPORT] Fattura ${invNumber} esportata e inviata al pannello del commercialista.`, 'success');
        alert(`Copia di cortesia e file XML della fattura ${invNumber} inviati al tuo Commercialista!`);
    }

    generatePDF(id) {
        const inv = this.invoices.find(i => i.id === id);
        if (!inv) return;

        // Recupera dati emittente dalle impostazioni
        const compData = window.appSettings ? window.appSettings.companyData : {};
        
        // Popola il template invisibile
        document.getElementById('pdf-comp-name').textContent = compData.name || 'La Tua Azienda Srl';
        document.getElementById('pdf-comp-address').textContent = compData.address || 'Indirizzo Sede Legale';
        document.getElementById('pdf-comp-vat').textContent = compData.vat || 'IT00000000000';
        document.getElementById('pdf-comp-sdi').textContent = compData.sdi || '0000000';
        
        const logoTarget = document.getElementById('pdf-comp-logo');
        if (compData.logo) {
            logoTarget.innerHTML = `<img src="${compData.logo}" style="max-height: 50px;">`;
        } else {
            logoTarget.innerHTML = '';
        }

        document.getElementById('pdf-inv-num').textContent = inv.number;
        document.getElementById('pdf-inv-date').textContent = inv.date;
        document.getElementById('pdf-inv-due').textContent = inv.dueDate;
        
        document.getElementById('pdf-client-name').textContent = inv.clientName;
        
        document.getElementById('pdf-inv-desc').textContent = inv.desc;
        document.getElementById('pdf-inv-amount').textContent = '€ ' + inv.total.toFixed(2);
        
        document.getElementById('pdf-calc-amount').textContent = inv.amount.toFixed(2);
        document.getElementById('pdf-calc-tax').textContent = (inv.total - inv.amount).toFixed(2);
        document.getElementById('pdf-calc-total').textContent = inv.total.toFixed(2);

        const element = document.getElementById('pdf-invoice-template');
        element.style.display = 'block'; // Rendi temporaneamente visibile per html2pdf

        const opt = {
            margin:       0.5,
            filename:     `Fattura_${inv.number}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        window.coreSystem.logMessage(`[GENERAZIONE PDF] Avviata per la fattura ${inv.number}`, 'system');

        html2pdf().set(opt).from(element).save().then(() => {
            element.style.display = 'none'; // Nasconde nuovamente il div
            window.coreSystem.logMessage(`[GENERAZIONE PDF] Download completato per ${inv.number}`, 'success');
        });
    }
}


/**
 * App: Impostazioni (Profilo Aziendale)
 */
class SettingsApp {
    constructor() {
        this.companyData = JSON.parse(localStorage.getItem('webstudio_company_profile')) || {};
        this.currentLogoBase64 = this.companyData.logo || null;
        this.init();
    }

    init() {
        if(this.companyData.name) {
            document.getElementById('comp-name').value = this.companyData.name || '';
            document.getElementById('comp-vat').value = this.companyData.vat || '';
            document.getElementById('comp-cf').value = this.companyData.cf || '';
            document.getElementById('comp-address').value = this.companyData.address || '';
            document.getElementById('comp-sdi').value = this.companyData.sdi || '';
            document.getElementById('comp-regime').value = this.companyData.regime || 'ordinario';
        }
        
        if (this.currentLogoBase64) {
            document.getElementById('company-logo-preview').innerHTML = `<img src="${this.currentLogoBase64}" style="width:100%; height:100%; object-fit:cover;">`;
        }
    }

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentLogoBase64 = e.target.result;
            document.getElementById('company-logo-preview').innerHTML = `<img src="${this.currentLogoBase64}" style="width:100%; height:100%; object-fit:cover;">`;
        };
        reader.readAsDataURL(file);
    }

    removeLogo() {
        this.currentLogoBase64 = null;
        document.getElementById('company-logo-preview').innerHTML = `<i data-lucide="image"></i>`;
        document.getElementById('company-logo-input').value = '';
        lucide.createIcons();
    }

    saveCompanyProfile(e) {
        e.preventDefault();
        this.companyData = {
            name: document.getElementById('comp-name').value,
            vat: document.getElementById('comp-vat').value,
            cf: document.getElementById('comp-cf').value,
            address: document.getElementById('comp-address').value,
            sdi: document.getElementById('comp-sdi').value,
            regime: document.getElementById('comp-regime').value,
            logo: this.currentLogoBase64
        };
        localStorage.setItem('webstudio_company_profile', JSON.stringify(this.companyData));
        
        window.coreSystem.logMessage(`[SYSTEM] Profilo aziendale e logo aggiornati correttamente.`, 'system');
        alert("Dati Aziendali e Logo salvati con successo!");
    }

    clearProfile() {
        if(confirm("Vuoi davvero cancellare tutti i dati aziendali salvati?")) {
            localStorage.removeItem('webstudio_company_profile');
            this.companyData = {};
            this.removeLogo();
            document.getElementById('company-profile-form').reset();
            window.coreSystem.logMessage(`[SYSTEM] Profilo aziendale svuotato.`, 'warning');
        }
    }
}


/**
 * App: Rubrica Intelligente
 * Gestisce i contatti, l'upload delle immagini e invia segnali al Core.
 */
class RubricaApp {
    constructor() {
        this.contacts = JSON.parse(localStorage.getItem('webstudio_contacts')) || [];
        this.currentAvatarBase64 = null;
        this.init();
    }

    init() {
        if(this.contacts.length === 0) {
            // Dati demo iniziali
            this.contacts = [
                { id: 1, name: "Mario Rossi", group: "clienti", phone: "+39 333 1234567", email: "mario@rossi.it", address: "Via Roma 1", whatsapp: "3331234567", telegram: "mariorossi", avatar: null }
            ];
            this.saveData();
        }
        this.renderContacts();
    }

    saveData() {
        localStorage.setItem('webstudio_contacts', JSON.stringify(this.contacts));
    }

    openContactModal(id = null) {
        document.getElementById('contact-form').reset();
        this.removeAvatar();
        document.getElementById('c-id').value = '';
        document.getElementById('contact-modal-title').innerText = "Nuova Scheda Anagrafica";

        if (id) {
            const c = this.contacts.find(x => x.id == id);
            if (c) {
                document.getElementById('contact-modal-title').innerText = "Modifica Contatto";
                document.getElementById('c-id').value = c.id;
                document.getElementById('c-name').value = c.name || '';
                document.getElementById('c-group').value = c.group || 'clienti';
                document.getElementById('c-phone').value = c.phone || '';
                document.getElementById('c-email').value = c.email || '';
                document.getElementById('c-address').value = c.address || '';
                document.getElementById('c-whatsapp').value = c.whatsapp || '';
                document.getElementById('c-telegram').value = c.telegram || '';
                
                if (c.avatar) {
                    this.currentAvatarBase64 = c.avatar;
                    document.getElementById('c-avatar-preview').innerHTML = `<img src="${c.avatar}">`;
                }
            }
        }
        document.getElementById('contact-modal').classList.remove('hidden');
    }

    closeContactModal() {
        document.getElementById('contact-modal').classList.add('hidden');
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentAvatarBase64 = e.target.result;
            document.getElementById('c-avatar-preview').innerHTML = `<img src="${this.currentAvatarBase64}">`;
        };
        reader.readAsDataURL(file);
    }

    removeAvatar() {
        this.currentAvatarBase64 = null;
        document.getElementById('c-avatar-preview').innerHTML = `<i data-lucide="camera"></i>`;
        document.getElementById('c-avatar').value = '';
        lucide.createIcons();
    }

    saveContact(e) {
        e.preventDefault();
        const id = document.getElementById('c-id').value;
        const name = document.getElementById('c-name').value;
        
        const contactData = {
            id: id ? parseInt(id) : Date.now(),
            name: name,
            group: document.getElementById('c-group').value,
            phone: document.getElementById('c-phone').value,
            email: document.getElementById('c-email').value,
            address: document.getElementById('c-address').value,
            whatsapp: document.getElementById('c-whatsapp').value.replace(/[^0-9]/g, ''),
            telegram: document.getElementById('c-telegram').value.replace('@', ''),
            avatar: this.currentAvatarBase64
        };

        if (id) {
            const idx = this.contacts.findIndex(x => x.id == id);
            this.contacts[idx] = contactData;
            window.coreSystem.logMessage(`[APP: RUBRICA] Contatto modificato: ${name}`, 'action');
        } else {
            this.contacts.push(contactData);
            window.coreSystem.logMessage(`[APP: RUBRICA] Nuovo contatto creato: ${name}`, 'action');
            
            // --- EVENT BUS PUBLISH ---
            // Quando creo un cliente, informo tutto l'ecosistema Prima Nota® (se i permessi sono attivi)
            window.coreSystem.publish('rubrica', 'nuovo_cliente', { id: contactData.id, nome: contactData.name });
        }

        // Simula ritardo di salvataggio
        window.coreSystem.logMessage(`[SYSTEM] Sincronizzazione in corso...`, 'system');
        
        setTimeout(() => {
            this.saveData();
            this.renderContacts();
            this.closeContactModal();
        }, 500);
    }

    deleteContact(id) {
        if(confirm("Sei sicuro di voler eliminare questa scheda anagrafica?")) {
            this.contacts = this.contacts.filter(x => x.id !== id);
            this.saveData();
            this.renderContacts();
            window.coreSystem.logMessage(`[APP: RUBRICA] Contatto eliminato.`, 'action');
        }
    }

    filterContacts() {
        this.renderContacts();
    }

    renderContacts() {
        const grid = document.getElementById('contacts-grid');
        if(!grid) return;

        const searchTerm = document.getElementById('contact-search')?.value.toLowerCase() || '';
        const groupFilter = document.getElementById('contact-filter-group')?.value || 'all';

        // Sort alfabetico
        let filtered = [...this.contacts].sort((a, b) => a.name.localeCompare(b.name));

        filtered = filtered.filter(c => {
            const matchSearch = c.name.toLowerCase().includes(searchTerm) || 
                              (c.phone && c.phone.includes(searchTerm));
            const matchGroup = groupFilter === 'all' || c.group === groupFilter;
            return matchSearch && matchGroup;
        });

        grid.innerHTML = '';

        if(filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Nessun contatto trovato con questi filtri.</div>`;
            return;
        }

        filtered.forEach(c => {
            // Creazione avatar initials se non c'è foto
            let avatarHtml = '';
            if (c.avatar) {
                avatarHtml = `<img src="${c.avatar}" alt="${c.name}">`;
            } else {
                const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                avatarHtml = initials;
            }

            // Colore badge
            let badgeClass = 'bg-blue';
            if(c.group === 'fornitori') badgeClass = 'bg-orange';
            if(c.group === 'personale') badgeClass = 'bg-purple';

            const whtLink = c.whatsapp ? `href="https://wa.me/${c.whatsapp}" target="_blank"` : `style="opacity:0.2; pointer-events:none;"`;
            const telLink = c.telegram ? `href="https://t.me/${c.telegram}" target="_blank"` : `style="opacity:0.2; pointer-events:none;"`;
            const phnLink = c.phone ? `href="tel:${c.phone}"` : `style="opacity:0.2; pointer-events:none;"`;

            const vidLink = c.email ? `href="mailto:${c.email}?subject=Invito Videochiamata WebStudio Pro"` : `style="opacity:0.2; pointer-events:none;"`;

            const cardHtml = `
                <div class="contact-card glass-panel">
                    <div class="contact-header">
                        <div class="contact-avatar">${avatarHtml}</div>
                        <div class="contact-info">
                            <h4>${c.name}</h4>
                            <span class="app-pill ${badgeClass}" style="padding: 2px 8px; font-size: 10px; display:inline-block; margin-top:4px;">
                                ${c.group.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    
                    <div class="contact-details">
                        <div class="detail-row"><i data-lucide="phone"></i> ${c.phone || '-'}</div>
                        <div class="detail-row"><i data-lucide="mail"></i> ${c.email || '-'}</div>
                        <div class="detail-row"><i data-lucide="map-pin"></i> ${c.address || '-'}</div>
                    </div>

                    <div class="contact-actions">
                        <div class="social-quick">
                            <a ${phnLink} title="Chiama" class="btn-phone"><i data-lucide="phone-call" style="width:18px;"></i></a>
                            <a ${vidLink} title="Avvia Videochiamata" class="btn-video" style="color: #8b5cf6;"><i data-lucide="video" style="width:18px;"></i></a>
                            <a ${whtLink} title="WhatsApp" class="btn-whatsapp"><i data-lucide="message-circle" style="width:18px;"></i></a>
                            <a ${telLink} title="Telegram" class="btn-telegram"><i data-lucide="send" style="width:18px;"></i></a>
                        </div>
                        <div class="edit-actions">
                            <button class="btn-icon" onclick="appRubrica.openContactModal(${c.id})" title="Modifica"><i data-lucide="edit-2"></i></button>
                            <button class="btn-icon" onclick="appRubrica.deleteContact(${c.id})" title="Elimina" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML += cardHtml;
        });

        lucide.createIcons();
    }
}


function simulateApp1Action() {
    const input = document.getElementById('sim-customer-name');
    const nome = input.value.trim();
    
    if(!nome) {
        alert("Inserisci un nome cliente prima di salvare.");
        return;
    }

    // L'app Rubrica pubblica un evento tramite l'Event Bus centrale
    const payload = {
        id: Math.floor(Math.random() * 10000),
        nome: nome
    };

    window.coreSystem.publish('rubrica', 'nuovo_cliente', payload);
    
    input.value = '';
    
    // Per log interno
    window.coreSystem.logMessage(`[RUBRICA LOCAL] Inviato evento "nuovo_cliente": ${nome}`, 'action');
}

/**
 * App: Magazzino Intelligente (InventoryApp)
 */
class InventoryApp {
    constructor() {
        this.products = JSON.parse(localStorage.getItem('webstudio_inventory')) || [];
        this.categories = JSON.parse(localStorage.getItem('webstudio_inv_cats')) || ['Alimentari', 'Hardware', 'Servizi'];
        this.currentSelectedCat = null;
        this.init();
    }

    init() {
        if(this.products.length === 0) {
            // Dati demo iniziali
            this.products = [
                { id: 1, name: "Consulenza Informatica", cat: "Servizi", format: "ore", price: 50.00, cost: 0, qty: 999, status: "ok" },
                { id: 2, name: "Pomodori Pelati Mutti", cat: "Alimentari", format: "cartone", price: 15.00, cost: 8.50, qty: 5, supplier: "Grossista Rossi", expiry: "2026-10-15", status: "ok" }
            ];
            this.saveData();
        }
        this.renderCategories();
        this.renderProducts();
        this.renderAlerts();
        window.coreSystem.publish('magazzino', 'catalogo_aggiornato', this.products);
    }

    saveData() {
        localStorage.setItem('webstudio_inventory', JSON.stringify(this.products));
        localStorage.setItem('webstudio_inv_cats', JSON.stringify(this.categories));
        window.coreSystem.publish('magazzino', 'catalogo_aggiornato', this.products);
    }

    /* --- GESTIONE CATEGORIE --- */
    renderCategories() {
        const list = document.getElementById('inventory-categories-list');
        if(!list) return;
        
        list.innerHTML = `
            <div class="category-item ${!this.currentSelectedCat ? 'active' : ''}" onclick="appInventory.selectCategory(null)" style="padding:10px; border-radius:8px; cursor:pointer; font-weight:bold; background:${!this.currentSelectedCat ? 'rgba(16,185,129,0.2)' : 'transparent'};">
                Tutte le Categorie
            </div>
        `;
        
        this.categories.forEach(c => {
            const isActive = this.currentSelectedCat === c;
            list.innerHTML += `
                <div class="category-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-radius:8px; cursor:pointer; background:${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}; margin-bottom:4px;">
                    <span onclick="appInventory.selectCategory('${c}')" style="flex:1;">${c}</span>
                    <button class="btn-icon" onclick="appInventory.deleteCategory('${c}')" style="color:var(--danger); padding:2px;"><i data-lucide="trash-2" style="width:14px;"></i></button>
                    <!-- Tasto Modifica disattivato per via testuale. Cancella e ricrea -->
                </div>
            `;
        });
        lucide.createIcons();
    }

    selectCategory(cat) {
        this.currentSelectedCat = cat;
        document.getElementById('selected-cat-title').textContent = cat ? `Categoria: ${cat}` : 'Tutti gli Articoli';
        this.renderCategories();
        this.renderProducts();
    }

    openCategoryModal() {
        document.getElementById('category-form').reset();
        document.getElementById('category-modal').classList.remove('hidden');
    }

    closeCategoryModal() {
        document.getElementById('category-modal').classList.add('hidden');
    }

    saveCategory(e) {
        e.preventDefault();
        const cName = document.getElementById('cat-name').value.trim();
        if(cName && !this.categories.includes(cName)) {
            this.categories.push(cName);
            this.saveData();
            this.renderCategories();
            this.closeCategoryModal();
            window.coreSystem.logMessage(`[APP: MAGAZZINO] Nuova categoria: ${cName}`, 'action');
        }
    }

    deleteCategory(cName) {
        if(confirm(`Sei sicuro di eliminare la categoria "${cName}"? I prodotti al suo interno diventeranno "Senza Categoria".`)) {
            this.categories = this.categories.filter(c => c !== cName);
            this.products.forEach(p => { if(p.cat === cName) p.cat = ''; });
            this.saveData();
            if(this.currentSelectedCat === cName) this.selectCategory(null);
            else { this.renderCategories(); this.renderProducts(); }
        }
    }

    /* --- GESTIONE PRODOTTI --- */

    openProductModal(id = null) {
        document.getElementById('product-form').reset();
        document.getElementById('p-id').value = '';
        document.getElementById('product-modal-title').innerText = "Nuovo Articolo / Sottocategoria";
        
        // Popola Dropdown Categorie
        const catSelect = document.getElementById('p-cat');
        catSelect.innerHTML = '<option value="">-- Seleziona una Categoria --</option>';
        this.categories.forEach(c => { catSelect.innerHTML += `<option value="${c}">${c}</option>`; });

        // Popola Dropdown Fornitori da Rubrica
        const supSelect = document.getElementById('p-supplier');
        supSelect.innerHTML = '<option value="">Nessuno (Autoproduzione)</option>';
        if(window.appRubrica && window.appRubrica.contacts) {
            const fornitori = window.appRubrica.contacts.filter(c => c.group === 'fornitori');
            fornitori.forEach(f => { supSelect.innerHTML += `<option value="${f.name}">${f.name}</option>`; });
        }

        if (id) {
            const p = this.products.find(x => x.id == id);
            if (p) {
                document.getElementById('product-modal-title').innerText = "Modifica Articolo";
                document.getElementById('p-id').value = p.id;
                document.getElementById('p-name').value = p.name;
                document.getElementById('p-cat').value = p.cat;
                document.getElementById('p-format').value = p.format || 'pezzi';
                document.getElementById('p-supplier').value = p.supplier || '';
                document.getElementById('p-expiry').value = p.expiry || '';
                document.getElementById('p-cost').value = p.cost || 0;
                document.getElementById('p-price').value = p.price;
                document.getElementById('p-qty').value = p.qty;
                document.getElementById('p-status').value = p.status || 'ok';
            }
        }
        document.getElementById('product-modal').classList.remove('hidden');
    }

    closeProductModal() {
        document.getElementById('product-modal').classList.add('hidden');
    }

    saveProduct(e) {
        e.preventDefault();
        const id = document.getElementById('p-id').value;
        const name = document.getElementById('p-name').value;
        
        const pData = {
            id: id ? parseInt(id) : Date.now(),
            name: name,
            cat: document.getElementById('p-cat').value,
            format: document.getElementById('p-format').value,
            supplier: document.getElementById('p-supplier').value,
            expiry: document.getElementById('p-expiry').value,
            cost: parseFloat(document.getElementById('p-cost').value) || 0,
            price: parseFloat(document.getElementById('p-price').value) || 0,
            qty: parseInt(document.getElementById('p-qty').value) || 0,
            status: document.getElementById('p-status').value
        };

        if (id) {
            const idx = this.products.findIndex(x => x.id == id);
            this.products[idx] = pData;
            window.coreSystem.logMessage(`[APP: MAGAZZINO] Prodotto modificato: ${name}`, 'action');
        } else {
            this.products.push(pData);
            window.coreSystem.logMessage(`[APP: MAGAZZINO] Nuovo prodotto a catalogo: ${name}`, 'action');
        }

        this.saveData();
        this.renderProducts();
        this.renderAlerts();
        this.closeProductModal();
    }

    deleteProduct(id) {
        if(confirm("Eliminare definitivamente questo prodotto dal catalogo?")) {
            this.products = this.products.filter(x => x.id !== id);
            this.saveData();
            this.renderProducts();
            this.renderAlerts();
            window.coreSystem.logMessage(`[APP: MAGAZZINO] Prodotto rimosso dal catalogo.`, 'action');
        }
    }

    deductStock(id, amount = 1) {
        const p = this.products.find(x => x.id === id);
        if(p && p.format !== 'ore') {
            p.qty -= amount;
            if(p.qty < 0) p.qty = 0;
            this.saveData();
            this.renderProducts();
            this.renderAlerts();
        }
    }

    filterProducts() {
        this.renderProducts();
    }

    renderAlerts() {
        const panel = document.getElementById('inventory-alerts-panel');
        if(!panel) return;
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        let errors = [];
        this.products.forEach(p => {
            if(p.status === 'deteriorated') errors.push(`${p.name} (Segnalato Deteriorato / Da Rendere!)`);
            if(p.status === 'expired') errors.push(`${p.name} (Segnalato come SCADUTO!)`);
            if(p.expiry && p.expiry !== '') {
                if(p.expiry < todayStr && p.status !== 'expired') errors.push(`${p.name} (Data di Scadenza superata!)`);
            }
            if(p.qty <= 0 && p.format !== 'ore') errors.push(`${p.name} (Giacenza Terminata)`);
        });

        if(errors.length > 0) {
            panel.style.display = 'block';
            panel.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; color:var(--danger); font-weight:bold; margin-bottom: 8px;">
                    <i data-lucide="alert-triangle"></i> ATTENZIONE: ${errors.length} Allergeni/Avvisi Magazzino
                </div>
                <ul style="margin:0; padding-left: 20px; font-size:13px; color:#fca5a5;">
                    ${errors.map(e => `<li>${e}</li>`).join('')}
                </ul>
            `;
            lucide.createIcons();
        } else {
            panel.style.display = 'none';
        }

        // Popola filter supplier
        const sFilter = document.getElementById('invt-filter-supplier');
        if(sFilter && sFilter.options.length <= 1) {
            const suppliers = [...new Set(this.products.map(p => p.supplier).filter(s => s))];
            let optHTML = '<option value="">Tutti i Fornitori...</option>';
            suppliers.forEach(s => optHTML += `<option value="${s}">${s}</option>`);
            sFilter.innerHTML = optHTML;
        }
    }

    showLossAnalysis() {
        // Simple alert for loss analysis simulation
        let totalLoss = 0;
        let count = 0;
        this.products.forEach(p => {
            if(p.status === 'expired' || p.status === 'deteriorated') {
                totalLoss += p.cost * p.qty;
                count += p.qty;
            }
        });

        alert(`--- ANALISI PERDITE E RESI ---\n\nArticoli persi/deteriorati in magazzino: ${count} unità.\nValore di acquisto totale andato perso: € ${totalLoss.toFixed(2)}\n\n(Consiglio: Esporta elenco per richiesta rimborso ai fornitori o sgravio fiscale costi).`);
    }

    renderProducts() {
        const grid = document.getElementById('inventory-grid');
        if(!grid) return;

        const searchTerm = document.getElementById('invt-search')?.value.toLowerCase() || '';
        const supplierFilter = document.getElementById('invt-filter-supplier')?.value || '';

        let filtered = this.products.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchTerm);
            const matchSupplier = supplierFilter === '' || p.supplier === supplierFilter;
            const matchCat = this.currentSelectedCat === null || p.cat === this.currentSelectedCat;
            return matchSearch && matchSupplier && matchCat;
        });

        grid.innerHTML = '';

        if(filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Nessun articolo corrispondente ai criteri.</div>`;
            return;
        }

        filtered.forEach(p => {
            const isLowStock = p.format !== 'ore' && p.qty <= 2;
            const isBadStatus = p.status === 'expired' || p.status === 'deteriorated';
            
            let badgeClass = 'bg-blue';
            let icon = 'package';
            const catStr = (p.cat || '').toLowerCase();
            
            if(catStr.includes('soft') || catStr.includes('it')) { badgeClass = 'bg-purple'; icon = 'terminal'; }
            else if(catStr.includes('serviz') || catStr.includes('ore') || p.format === 'ore') { badgeClass = 'bg-orange'; icon = 'briefcase'; }
            else if(catStr.includes('cibo') || catStr.includes('ristor') || catStr.includes('food') || catStr.includes('piatto') || catStr.includes('aliment')) { badgeClass = 'bg-orange'; icon = 'utensils'; }
            else if(catStr.includes('cosmes') || catStr.includes('profum')) { badgeClass = 'bg-purple'; icon = 'sparkle'; }

            let bgCol = isBadStatus ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.3)';
            let bdrCol = isBadStatus ? 'rgba(239,68,68,0.5)' : (isLowStock ? 'rgba(234,179,8,0.5)' : 'var(--glass-border)');

            const cardHtml = `
                <div class="glass-panel" style="padding:15px; border-radius:12px; display:flex; flex-direction:column; border:1px solid ${bdrCol}; background:${bgCol};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <span class="app-pill ${badgeClass}" style="font-size:10px; padding:2px 6px;">
                            <i data-lucide="${icon}" style="width:10px;"></i> ${(p.cat || 'Nessuna Categoria').toUpperCase()}
                        </span>
                        <div style="display:flex; gap:5px;">
                            <button class="btn-icon" onclick="appInventory.openProductModal(${p.id})" style="padding:2px;"><i data-lucide="edit" style="width:14px;"></i></button>
                            <button class="btn-icon" onclick="appInventory.deleteProduct(${p.id})" style="padding:2px; color:var(--danger);"><i data-lucide="trash" style="width:14px;"></i></button>
                        </div>
                    </div>
                    
                    <div style="margin-top:10px; flex-grow:1;">
                        <h4 style="margin:0; font-size:15px; color:#fff;">${p.name}</h4>
                        <span style="font-size:11px; color:var(--accent);">Fornitore: ${p.supplier || 'Nessuno / Autoprodotto'}</span>
                        <br>
                        <span style="font-size:11px; color:var(--text-muted); opacity:0.8;">Format: ${(p.format||'').toUpperCase()} ${p.expiry ? '| Scadenza: <strong style="color:var(--danger)">'+p.expiry+'</strong>' : ''}</span>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div>
                            <span style="font-size:10px; color:var(--text-muted); display:block;">Prezzo Vendita / Costo</span>
                            <strong style="color:var(--success); font-size:16px;">€ ${p.price.toFixed(2)}</strong>
                            <span style="font-size:10px; color:var(--danger); margin-left:4px;">(€ ${p.cost.toFixed(2)})</span>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:10px; color:var(--text-muted); display:block;">Giacenza</span>
                            <strong style="color:${isBadStatus ? 'var(--danger)' : (isLowStock ? 'var(--warning)' : 'var(--text-muted)')}; font-size:14px;">
                                ${p.format === 'ore' ? '∞' : p.qty + ' ' + (p.format||'pz').substr(0,4)}
                            </strong>
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML += cardHtml;
        });
        lucide.createIcons();
    }
}


/**
 * App: Preventivi PRO (QuotesApp)
 */
class QuotesApp {
    constructor() {
        this.quotes = JSON.parse(localStorage.getItem('webstudio_quotes')) || [];
        this.syncedClients = [];
        this.syncedInventory = window.appInventory.products || []; // Hack veloce init
        this.init();
    }

    init() {
        this.renderQuotes();

        window.coreSystem.subscribe('preventivi', 'nuovo_cliente', (data) => {
            const existing = this.syncedClients.findIndex(c => c.id === data.id);
            if(existing !== -1) this.syncedClients[existing] = data;
            else this.syncedClients.push(data);
            this.updateClientDropdown();
        });

        // Ascolta variazioni magazzino
        window.coreSystem.subscribe('preventivi', 'catalogo_aggiornato', (data) => {
            this.syncedInventory = data;
            this.updateInventoryDropdown();
        });
    }

    updateClientDropdown() {
        const select = document.getElementById('q-client-select');
        if(!select) return;
        let optionsHtml = '<option value="">-- Manuale / Nessun Cliente --</option>';
        this.syncedClients.forEach(c => { optionsHtml += `<option value="${c.id}">${c.nome}</option>`; });
        select.innerHTML = optionsHtml;
    }

    updateInventoryDropdown() {
        const select = document.getElementById('q-inv-select');
        if(!select) return;
        let optionsHtml = '<option value="">-- Seleziona Articolo dal Catalogo --</option>';
        this.syncedInventory.forEach(p => { 
            optionsHtml += `<option value="${p.id}">${p.name} - €${p.price.toFixed(2)}</option>`; 
        });
        select.innerHTML = optionsHtml;
    }

    autoFillClientData() {
        const val = document.getElementById('q-client-select').value;
        if(val) {
            const client = this.syncedClients.find(c => c.id == val);
            if(client) document.getElementById('q-client-name').value = client.nome;
        }
    }

    fillFromInventory() {
        const val = document.getElementById('q-inv-select').value;
        if(val) {
            const item = this.syncedInventory.find(i => i.id == val);
            if(item) {
                document.getElementById('q-desc').value = item.name;
                document.getElementById('q-amount').value = item.price.toFixed(2);
                window.coreSystem.logMessage(`[APP: PREVENTIVI] Articolo caricato: ${item.name}`, 'system');
            }
        }
    }

    openQuoteModal() {
        const nextNum = this.quotes.length + 1;
        document.getElementById('q-number').value = `PREV-2026-${nextNum.toString().padStart(3, '0')}`;
        document.getElementById('q-date').valueAsDate = new Date();
        this.updateInventoryDropdown(); // force update
        document.getElementById('quote-modal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('quote-form').reset();
        document.getElementById('quote-modal').classList.add('hidden');
    }

    saveQuote(e) {
        e.preventDefault();
        
        const qData = {
            id: Date.now(),
            number: document.getElementById('q-number').value,
            date: document.getElementById('q-date').value,
            clientName: document.getElementById('q-client-name').value,
            desc: document.getElementById('q-desc').value,
            amount: parseFloat(document.getElementById('q-amount').value) || 0,
            status: 'draft', // draft, accepted, rejected
            linkedProductId: document.getElementById('q-inv-select').value // salva l'id se c'è
        };

        this.quotes.push(qData);
        localStorage.setItem('webstudio_quotes', JSON.stringify(this.quotes));
        
        window.coreSystem.logMessage(`[APP: PREVENTIVI] Nuovo preventivo creato per ${qData.clientName}.`, 'action');
        
        this.renderQuotes();
        this.closeModal();
    }

    changeStatus(id, newStatus) {
        const quote = this.quotes.find(q => q.id === id);
        if(quote) {
            quote.status = newStatus;
            localStorage.setItem('webstudio_quotes', JSON.stringify(this.quotes));
            window.coreSystem.logMessage(`[APP: PREVENTIVI] Stato preventivo ${quote.number} aggiornato a ${newStatus}.`, 'system');
            this.renderQuotes();
        }
    }

    convertToInvoice(id) {
        const quote = this.quotes.find(q => q.id === id);
        if(!quote) return;

        if(confirm("Vuoi approvare questo preventivo e generare la fattura collegata (e scalare il magazzino se abilitato)?")) {
            this.changeStatus(id, 'accepted');
            
            // Simula passaggi cross-app aprendo la modale e riempiendola
            document.querySelector('.nav-item[data-target="invoices"]').click();
            appFatture.openNewInvoiceModal();
            
            setTimeout(() => {
                document.getElementById('inv-client-name').value = quote.clientName;
                document.getElementById('inv-desc').value = `Rif. Prev. ${quote.number} - ${quote.desc}`;
                document.getElementById('inv-amount').value = quote.amount;
                appFatture.calcTotal();
                
                // Se era collegato ad un ID prodotto del magazzino, deduciamo
                if(quote.linkedProductId) {
                    appInventory.deductStock(Number(quote.linkedProductId), 1);
                }
            }, 300);
        }
    }

    renderQuotes() {
        const list = document.getElementById('quotes-list');
        if(!list) return;

        if(this.quotes.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i data-lucide="file-x" style="width:40px; height:40px; opacity:0.3; margin-bottom:10px;"></i>
                    <p>Nessun preventivo emesso.</p>
                </div>`;
            lucide.createIcons();
            return;
        }

        list.innerHTML = '';
        const sorted = [...this.quotes].sort((a,b) => b.id - a.id);

        sorted.forEach(q => {
            let statusColor = 'var(--text-muted)';
            let statusText = 'In Bozza / Attesa';
            if(q.status === 'accepted') { statusColor = 'var(--success)'; statusText = 'Accettato'; }
            if(q.status === 'rejected') { statusColor = 'var(--danger)'; statusText = 'Rifiutato'; }

            const card = document.createElement('div');
            card.style.cssText = `
                display:flex; justify-content:space-between; align-items:center; 
                padding:15px; margin-bottom:10px; background:rgba(0,0,0,0.2); 
                border-radius:12px; border:1px solid ${q.status === 'accepted' ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)'};
            `;

            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:20px; flex: 1;">
                    <div style="background:rgba(234,179,8,0.1); padding:10px; border-radius:8px;">
                        <i data-lucide="file-signature" style="color:#eab308;"></i>
                    </div>
                    <div>
                        <h4 style="color:#fff; margin:0 0 4px 0;">${q.clientName}</h4>
                        <span style="color:var(--text-muted); font-size:12px;">Num: <strong>${q.number}</strong> | Offerta del: ${q.date}</span>
                        <div style="font-size:11px; margin-top:4px; opacity:0.7;">${q.desc}</div>
                    </div>
                </div>
                <div style="text-align:right; margin-right: 20px;">
                    <h3 style="color:#fff; font-family:'Outfit'; font-size:18px;">€ ${q.amount.toFixed(2)}</h3>
                    <div style="display:inline-flex; align-items:center; gap:4px; font-size:11px; color:${statusColor}; margin-top:5px; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:10px;">
                        ${statusText}
                    </div>
                </div>
                <div style="display:flex; gap: 8px; border-left: 1px solid var(--glass-border); padding-left: 20px;">
                     <button class="btn btn-icon" title="Rifiutato" onclick="appQuotes.changeStatus(${q.id}, 'rejected')">
                        <i data-lucide="x-circle" style="color:var(--danger);"></i>
                     </button>
                     <button class="btn btn-icon" title="Crea Fattura da questo" onclick="appQuotes.convertToInvoice(${q.id})">
                        <i data-lucide="check-circle-2" style="color:var(--success);"></i>
                     </button>
                </div>
            `;
            list.appendChild(card);
        });
        lucide.createIcons();
    }
}


/**
 * App: Punto Cassa Veloce (PosApp)
 */
class PosApp {
    constructor() {
        this.ticket = []; // items attualmente nello scontrino
        this.syncedInventory = window.appInventory ? window.appInventory.products : [];
        this.syncedCats = window.appInventory ? window.appInventory.categories : [];
        this.currentCat = null;
        this.ticketNumber = parseInt(localStorage.getItem('webstudio_pos_ticket')) || 1;
        this.dailyTotal = parseFloat(localStorage.getItem('webstudio_pos_dailytotal')) || 0.00;
        this.dailyTickets = parseInt(localStorage.getItem('webstudio_pos_dailytickets')) || 0;
        this.zLogs = JSON.parse(localStorage.getItem('webstudio_pos_zlogs')) || [];
        this.keypadBuffer = "";
        this.init();
    }

    init() {
        this.updateHeader();
        this.renderTouchCategories();
        this.renderTouchGrid();

        // Listen for Magazzino updates
        window.coreSystem.subscribe('pos', 'catalogo_aggiornato', (data) => {
            this.syncedInventory = data;
            // Assumiamo che se il catalogo si aggiorna, le categorie potrebbero essersi aggiornate
            this.syncedCats = window.appInventory ? window.appInventory.categories : [];
            this.renderTouchCategories();
            this.renderTouchGrid();
        });

        this.renderZLogs();
    }

    updateHeader() {
        const el = document.getElementById('pos-curr-id');
        if(el) el.textContent = this.ticketNumber.toString().padStart(4, '0');
    }

    filterTouchCat(cat) {
        this.currentCat = cat;
        this.renderTouchGrid();
    }

    renderTouchCategories() {
        const wrap = document.getElementById('pos-cat-filters');
        if(!wrap) return;

        let html = `<button class="app-pill bg-purple" style="min-width:max-content; border:none; cursor:pointer;" onclick="appPos.filterTouchCat(null)">TUTTO</button>`;
        this.syncedCats.forEach(c => {
            html += `<button class="app-pill bg-blue" style="min-width:max-content; border:none; cursor:pointer;" onclick="appPos.filterTouchCat('${c}')">${c.toUpperCase()}</button>`;
        });
        wrap.innerHTML = html;
    }

    renderTouchGrid() {
        const grid = document.getElementById('pos-touch-grid');
        if(!grid) return;

        const searchTerm = document.getElementById('pos-search')?.value.toLowerCase() || '';

        let filtered = this.syncedInventory.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchTerm) || (p.sku && p.sku.toLowerCase().includes(searchTerm));
            const matchCat = this.currentCat === null || p.cat === this.currentCat;
            const isSellable = p.status !== 'expired' && p.status !== 'deteriorated'; // escludere vari
            return matchSearch && matchCat && isSellable;
        });

        grid.innerHTML = '';
        
        filtered.forEach(p => {
            // Colore bg testuale generico
            const isService = p.format === 'ore';
            const colorBlock = isService ? '#f59e0b' : '#3b82f6';
            
            // Creiamo la tile cliccabile
            const card = document.createElement('div');
            card.className = 'glass-panel';
            card.style.cssText = `
                display: flex; flex-direction: column; padding: 10px; cursor: pointer; user-select: none;
                border: 2px solid transparent; transition: all 0.1s; background: rgba(0,0,0,0.4); text-align: center;
            `;
            card.onclick = () => this.addToTicket(p);
            
            // Effetto hover basic CSS inline JS simulated
            card.onmouseenter = () => card.style.borderColor = colorBlock;
            card.onmouseleave = () => card.style.borderColor = 'transparent';
            card.onmousedown = () => card.style.transform = 'scale(0.95)';
            card.onmouseup = () => card.style.transform = 'scale(1)';

            card.innerHTML = `
                <div style="flex:1; display:flex; align-items:center; justify-content:center; margin-bottom:8px;">
                    <i data-lucide="${isService ? 'briefcase' : 'package'}" style="width:32px; height:32px; color:${colorBlock};"></i>
                </div>
                <div style="font-size:12px; font-weight:600; line-height:1.2; margin-bottom:4px; height: 28px; overflow: hidden; color:#fff;">${p.name}</div>
                <div style="color:var(--success); font-weight:bold; font-size:14px;">€ ${p.price.toFixed(2)}</div>
            `;
            grid.appendChild(card);
        });
        lucide.createIcons();
    }

    addToTicket(product) {
        if(product.qty <= 0 && product.format !== 'ore') {
            alert(`Impossibile aggiungere: ${product.name} è esaurito in magazzino!`);
            return;
        }

        const existing = this.ticket.find(item => item.id === product.id);
        if(existing) {
            existing.qta += 1;
        } else {
            this.ticket.push({
                id: product.id,
                name: product.name,
                price: product.price,
                qta: 1
            });
        }
        this.keypadAction('C'); // reset buffer al tap
        this.renderTicket();
    }

    removeOneFromTicket(id) {
        const existingIndex = this.ticket.findIndex(item => item.id === id);
        if(existingIndex > -1) {
            this.ticket[existingIndex].qta -= 1;
            if(this.ticket[existingIndex].qta <= 0) {
                this.ticket.splice(existingIndex, 1);
            }
        }
        this.renderTicket();
    }

    clearTicket() {
        if(this.ticket.length > 0) {
            if(confirm("Svuotare lo scontrino corrente?")) {
                this.ticket = [];
                this.keypadAction('C');
                document.getElementById('pos-fiscal-code').value = '';
                this.renderTicket();
            }
        }
    }

    // --- POS NUMPAD LOGIC ---
    keypadInput(val) {
        // limit to 10 chars
        if (this.keypadBuffer.length > 10) return;
        this.keypadBuffer += val;
        this.updateKeypadDisplay();
    }

    keypadAction(action) {
        if (action === 'C') {
            this.keypadBuffer = '';
            this.updateKeypadDisplay();
            return;
        }
        
        if (this.ticket.length === 0) {
            alert("Seleziona prima un articolo nello scontrino.");
            this.keypadBuffer = '';
            this.updateKeypadDisplay();
            return;
        }
        
        const lastItem = this.ticket[this.ticket.length - 1]; // operiamo sempre sull'ultimo item battuto

        if (action === 'QTY') {
            const qty = parseInt(this.keypadBuffer);
            if (!isNaN(qty) && qty > 0) {
                lastItem.qta = qty;
            }
        } else if (action === 'DISC') {
            const disc = parseFloat(this.keypadBuffer);
            if (!isNaN(disc) && disc >= 0 && disc <= 100) {
                // simple discount overwrite price
                lastItem.price = lastItem.price - (lastItem.price * (disc / 100));
                lastItem.name = lastItem.name + ` (-${disc}%)`;
            }
        }
        // ENTER lo usiamo solo come commit visivo generico per ora
        
        this.keypadBuffer = '';
        this.updateKeypadDisplay();
        this.renderTicket();
    }

    updateKeypadDisplay() {
        const el = document.getElementById('pos-keypad-display');
        if (el) el.textContent = this.keypadBuffer || '0';
    }
    // ------------------------

    renderTicket() {
        const list = document.getElementById('pos-ticket-lines');
        if(!list) return;

        if(this.ticket.length === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding: 40px 10px; color:var(--text-muted); opacity: 0.5;">
                    <i data-lucide="shopping-cart" style="width:40px; height:40px; margin-bottom:10px;"></i>
                    <p>Scontrino Vuoto</p>
                </div>`;
            document.getElementById('pos-subtotal').textContent = '0.00';
            document.getElementById('pos-total').textContent = '0.00';
            lucide.createIcons();
            return;
        }

        list.innerHTML = '';
        let total = 0;

        this.ticket.forEach(item => {
            const rowTotal = item.price * item.qta;
            total += rowTotal;

            const div = document.createElement('div');
            div.style.cssText = "display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(255,255,255,0.1); padding: 8px 0;";
            div.innerHTML = `
                <div style="flex:1;">
                    <div style="color:#fff; font-weight:bold;">${item.name}</div>
                    <div style="color:var(--text-muted); font-size:12px;">${item.qta} x €${item.price.toFixed(2)}</div>
                </div>
                <div style="text-align:right; display:flex; gap:10px; align-items:center;">
                    <strong style="color:var(--primary);">€${rowTotal.toFixed(2)}</strong>
                    <button class="btn-icon" style="padding:2px; border-radius:50%;" onclick="appPos.removeOneFromTicket(${item.id})"><i data-lucide="minus-circle" style="width:16px;"></i></button>
                </div>
            `;
            list.appendChild(div);
        });

        document.getElementById('pos-subtotal').textContent = total.toFixed(2);
        document.getElementById('pos-total').textContent = total.toFixed(2);
        lucide.createIcons();
    }

    payTicket(method) {
        if(this.ticket.length === 0) return;

        const totalStr = document.getElementById('pos-total').textContent;
        const total = parseFloat(totalStr);
        const cfField = document.getElementById('pos-fiscal-code')?.value.trim();
        const parlanteInfo = cfField ? `\nCodice Fiscale / P.IVA: ${cfField.toUpperCase()}` : '';

        // SE E' PRECONTO: stampo e non registro su chiusura né su magazzino
        if (method === 'Preconto') {
            this.generateVisualReceiptHTML('PRECONTO (NON FISCALE)', totalStr, 'Preconto', parlanteInfo);
            window.print();
            return; 
        }
        
        // Simula ritardo POS bancario e Registratore di cassa telematico
        window.coreSystem.logMessage(`[RT] Emissione scontrino telematico... (${method})`, 'system');
        
        setTimeout(() => {
            // Detrazione magazzino asincrona tramite Event Bus permission Check
            const payload = { items: this.ticket, type: 'sale', posId: `SCON-${this.ticketNumber}` };
            
            let couldReachInventory = false;
            if(window.coreSystem.permissions['magazzino->cassa']) {
                // Esecuzione rapida
                this.ticket.forEach(item => {
                    if(window.appInventory) window.appInventory.deductStock(item.id, item.qta);
                });
                couldReachInventory = true;
                window.coreSystem.logMessage(`[POS] Transazione completata. Magazzino SCALATO con successo.`, 'success');
            } else {
                window.coreSystem.logMessage(`[POS] Transazione completata. ATTENZIONE: Magazzino isolato (Sandbox), stock non aggiornato.`, 'warning');
            }

            
            this.generateVisualReceiptHTML(`DOCUMENTO COMMERCIALE (TELeMATICo)`, totalStr, method, parlanteInfo);
            window.print();
            
            // Registra nel totalizzatore (chiusura fiscale)
            this.dailyTotal += total;
            this.dailyTickets++;
            localStorage.setItem('webstudio_pos_dailytotal', this.dailyTotal);
            localStorage.setItem('webstudio_pos_dailytickets', this.dailyTickets);

            // Reset scontrino e incrementa numerazione
            this.ticketNumber++;
            localStorage.setItem('webstudio_pos_ticket', this.ticketNumber);
            document.getElementById('pos-fiscal-code').value = '';
            this.keypadAction('C');
            this.updateHeader();
            this.ticket = [];
            this.renderTicket();

        }, 400); // 400ms delay per simulare cassa rt
    }

    generateVisualReceiptHTML(title, totalStr, method, cfInfo) {
        document.getElementById('receipt-title').textContent = title;
        document.getElementById('receipt-date').textContent = new Date().toLocaleDateString('it-IT');
        document.getElementById('receipt-time').textContent = new Date().toLocaleTimeString('it-IT').substring(0, 5);
        document.getElementById('receipt-num').textContent = this.ticketNumber.toString().padStart(4, '0');
        
        if (cfInfo) {
            document.getElementById('receipt-cf-line').style.display = 'block';
            document.getElementById('receipt-cf').textContent = cfInfo.replace('\nCodice Fiscale / P.IVA: ', '');
        } else {
            document.getElementById('receipt-cf-line').style.display = 'none';
        }

        const itemsBody = document.getElementById('receipt-items');
        itemsBody.innerHTML = '';
        this.ticket.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 2px 0;">${item.qta} x ${item.name}</td>
                <td style="text-align: right; padding: 2px 0;">€ ${(item.price * item.qta).toFixed(2)}</td>
            `;
            itemsBody.appendChild(tr);
        });

        document.getElementById('receipt-total').textContent = totalStr;
        document.getElementById('receipt-method').textContent = method.toUpperCase();
    }

    printXReport() {
        alert(`=== LETTURA CORRISPETTIVI (X) ===\nReparti letti: ${this.dailyTickets} scontrini oggi.\nIncasso Parziale: € ${this.dailyTotal.toFixed(2)}\n\nLa cassa rimane aperta.`);
    }

    printZReport() {
        if (confirm("Attenzione: Procedere con la CHIUSURA GIORNALIERA FISCALE (Z)?\nAzzererà i corrispettivi correnti per preparare la cassa al giorno successivo.")) {
            alert(`=== CHIUSURA FISCALE GIORNALIERA (Z) ===\nTotale Scontrini Enessi: ${this.dailyTickets}\nTOTALE INCASSATO LORDO: € ${this.dailyTotal.toFixed(2)}\n\n(Invio telematico Agenzia delle Entrate simulato... OK)\nChiusura Z e stampa completata.`);
            
            // Registra nel log fiscale
            const now = new Date();
            const logEntry = {
                date: now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT'),
                tickets: this.dailyTickets,
                total: this.dailyTotal,
                id: 'Z-' + Date.now().toString().slice(-6)
            };
            this.zLogs.push(logEntry);
            localStorage.setItem('webstudio_pos_zlogs', JSON.stringify(this.zLogs));

            // Azzeramento totali di giornata
            this.dailyTotal = 0;
            this.dailyTickets = 0;
            localStorage.setItem('webstudio_pos_dailytotal', 0);
            localStorage.setItem('webstudio_pos_dailytickets', 0);
            
            this.renderZLogs();
        }
    }

    renderZLogs() {
        const container = document.getElementById('fiscal-z-logs');
        if (!container) return;

        if (this.zLogs.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted);">In attesa della prima chiusura fiscale...</div>';
            return;
        }

        let html = '';
        // Mostriamo dall'ultima (più recente)
        [...this.zLogs].reverse().forEach(log => {
            html += `
                <div style="border-bottom: 1px dashed rgba(255,255,255,0.1); padding: 10px 0; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#10b981;">Chiusura <span style="font-family:monospace;">#${log.id}</span></strong><br>
                        <span style="font-size:11px; color:var(--text-muted);">${log.date}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:11px; color:var(--text-muted);">${log.tickets} Doc. Emessi</span><br>
                        <strong style="color:#fff;">€ ${log.total.toFixed(2)}</strong>
                        <i data-lucide="check-circle-2" style="width:14px; color:#10b981; margin-left:5px; vertical-align:middle;"></i>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        if(window.lucide) lucide.createIcons();
    }

    openAdvancedPay() {
        if(this.ticket.length === 0) return;
        alert("Apertura modale pagamento avanzato: (Richiesta Dati per Fattura immediata, divisione conto, resi). Modulo in sviluppo.");
    }
}

/**
 * App: Agenda Condivisa
 * Gestisce il calendario interattivo e gli appuntamenti con i clienti
 */
class CalendarApp {
    constructor() {
        this.events = JSON.parse(localStorage.getItem('webstudio_calendar_events')) || [];
        this.currentDate = new Date(); // Month currently being viewed
        this.syncedClients = [];
        this.init();
    }

    init() {
        // Subscribe to client updates
        window.coreSystem.subscribe('calendar', 'nuovo_cliente', (data) => {
            const existing = this.syncedClients.findIndex(c => c.id === data.id);
            if(existing !== -1) {
                this.syncedClients[existing] = data;
            } else {
                this.syncedClients.push(data);
            }
            this.updateClientDropdown();
            this.renderCalendar();
            this.renderUpcoming();
        });

        // Prima renderizzazione
        this.renderCalendar();
        this.renderUpcoming();
    }

    updateClientDropdown() {
        const select = document.getElementById('ev-client');
        if(!select) return;
        let html = '<option value="">-- Nessun Cliente Collegato --</option>';
        this.syncedClients.forEach(c => {
            html += `<option value="${c.id}">${c.nome} (${c.azienda || 'Privato'})</option>`;
        });
        select.innerHTML = html;
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthYear = document.getElementById('calendar-month-year');
        if(!grid || !monthYear) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Nomi dei mesi
        const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
        monthYear.textContent = `${monthNames[month]} ${year}`;

        grid.innerHTML = '';

        // Trova il primo giorno del mese (0=Domenica, 1=Lunedì...)
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Offset per far iniziare il lunedì
        let startOffset = firstDay === 0 ? 6 : firstDay - 1;

        // Celle vuote prima dell'inizio del mese
        for (let i = 0; i < startOffset; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.style.background = 'rgba(0,0,0,0.1)';
            emptyCell.style.borderRadius = '8px';
            grid.appendChild(emptyCell);
        }

        const todayObj = new Date();
        const isCurrentMonth = (todayObj.getMonth() === month && todayObj.getFullYear() === year);

        // Genera i giorni
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = this.events.filter(e => e.date === dateStr);
            
            const cell = document.createElement('div');
            cell.style.background = 'rgba(0,0,0,0.4)';
            cell.style.border = '1px solid rgba(255,255,255,0.05)';
            cell.style.borderRadius = '8px';
            cell.style.padding = '8px';
            cell.style.minHeight = '100px';
            cell.style.position = 'relative';
            
            // Highlight today
            if (isCurrentMonth && day === todayObj.getDate()) {
                cell.style.border = '2px solid #ec4899';
                cell.style.background = 'rgba(236,72,153, 0.1)';
            }

            let html = `<div style="font-weight:bold; margin-bottom:5px; color:${(isCurrentMonth && day === todayObj.getDate()) ? '#ec4899' : '#fff'};">${day}</div>`;
            
            // Render events in cell
            html += `<div style="display:flex; flex-direction:column; gap:4px; max-height:70px; overflow-y:auto; overflow-x:hidden;">`;
            dayEvents.forEach(ev => {
                html += `
                    <div style="background: ${ev.color}; padding: 3px 6px; border-radius: 4px; font-size: 10px; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;"
                         title="${ev.time} - ${ev.title}">
                        <strong>${ev.time || ''}</strong> ${ev.title}
                    </div>
                `;
            });
            html += `</div>`;

            // Pulsante inserimento rapido nascosto (mostrato all'hover)
            html += `
                <button class="btn btn-icon add-btn-cal" onclick="appCalendar.openEventModal('${dateStr}')" 
                        style="position:absolute; top:2px; right:2px; padding:2px; opacity:0; color:#ec4899; transition: opacity 0.2s;">
                    <i data-lucide="plus" style="width:14px;"></i>
                </button>
            `;
            
            cell.innerHTML = html;
            cell.onmouseenter = () => { cell.querySelector('.add-btn-cal').style.opacity = '1'; };
            cell.onmouseleave = () => { cell.querySelector('.add-btn-cal').style.opacity = '0'; };

            grid.appendChild(cell);
        }
        if(window.lucide) window.lucide.createIcons();
    }

    renderUpcoming() {
        const list = document.getElementById('calendar-upcoming');
        if(!list) return;
        
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Ordina eventi dal più vicino in poi
        const upcoming = this.events
            .filter(e => e.date >= todayStr)
            .sort((a,b) => (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0))
            .slice(0, 10); // Massimo 10

        if(upcoming.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">Nessun evento futuro.</div>`;
            return;
        }

        let html = '';
        upcoming.forEach(ev => {
            // Cerca il nome del cliente se collegato
            let clientName = '';
            if(ev.clientId) {
                const c = this.syncedClients.find(client => client.id == ev.clientId);
                if(c) clientName = `<div style="font-size:10px; color:var(--text-muted); margin-top:2px;"><i data-lucide="user" style="width:10px; display:inline-block;"></i> ${c.nome}</div>`;
            }

            const parts = ev.date.split('-');
            const prettyDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

            html += `
                <div style="background: rgba(0,0,0,0.4); border-left: 3px solid ${ev.color}; padding: 10px; margin-bottom: 10px; border-radius: 0 8px 8px 0; display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-weight:bold; font-size:13px; color:#fff;">${ev.title}</div>
                        ${clientName}
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:11px; color:var(--text-muted); font-family:monospace;">${prettyDate}</span><br>
                        <strong style="color:${ev.color}; font-size:12px;">${ev.time || 'All Day'}</strong>
                    </div>
                    <button class="btn-icon" style="color:var(--danger); margin-left:10px;" onclick="appCalendar.deleteEvent(${ev.id})" title="Elimina Evento"><i data-lucide="trash-2" style="width:14px;"></i></button>
                </div>
            `;
        });
        list.innerHTML = html;
        if(window.lucide) window.lucide.createIcons();
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }

    openEventModal(prefilledDate = null) {
        document.getElementById('event-form').reset();
        
        if (prefilledDate) {
            document.getElementById('ev-date').value = prefilledDate;
        } else {
            document.getElementById('ev-date').valueAsDate = new Date();
        }
        
        document.getElementById('event-modal').classList.remove('hidden');
    }

    closeEventModal() {
        document.getElementById('event-modal').classList.add('hidden');
    }

    saveEvent(e) {
        e.preventDefault();
        
        const newEvent = {
            id: Date.now(),
            title: document.getElementById('ev-title').value,
            date: document.getElementById('ev-date').value,
            time: document.getElementById('ev-time').value,
            clientId: document.getElementById('ev-client').value,
            color: document.getElementById('ev-type').value,
            desc: document.getElementById('ev-desc').value
        };

        this.events.push(newEvent);
        localStorage.setItem('webstudio_calendar_events', JSON.stringify(this.events));
        
        window.coreSystem.logMessage(`[APP: AGENDA] Inserito nuovo appuntamento: ${newEvent.title}`, 'action');
        
        this.renderCalendar();
        this.renderUpcoming();
        this.closeEventModal();
    }

    deleteEvent(id) {
        if(confirm("Sei sicuro di voler eliminare questo appuntamento?")) {
            this.events = this.events.filter(e => e.id !== id);
            localStorage.setItem('webstudio_calendar_events', JSON.stringify(this.events));
            this.renderCalendar();
            this.renderUpcoming();
        }
    }
}


// Global Init protetto al caricamento completo
document.addEventListener('DOMContentLoaded', () => {
/**
 * FALCO HQ - Creator Office Logic
 */
class FalcoApp {
    constructor() {
        this.console = document.getElementById('falco-console-output');
    }

    log(msg, type = 'system') {
        const div = document.createElement('div');
        const time = new Date().toLocaleTimeString();
        div.innerHTML = `<span style="opacity:0.5">[${time}]</span> <span style="color:${type === 'error' ? '#ef4444' : '#10b981'}">${msg}</span>`;
        if(this.console) {
            this.console.appendChild(div);
            document.getElementById('falco-console').scrollTop = document.getElementById('falco-console').scrollHeight;
        }
    }

    pushUpdate() {
        this.log('Inizializzazione distribuzione v1.0.43...');
        setTimeout(() => this.log('Compilazione moduli in corso...', 'action'), 1000);
        setTimeout(() => {
            this.log('AGGIORNAMENTO INVIATO A TUTTI GLI UTENTI.', 'success');
            window.coreSystem.logMessage('[FALCO] Update globale rilasciato con successo.', 'success');
        }, 3000);
    }

    createNewApp() {
        const name = prompt("Inserisci il nome della nuova Micro-App:");
        if(name) {
            this.log(`Creazione scaffolding per: ${name.toUpperCase()}...`);
            setTimeout(() => this.log(`Modulo ${name} configurato nella Sandbox.`, 'success'), 1500);
        }
    }

    managePayments() {
        this.log('Accesso al Gateway di Pagamento Stripe/PayPal...');
        setTimeout(() => this.log('Configurazione tariffe: Modulo Fatturazione -> €19/mese', 'system'), 1000);
    }
}

    try {
        window.appFatture = new FattureApp();
        window.appSettings = new SettingsApp();
        window.appRubrica = new RubricaApp();
        window.appFalco = new FalcoApp();
        window.appInventory = new InventoryApp();
        window.appQuotes = new QuotesApp();
        window.appPos = new PosApp();
        window.appCalendar = new CalendarApp();

        // Listen for POS search bar
        document.getElementById('pos-search')?.addEventListener('keyup', () => {
            if(window.appPos) window.appPos.renderTouchGrid();
        });

    } catch(e) {
        console.error("Errore critico avvio App WebStudio:", e);
        if(window.coreSystem) window.coreSystem.logMessage("[ERRORE SISTEMA] App bloccata: " + e.message, 'blocked');
    }
});
