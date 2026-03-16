/* ============================================
   ReWAir Smart Factory - Application Logic
   ============================================ */

// ============================================
// MOCK DATA
// ============================================

const orders = [
    {
        id: 'RW-2026-001', client: 'Vestas', type: 'fibra', typeName: 'Kit Fibra di Vetro',
        description: 'Kit fibra pala V-236 15MW - Shell superiore', qty: 48,
        priority: 'urgente', status: 'in-produzione', delivery: '2026-04-15',
        origin: 'manual', created: '2026-02-28'
    },
    {
        id: 'RW-2026-002', client: 'Siemens Gamesa', type: 'core', typeName: 'Kit Core Balsa/PET',
        description: 'Kit core balsa nacelle SG 14-236 DD', qty: 120,
        priority: 'alta', status: 'in-produzione', delivery: '2026-04-30',
        origin: 'ai-email', created: '2026-03-05'
    },
    {
        id: 'RW-2026-003', client: 'Nordex', type: 'vacuum', typeName: 'Kit Vacuum Bagging',
        description: 'Kit vacuum bagging Delta4000 - Consumabili', qty: 200,
        priority: 'normale', status: 'in-attesa', delivery: '2026-05-20',
        origin: 'ai-email', created: '2026-03-10'
    },
    {
        id: 'RW-2026-004', client: 'LM Wind Power', type: 'rinforzo', typeName: 'Kit Rinforzo Strutturale',
        description: 'Kit rinforzo strutturale pala 107m - Spar cap', qty: 30,
        priority: 'alta', status: 'in-attesa', delivery: '2026-04-25',
        origin: 'ai-doc', created: '2026-03-12'
    },
    {
        id: 'RW-2026-005', client: 'Vestas', type: 'fibra', typeName: 'Kit Fibra di Vetro',
        description: 'Kit fibra pala V-150 - Root section', qty: 64,
        priority: 'normale', status: 'in-produzione', delivery: '2026-05-10',
        origin: 'manual', created: '2026-03-01'
    },
    {
        id: 'RW-2026-006', client: 'GE Vernova', type: 'fibra', typeName: 'Kit Fibra di Vetro',
        description: 'Kit fibra Haliade-X 220m - Web section', qty: 36,
        priority: 'urgente', status: 'in-produzione', delivery: '2026-04-05',
        origin: 'manual', created: '2026-02-20'
    },
    {
        id: 'RW-2026-007', client: 'Siemens Gamesa', type: 'vacuum', typeName: 'Kit Vacuum Bagging',
        description: 'Kit vacuum bagging SG 11-200 DD', qty: 150,
        priority: 'normale', status: 'completato', delivery: '2026-03-15',
        origin: 'ai-doc', created: '2026-02-15'
    },
    {
        id: 'RW-2026-008', client: 'Nordex', type: 'core', typeName: 'Kit Core Balsa/PET',
        description: 'Kit core PET foam N163/6.X', qty: 80,
        priority: 'normale', status: 'completato', delivery: '2026-03-12',
        origin: 'manual', created: '2026-02-10'
    },
    {
        id: 'RW-2026-009', client: 'Vestas', type: 'rinforzo', typeName: 'Kit Rinforzo Strutturale',
        description: 'Kit rinforzo trailing edge V-236', qty: 24,
        priority: 'alta', status: 'in-produzione', delivery: '2026-04-20',
        origin: 'ai-email', created: '2026-03-08'
    },
    {
        id: 'RW-2026-010', client: 'LM Wind Power', type: 'fibra', typeName: 'Kit Fibra di Vetro',
        description: 'Kit fibra biax/triax pala 80m', qty: 90,
        priority: 'normale', status: 'spedito', delivery: '2026-03-10',
        origin: 'manual', created: '2026-02-05'
    },
    {
        id: 'RW-2026-011', client: 'GE Vernova', type: 'core', typeName: 'Kit Core Balsa/PET',
        description: 'Kit core sandwich Haliade-X nacelle', qty: 45,
        priority: 'alta', status: 'in-attesa', delivery: '2026-05-01',
        origin: 'ai-doc', created: '2026-03-14'
    },
    {
        id: 'RW-2026-012', client: 'Siemens Gamesa', type: 'fibra', typeName: 'Kit Fibra di Vetro',
        description: 'Kit fibra UD pala SG 14-222 DD', qty: 55,
        priority: 'normale', status: 'spedito', delivery: '2026-03-08',
        origin: 'manual', created: '2026-02-01'
    },
];

const workers = [
    { name: 'Giuseppe Bianchi', team: 'Taglio', shift: 'Mattina', order: 'RW-2026-001', area: 'Area Taglio', status: 'attivo', hours: 6.5 },
    { name: 'Anna Colombo', team: 'Taglio', shift: 'Mattina', order: 'RW-2026-006', area: 'Area Taglio', status: 'attivo', hours: 6.5 },
    { name: 'Luca Ferrari', team: 'Taglio', shift: 'Pomeriggio', order: 'RW-2026-005', area: 'Area Taglio', status: 'in pausa', hours: 3.0 },
    { name: 'Maria Russo', team: 'Kitting', shift: 'Mattina', order: 'RW-2026-001', area: 'Area Kitting', status: 'attivo', hours: 7.0 },
    { name: 'Paolo Esposito', team: 'Kitting', shift: 'Mattina', order: 'RW-2026-002', area: 'Area Kitting', status: 'attivo', hours: 6.5 },
    { name: 'Francesca Romano', team: 'Kitting', shift: 'Mattina', order: 'RW-2026-002', area: 'Area Kitting', status: 'attivo', hours: 7.0 },
    { name: 'Andrea Ricci', team: 'Kitting', shift: 'Pomeriggio', order: 'RW-2026-005', area: 'Area Kitting', status: 'attivo', hours: 4.0 },
    { name: 'Sara Marino', team: 'Kitting', shift: 'Pomeriggio', order: 'RW-2026-009', area: 'Area Kitting', status: 'attivo', hours: 3.5 },
    { name: 'Marco Conti', team: 'Confezionamento', shift: 'Mattina', order: 'RW-2026-007', area: 'Confezionamento', status: 'attivo', hours: 6.0 },
    { name: 'Elena Galli', team: 'Confezionamento', shift: 'Mattina', order: 'RW-2026-008', area: 'Confezionamento', status: 'attivo', hours: 6.0 },
    { name: 'Davide Bruno', team: 'Confezionamento', shift: 'Pomeriggio', order: 'RW-2026-006', area: 'Confezionamento', status: 'in pausa', hours: 2.0 },
    { name: 'Chiara Fontana', team: 'Qualità', shift: 'Mattina', order: 'RW-2026-007', area: 'Lab. Qualità', status: 'attivo', hours: 5.5 },
    { name: 'Roberto Moretti', team: 'Qualità', shift: 'Mattina', order: 'RW-2026-010', area: 'Lab. Qualità', status: 'attivo', hours: 6.0 },
    { name: 'Giulia Barbieri', team: 'Logistica', shift: 'Mattina', order: 'RW-2026-010', area: 'Spedizione', status: 'attivo', hours: 7.5 },
    { name: 'Stefano Lombardi', team: 'Logistica', shift: 'Mattina', order: 'RW-2026-012', area: 'Spedizione', status: 'attivo', hours: 7.0 },
    { name: 'Valentina Serra', team: 'Logistica', shift: 'Pomeriggio', order: 'RW-2026-008', area: 'Magazzino', status: 'attivo', hours: 4.0 },
];

const qualityIssues = [
    {
        id: 'QC-001', order: 'RW-2026-006', type: 'critical',
        title: 'Orientamento fibre non conforme',
        detail: 'Rilevata deviazione >5° nell\'orientamento delle fibre UD nel kit #RW-2026-006-B12. Il tessuto unidirezionale mostra disallineamento nella zona di root section che potrebbe compromettere le proprietà meccaniche della pala.',
        inspector: 'Chiara Fontana', date: '2026-03-16', status: 'aperto'
    },
    {
        id: 'QC-002', order: 'RW-2026-001', type: 'warning',
        title: 'Variazione spessore core balsa',
        detail: 'Misurazione spessore pannelli core balsa lotto #B-4421 mostra variazione di ±0.8mm rispetto alle specifiche (tolleranza ±0.5mm). 3 pannelli su 48 fuori specifica.',
        inspector: 'Roberto Moretti', date: '2026-03-16', status: 'in-review'
    },
    {
        id: 'QC-003', order: 'RW-2026-002', type: 'warning',
        title: 'Umidità materiale fuori range',
        detail: 'Controllo umidità tessuto fibra di vetro lotto #FG-7891 al 0.18% (limite max 0.15%). Necessaria ulteriore essiccazione prima del kitting per evitare problemi di adesione resina.',
        inspector: 'Chiara Fontana', date: '2026-03-15', status: 'risolto'
    }
];

const qualityInspections = [
    { order: 'RW-2026-007', test: 'Dimensioni taglio fibra', result: 'pass', inspector: 'Roberto Moretti', date: '2026-03-16 14:30' },
    { order: 'RW-2026-005', test: 'Peso kit confezionato', result: 'pass', inspector: 'Chiara Fontana', date: '2026-03-16 13:15' },
    { order: 'RW-2026-001', test: 'Visual check tessuto biax', result: 'pass', inspector: 'Roberto Moretti', date: '2026-03-16 11:45' },
    { order: 'RW-2026-006', test: 'Orientamento fibre UD', result: 'fail', inspector: 'Chiara Fontana', date: '2026-03-16 10:20' },
    { order: 'RW-2026-002', test: 'Contenuto umidità fibra', result: 'warning', inspector: 'Chiara Fontana', date: '2026-03-15 16:00' },
    { order: 'RW-2026-008', test: 'Integrità imballaggio', result: 'pass', inspector: 'Roberto Moretti', date: '2026-03-15 14:30' },
    { order: 'RW-2026-010', test: 'Etichettatura e tracciabilità', result: 'pass', inspector: 'Roberto Moretti', date: '2026-03-15 11:00' },
    { order: 'RW-2026-009', test: 'Spessore core PET', result: 'pass', inspector: 'Chiara Fontana', date: '2026-03-15 09:30' },
];

const aiPredictions = [
    {
        order: 'RW-2026-001', client: 'Vestas', risk: 'medium',
        detail: 'Il lotto di balsa #B-4421 mostra variazioni dimensionali. Rischio di non conformità sul 6% dei pannelli se non viene eseguito un controllo aggiuntivo prima della fase di kitting.',
        suggestion: 'Suggerimento: Inserire checkpoint QC aggiuntivo prima della fase di kitting. Tempo stimato: +2h per lotto.'
    },
    {
        order: 'RW-2026-006', client: 'GE Vernova', risk: 'high',
        detail: 'Analisi pattern: gli ultimi 3 lotti di tessuto UD dal fornitore XY-Composites mostrano trend di deterioramento nell\'allineamento fibre. Probabilità di difetto sui prossimi lotti: 23%.',
        suggestion: 'Suggerimento: Contattare fornitore per audit qualità. Considerare fornitore alternativo AB-Fibers per i prossimi ordini.'
    },
    {
        order: 'RW-2026-003', client: 'Nordex', risk: 'low',
        detail: 'I consumabili per vacuum bagging hanno storicamente un tasso di conformità del 99.8%. Nessun rischio significativo identificato per questo ordine.',
        suggestion: 'Suggerimento: Mantenere procedura standard di controllo qualità.'
    },
    {
        order: 'RW-2026-004', client: 'LM Wind Power', risk: 'medium',
        detail: 'Il kit di rinforzo strutturale richiede tolleranze dimensionali strette (±0.3mm). Storico mostra 4% di scarti in condizioni di umidità ambientale >60%. Previsioni meteo: 65% umidità prossima settimana.',
        suggestion: 'Suggerimento: Attivare deumidificatori supplementari nell\'area taglio. Programmare produzione in fascia oraria 6:00-14:00 per condizioni ottimali.'
    },
];

// ============================================
// NAVIGATION
// ============================================

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;

        // Update active nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Show page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');
    });
});

// ============================================
// DATE DISPLAY
// ============================================

function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('it-IT', options);
}
updateDate();
setInterval(updateDate, 60000);

// ============================================
// TOPBAR — DateTime & Sede Switcher
// ============================================

function updateTopbarDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const el = document.getElementById('topbarDateTime');
    if (el) el.textContent = date + '  ·  ' + time;
}
updateTopbarDateTime();
setInterval(updateTopbarDateTime, 1000);

function toggleSedeDropdown() {
    document.getElementById('sedeSelector').classList.toggle('open');
}

function switchSede(name, el, e) {
    e.preventDefault();
    document.getElementById('sedeLabel').textContent = 'Sede di ' + name;
    document.querySelectorAll('.sede-option').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('sedeSelector').classList.remove('open');
    showToast('Sede cambiata: ' + name);
}

// Close dropdown on outside click
document.addEventListener('click', function(e) {
    const sede = document.getElementById('sedeSelector');
    if (sede && !sede.contains(e.target)) {
        sede.classList.remove('open');
    }
});

// ============================================
// ORDERS TABLE
// ============================================

function renderOrders(filteredOrders) {
    const tbody = document.getElementById('ordersTableBody');
    const data = filteredOrders || orders;

    tbody.innerHTML = data.map(o => `
        <tr>
            <td><strong>${o.id}</strong></td>
            <td>${o.client}</td>
            <td>${o.typeName}</td>
            <td>${o.description}</td>
            <td>${o.qty}</td>
            <td><span class="badge badge-${o.priority}">${capitalize(o.priority)}</span></td>
            <td><span class="badge badge-${o.status}">${formatStatus(o.status)}</span></td>
            <td>${formatDate(o.delivery)}</td>
            <td><span class="badge badge-${o.origin}">${formatOrigin(o.origin)}</span></td>
            <td>
                <button class="action-btn" title="Dettagli"><i class="fas fa-eye"></i></button>
                <button class="action-btn" title="Modifica"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

function filterOrders() {
    const search = document.getElementById('orderSearch').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const client = document.getElementById('filterClient').value;
    const type = document.getElementById('filterType').value;

    const filtered = orders.filter(o => {
        const matchSearch = !search || o.id.toLowerCase().includes(search) ||
            o.description.toLowerCase().includes(search) || o.client.toLowerCase().includes(search);
        const matchStatus = !status || o.status === status;
        const matchClient = !client || o.client === client;
        const matchType = !type || o.type === type;
        return matchSearch && matchStatus && matchClient && matchType;
    });

    renderOrders(filtered);
}

function formatStatus(status) {
    const map = { 'in-attesa': 'In Attesa', 'in-produzione': 'In Produzione', 'completato': 'Completato', 'spedito': 'Spedito' };
    return map[status] || status;
}

function formatOrigin(origin) {
    const map = { 'manual': 'Manuale', 'ai-doc': 'AI Doc', 'ai-email': 'AI Email' };
    return map[origin] || origin;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Initialize orders table
renderOrders();

// ============================================
// MODALS
// ============================================

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    // Reset AI steps
    resetAISteps(id);
}

function resetAISteps(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll('.ai-step').forEach((step, i) => {
        step.style.display = i === 0 ? 'block' : 'none';
    });
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            resetAISteps(overlay.id);
        }
    });
});

// ============================================
// MANUAL ORDER
// ============================================

function submitManualOrder(e) {
    e.preventDefault();
    closeModal('modal-manual-order');
    showToast('Ordine creato con successo!');
}

// ============================================
// AI DOCUMENT PROCESSING
// ============================================

function simulateAIDocumentProcess() {
    document.getElementById('aiDocStep1').style.display = 'none';
    document.getElementById('aiDocStep2').style.display = 'block';

    const steps = [
        { text: 'Analisi formato documento...', delay: 600 },
        { text: 'Estrazione testo con OCR...', delay: 1200 },
        { text: 'Identificazione campi ordine...', delay: 1800 },
        { text: 'Validazione dati estratti...', delay: 2400 },
        { text: 'Matching con database clienti...', delay: 3000 },
        { text: 'Generazione ordine completata!', delay: 3600 },
    ];

    const log = document.getElementById('aiDocLog');
    const progress = document.getElementById('aiDocProgress');
    log.innerHTML = '';

    steps.forEach((step, i) => {
        setTimeout(() => {
            progress.style.width = ((i + 1) / steps.length * 100) + '%';

            // Mark previous as done
            const prev = log.querySelector('.ai-step-item.active');
            if (prev) {
                prev.classList.remove('active');
                prev.classList.add('done');
                prev.querySelector('i').className = 'fas fa-check-circle';
            }

            const div = document.createElement('div');
            div.className = 'ai-step-item ' + (i < steps.length - 1 ? 'active' : 'done');
            div.innerHTML = `<i class="fas ${i < steps.length - 1 ? 'fa-spinner fa-spin' : 'fa-check-circle'}"></i> ${step.text}`;
            log.appendChild(div);

            if (i === steps.length - 1) {
                setTimeout(() => {
                    document.getElementById('aiDocStep2').style.display = 'none';
                    document.getElementById('aiDocStep3').style.display = 'block';
                    document.getElementById('aiExtractedData').innerHTML = `
                        <div class="extracted-field"><span class="extracted-label">Cliente</span><span class="extracted-value">LM Wind Power</span></div>
                        <div class="extracted-field"><span class="extracted-label">Tipo Kit</span><span class="extracted-value">Kit Rinforzo Strutturale</span></div>
                        <div class="extracted-field"><span class="extracted-label">Descrizione</span><span class="extracted-value">Kit rinforzo trailing edge pala 107m</span></div>
                        <div class="extracted-field"><span class="extracted-label">Quantità</span><span class="extracted-value">30 set</span></div>
                        <div class="extracted-field"><span class="extracted-label">Data Consegna</span><span class="extracted-value">25 Apr 2026</span></div>
                        <div class="extracted-field"><span class="extracted-label">Priorità Rilevata</span><span class="extracted-value">Alta</span></div>
                        <div class="extracted-field"><span class="extracted-label">Specifiche</span><span class="extracted-value">BOM aggiornato Rev.C - Carbon/glass hybrid</span></div>
                        <div class="extracted-field"><span class="extracted-label">Confidenza AI</span><span class="extracted-value" style="color:#22c55e;font-weight:700">96.4%</span></div>
                    `;
                }, 500);
            }
        }, step.delay);
    });
}

// ============================================
// AI EMAIL PROCESSING
// ============================================

function simulateAIEmailProcess() {
    document.getElementById('emailStep1').style.display = 'none';
    document.getElementById('emailStep2').style.display = 'block';

    const steps = [
        { text: 'Connessione inbox email...', delay: 500 },
        { text: 'Analisi contenuto email selezionate...', delay: 1000 },
        { text: 'Estrazione allegati e PO...', delay: 1800 },
        { text: 'Parsing richieste d\'ordine con NLP...', delay: 2600 },
        { text: 'Cross-referencing con catalogo prodotti...', delay: 3200 },
        { text: 'Validazione e generazione ordini...', delay: 3800 },
    ];

    const log = document.getElementById('aiEmailLog');
    const progress = document.getElementById('aiEmailProgress');
    log.innerHTML = '';

    steps.forEach((step, i) => {
        setTimeout(() => {
            progress.style.width = ((i + 1) / steps.length * 100) + '%';

            const prev = log.querySelector('.ai-step-item.active');
            if (prev) {
                prev.classList.remove('active');
                prev.classList.add('done');
                prev.querySelector('i').className = 'fas fa-check-circle';
            }

            const div = document.createElement('div');
            div.className = 'ai-step-item ' + (i < steps.length - 1 ? 'active' : 'done');
            div.innerHTML = `<i class="fas ${i < steps.length - 1 ? 'fa-spinner fa-spin' : 'fa-check-circle'}"></i> ${step.text}`;
            log.appendChild(div);

            if (i === steps.length - 1) {
                setTimeout(() => {
                    document.getElementById('emailStep2').style.display = 'none';
                    document.getElementById('emailStep3').style.display = 'block';
                    document.getElementById('aiEmailExtractedData').innerHTML = `
                        <div class="email-order-card">
                            <h4><i class="fas fa-envelope text-blue-500"></i> Da: Lars Jensen (Vestas)</h4>
                            <div class="extracted-field"><span class="extracted-label">Tipo Kit</span><span class="extracted-value">Kit Fibra di Vetro</span></div>
                            <div class="extracted-field"><span class="extracted-label">Descrizione</span><span class="extracted-value">Kit fibra pala V-236 15MW - Lotto aggiuntivo Q2</span></div>
                            <div class="extracted-field"><span class="extracted-label">Quantità</span><span class="extracted-value">48 kit</span></div>
                            <div class="extracted-field"><span class="extracted-label">Data Consegna</span><span class="extracted-value">15 Apr 2026</span></div>
                            <div class="extracted-field"><span class="extracted-label">Priorità</span><span class="extracted-value">Urgente</span></div>
                            <div class="extracted-field"><span class="extracted-label">Confidenza AI</span><span class="extracted-value" style="color:#22c55e;font-weight:700">98.1%</span></div>
                        </div>
                        <div class="email-order-card">
                            <h4><i class="fas fa-envelope text-blue-500"></i> Da: Petra Schmidt (Siemens Gamesa)</h4>
                            <div class="extracted-field"><span class="extracted-label">Tipo Kit</span><span class="extracted-value">Kit Core Balsa/PET</span></div>
                            <div class="extracted-field"><span class="extracted-label">Descrizione</span><span class="extracted-value">Kit core balsa nacelle SG 14-236 DD - PO #SG-2026-1847</span></div>
                            <div class="extracted-field"><span class="extracted-label">Quantità</span><span class="extracted-value">120 kit</span></div>
                            <div class="extracted-field"><span class="extracted-label">Data Consegna</span><span class="extracted-value">30 Apr 2026</span></div>
                            <div class="extracted-field"><span class="extracted-label">Priorità</span><span class="extracted-value">Alta</span></div>
                            <div class="extracted-field"><span class="extracted-label">Confidenza AI</span><span class="extracted-value" style="color:#22c55e;font-weight:700">97.3%</span></div>
                        </div>
                    `;
                }, 500);
            }
        }, step.delay);
    });
}

function confirmAIOrder(type) {
    closeModal(type === 'document' ? 'modal-ai-document' : 'modal-ai-email');
    const msg = type === 'document' ? 'Ordine AI creato con successo!' : '2 ordini AI creati con successo!';
    showToast(msg);
}

// ============================================
// WORKFORCE - GANTT CHART
// ============================================

let ganttWeekOffset = 0;

function getWeekDays(offset) {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + (offset * 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
}

const ganttTasks = [
    { name: 'Squadra Taglio A', sub: 'RW-2026-001 (Vestas)', days: [1,1,1,1,1,0,0], type: 'cutting' },
    { name: 'Squadra Taglio B', sub: 'RW-2026-006 (GE)', days: [1,1,1,0,0,0,0], type: 'cutting' },
    { name: 'Squadra Taglio C', sub: 'RW-2026-005 (Vestas)', days: [0,0,1,1,1,0,0], type: 'cutting' },
    { name: 'Squadra Kitting A', sub: 'RW-2026-001 (Vestas)', days: [0,1,1,1,1,0,0], type: 'kitting' },
    { name: 'Squadra Kitting B', sub: 'RW-2026-002 (Siemens)', days: [1,1,1,1,1,0,0], type: 'kitting' },
    { name: 'Squadra Kitting C', sub: 'RW-2026-009 (Vestas)', days: [1,1,0,0,1,1,0], type: 'kitting' },
    { name: 'Confezionamento A', sub: 'RW-2026-007 (Siemens)', days: [1,1,1,0,0,0,0], type: 'packaging' },
    { name: 'Confezionamento B', sub: 'RW-2026-008 (Nordex)', days: [1,1,1,1,0,0,0], type: 'packaging' },
    { name: 'Confezionamento C', sub: 'RW-2026-006 (GE)', days: [0,0,0,1,1,1,0], type: 'packaging' },
    { name: 'QC Team', sub: 'Ispezioni multi-ordine', days: [1,1,1,1,1,0,0], type: 'quality' },
    { name: 'Logistica Spedizioni', sub: 'RW-2026-010, RW-2026-012', days: [1,0,1,0,1,0,0], type: 'shipping' },
];

function renderGantt() {
    const days = getWeekDays(ganttWeekOffset);
    const today = new Date();
    today.setHours(0,0,0,0);

    // Update week label
    const weekStart = days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    const weekEnd = days[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('ganttWeekLabel').textContent = `${weekStart} - ${weekEnd}`;

    const container = document.getElementById('ganttChart');
    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    let html = '<div class="gantt-header">';
    html += '<div class="gantt-header-cell">Risorsa / Squadra</div>';
    days.forEach((d, i) => {
        const isToday = d.getTime() === today.getTime();
        html += `<div class="gantt-header-cell ${isToday ? 'today' : ''}">${dayNames[i]}<br>${d.getDate()}/${d.getMonth()+1}</div>`;
    });
    html += '</div>';

    ganttTasks.forEach(task => {
        html += '<div class="gantt-row">';
        html += `<div class="gantt-row-label">${task.name}<small>${task.sub}</small></div>`;
        task.days.forEach((active, i) => {
            const isToday = days[i].getTime() === today.getTime();
            html += `<div class="gantt-cell ${isToday ? 'today' : ''}">`;
            if (active) {
                html += `<div class="gantt-bar ${task.type}"></div>`;
            }
            html += '</div>';
        });
        html += '</div>';
    });

    container.innerHTML = html;
}

function shiftGanttWeek(dir) {
    ganttWeekOffset += dir;
    renderGantt();
}

renderGantt();

// ============================================
// WORKFORCE - CALENDAR VIEW
// ============================================

function renderCalendar() {
    const days = getWeekDays(ganttWeekOffset);
    const today = new Date();
    today.setHours(0,0,0,0);
    const dayNames = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    const events = [
        { day: 0, start: 0, duration: 8, text: 'Taglio CNC - Vestas V-236', color: '#22c55e' },
        { day: 0, start: 1, duration: 7, text: 'Kitting fibra - SG 14-236', color: '#f59e0b' },
        { day: 1, start: 0, duration: 8, text: 'Taglio CNC - GE Haliade-X', color: '#22c55e' },
        { day: 1, start: 2, duration: 6, text: 'Confez. - Nordex N163', color: '#a855f7' },
        { day: 2, start: 0, duration: 8, text: 'Kitting core - Vestas V-150', color: '#f59e0b' },
        { day: 2, start: 1, duration: 4, text: 'QC Ispezione lotto FG-7891', color: '#ec4899' },
        { day: 3, start: 0, duration: 8, text: 'Taglio + Kitting - LM 107m', color: '#22c55e' },
        { day: 3, start: 2, duration: 6, text: 'Confez. - GE Haliade-X', color: '#a855f7' },
        { day: 4, start: 0, duration: 6, text: 'Spedizione Vestas + Siemens', color: '#14b8a6' },
        { day: 4, start: 1, duration: 5, text: 'Kitting vacuum - Nordex', color: '#f59e0b' },
        { day: 4, start: 3, duration: 3, text: 'QC Ispezione finale', color: '#ec4899' },
    ];

    let html = '<div class="calendar-grid">';

    // Time column
    html += '<div class="calendar-time-col">';
    html += '<div style="height:44px;border-bottom:2px solid #e2e8f0;"></div>';
    hours.forEach(h => {
        html += `<div class="calendar-time-slot">${h}</div>`;
    });
    html += '</div>';

    // Day columns
    days.forEach((d, di) => {
        const isToday = d.getTime() === today.getTime();
        html += '<div class="calendar-day-col">';
        html += `<div class="calendar-day-header ${isToday ? 'today' : ''}">${dayNames[di]}<br>${d.getDate()}/${d.getMonth()+1}</div>`;

        // Hour lines
        hours.forEach(() => {
            html += '<div class="calendar-hour-line"></div>';
        });

        // Events for this day
        events.filter(e => e.day === di).forEach(e => {
            const top = 44 + (e.start * 60);
            const height = e.duration * 60 - 4;
            html += `<div class="calendar-event" style="top:${top}px;height:${height}px;background:${e.color}">${e.text}</div>`;
        });

        html += '</div>';
    });

    html += '</div>';
    document.getElementById('calendarView').innerHTML = html;
}

renderCalendar();

// ============================================
// WORKFORCE - TABLE VIEW
// ============================================

function renderWorkforceTable() {
    const tbody = document.getElementById('workforceTableBody');
    tbody.innerHTML = workers.map(w => `
        <tr>
            <td><strong>${w.name}</strong></td>
            <td>${w.team}</td>
            <td>${w.shift}</td>
            <td>${w.order}</td>
            <td>${w.area}</td>
            <td><span class="badge ${w.status === 'attivo' ? 'badge-pass' : 'badge-warning'}">${capitalize(w.status)}</span></td>
            <td>${w.hours}h</td>
        </tr>
    `).join('');
}

renderWorkforceTable();

// ============================================
// VIEW SWITCHING
// ============================================

function switchWorkforceView(view) {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    document.querySelectorAll('.workforce-view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
}

// ============================================
// AI PANEL
// ============================================

function toggleAIPanel() {
    const panel = document.getElementById('aiPanel');
    panel.classList.toggle('active');
}

const aiResponses = {
    'Ottimizza allocazione personale per questa settimana': `Ho analizzato il carico di lavoro corrente. Ecco le mie raccomandazioni:

**Sovraccarico rilevato:**
- Area Kitting: 12 operatori su 10 postazioni (120% capacità)
- Confezionamento: Linea Pack 4 in manutenzione riduce capacità del 25%

**Suggerimenti:**
1. Spostare 2 operatori kitting al confezionamento per compensare Pack 4
2. Anticipare il turno pomeriggio di taglio di 1h per aumentare throughput
3. Assegnare Giulia Barbieri (Logistica) a supporto QC per le ispezioni urgenti del lotto GE

**Impatto stimato:** +15% efficienza complessiva, -1 giorno sui tempi di consegna RW-2026-006.`,

    'Ci sono colli di bottiglia nella produzione?': `**Analisi colli di bottiglia — 16 Marzo 2026**

🔴 **Critico: Area Confezionamento**
- Linea Pack 4 ferma per manutenzione (sostituzione rulli)
- 3 ordini in coda: RW-2026-007, RW-2026-008, RW-2026-006
- Ritardo stimato: 2-3 giorni se non risolta entro domani

🟡 **Attenzione: CNC-3 (Area Taglio)**
- In stato "attesa" per cambio lama programmato
- Impatto: -33% capacità di taglio
- Tempo ripristino: 4h

🟢 **OK: Area Kitting**
- Tutte le stazioni operative
- Capacità al 85% — margine sufficiente

**Azione consigliata:** Prioritizzare riparazione Pack 4 e CNC-3. Considerare straordinario sabato per recuperare ritardo confezionamento.`,

    'Prevedi ritardi per gli ordini in corso': `**Previsione ritardi — Analisi AI**

| Ordine | Cliente | Scadenza | Rischio | Previsione |
|--------|---------|----------|---------|------------|
| RW-2026-006 | GE Vernova | 5 Apr | 🔴 Alto | Ritardo 3-4 gg |
| RW-2026-001 | Vestas | 15 Apr | 🟡 Medio | Ritardo 1-2 gg |
| RW-2026-009 | Vestas | 20 Apr | 🟢 Basso | In tempo |
| RW-2026-002 | Siemens | 30 Apr | 🟢 Basso | In tempo |

**Dettaglio RW-2026-006 (più critico):**
- Causa: fermo Pack 4 + issue QC orientamento fibre
- Azione: rework lotto B12, accelerare confezionamento su Pack 1-2-3
- Con intervento: ritardo limitabile a 1 giorno`
};

function sendAIMessage(text) {
    const input = document.getElementById('aiInput');
    const message = text || input.value.trim();
    if (!message) return;

    const chat = document.getElementById('aiChat');

    // Add user message
    chat.innerHTML += `
        <div class="ai-message user">
            <div class="ai-avatar">MR</div>
            <div class="ai-bubble">${message}</div>
        </div>
    `;

    input.value = '';
    chat.scrollTop = chat.scrollHeight;

    // Add typing indicator
    const typingId = 'typing-' + Date.now();
    chat.innerHTML += `
        <div class="ai-message bot" id="${typingId}">
            <div class="ai-avatar"><i class="fas fa-robot"></i></div>
            <div class="ai-bubble">
                <div class="ai-typing"><span></span><span></span><span></span></div>
            </div>
        </div>
    `;
    chat.scrollTop = chat.scrollHeight;

    // Simulate response
    setTimeout(() => {
        const typingEl = document.getElementById(typingId);
        const response = aiResponses[message] || `Ho analizzato la tua richiesta: "${message}".

Sulla base dei dati attuali di produzione, posso confermare che:
- Gli ordini urgenti (RW-2026-001, RW-2026-006) sono in fase di lavorazione attiva
- La capacità produttiva è al 85% con margine per ottimizzazioni
- Consiglio di verificare lo stato della Linea Pack 4 per evitare ritardi

Vuoi che approfondisca un aspetto specifico?`;

        if (typingEl) {
            typingEl.querySelector('.ai-bubble').innerHTML = response.replace(/\n/g, '<br>');
        }
        chat.scrollTop = chat.scrollHeight;
    }, 1500 + Math.random() * 1000);
}

// ============================================
// QUALITY CONTROL
// ============================================

function renderQualityIssues() {
    const container = document.getElementById('activeIssues');
    container.innerHTML = qualityIssues.map(issue => `
        <div class="quality-item">
            <div class="quality-item-header">
                <span class="quality-item-title">${issue.title}</span>
                <span class="badge badge-${issue.type === 'critical' ? 'fail' : 'warning'}">${issue.type === 'critical' ? 'Critico' : 'Attenzione'}</span>
            </div>
            <div class="quality-item-detail">${issue.detail}</div>
            <div class="quality-item-meta">
                <span><i class="fas fa-clipboard-list"></i> ${issue.order}</span>
                <span><i class="fas fa-user"></i> ${issue.inspector}</span>
                <span><i class="fas fa-calendar"></i> ${formatDate(issue.date)}</span>
                <span class="badge badge-${issue.status === 'aperto' ? 'fail' : issue.status === 'in-review' ? 'warning' : 'pass'}">${capitalize(issue.status)}</span>
            </div>
        </div>
    `).join('');
}

function renderInspections() {
    const container = document.getElementById('recentInspections');
    container.innerHTML = qualityInspections.map(insp => `
        <div class="quality-item">
            <div class="quality-item-header">
                <span class="quality-item-title">${insp.test}</span>
                <span class="badge badge-${insp.result}">${insp.result === 'pass' ? 'Conforme' : insp.result === 'fail' ? 'Non Conforme' : 'Attenzione'}</span>
            </div>
            <div class="quality-item-meta">
                <span><i class="fas fa-clipboard-list"></i> ${insp.order}</span>
                <span><i class="fas fa-user"></i> ${insp.inspector}</span>
                <span><i class="fas fa-clock"></i> ${insp.date}</span>
            </div>
        </div>
    `).join('');
}

function renderPredictions() {
    const container = document.getElementById('aiPredictions');
    container.innerHTML = aiPredictions.map(p => `
        <div class="prediction-card">
            <div class="prediction-header">
                <span class="prediction-order">${p.order} (${p.client})</span>
                <span class="risk-badge risk-${p.risk}">${p.risk === 'high' ? 'Rischio Alto' : p.risk === 'medium' ? 'Rischio Medio' : 'Rischio Basso'}</span>
            </div>
            <div class="prediction-detail">${p.detail}</div>
            <div class="prediction-suggestion"><i class="fas fa-lightbulb"></i> ${p.suggestion}</div>
        </div>
    `).join('');
}

renderQualityIssues();
renderInspections();
renderPredictions();

// ============================================
// AI QUALITY CHECK
// ============================================

function runAIQualityCheck() {
    const alert = document.getElementById('aiQualityAlert');
    const body = document.getElementById('aiQualityAlertBody');

    alert.style.display = 'block';
    body.innerHTML = '<div class="ai-processing"><div class="ai-spinner"></div><p class="ai-processing-text">Analisi AI in corso su tutti gli ordini attivi...</p></div>';

    setTimeout(() => {
        body.innerHTML = `
            <div class="alert-finding critical">
                <h4>🔴 Rischio critico — Ordine RW-2026-006 (GE Vernova)</h4>
                <p>L'analisi dei dati storici del fornitore XY-Composites rivela un trend negativo nell'allineamento delle fibre UD negli ultimi 3 lotti. Il difetto rilevato nel QC-001 è coerente con questo pattern. <strong>Rischio di reso: 23%</strong> se il prodotto viene spedito senza rework completo del lotto B12. Raccomandazione: bloccare la spedizione e procedere con rework.</p>
            </div>
            <div class="alert-finding warning">
                <h4>🟡 Attenzione — Ordine RW-2026-001 (Vestas)</h4>
                <p>La variazione di spessore nel core balsa (±0.8mm vs ±0.5mm tolleranza) potrebbe causare problemi di adesione durante l'infusione. Il cliente Vestas ha storicamente rifiutato lotti con variazione >±0.6mm. Raccomandazione: selezionare manualmente i pannelli conformi e richiedere sostituzione dei 3 pannelli non conformi al fornitore.</p>
            </div>
            <div class="alert-finding info">
                <h4>🔵 Informativa — Prevenzione proattiva</h4>
                <p>L'AI ha identificato che le condizioni di umidità previste per la prossima settimana (65%) superano la soglia ottimale per il taglio di precisione dei tessuti unidirezionali. Raccomandazione: attivare deumidificatori supplementari nell'area taglio e programmare i tagli di precisione nella fascia oraria 6:00-12:00.</p>
            </div>
        `;
        alert.querySelector('.alert-header span').textContent = 'Analisi AI completata — 3 findings identificati';
    }, 3000);
}

// ============================================
// TOAST
// ============================================

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

// ============================================
// UPLOAD AREA INTERACTION
// ============================================

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#6366f1';
        uploadArea.style.background = '#eef2ff';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
        uploadArea.querySelector('p').innerHTML = '<i class="fas fa-file-pdf" style="color:#ef4444"></i> Documento caricato: PO_LMWindPower_2026.pdf';
    });
    fileInput.addEventListener('change', () => {
        uploadArea.querySelector('p').innerHTML = '<i class="fas fa-file-pdf" style="color:#ef4444"></i> Documento caricato: PO_LMWindPower_2026.pdf';
    });
}
