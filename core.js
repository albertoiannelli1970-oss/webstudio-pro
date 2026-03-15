/**
 * WebStudio Pro Core (Event Bus & Permissions Controller)
 * Simulazione del sistema centrale della piattaforma.
 */

class WebStudioCore {
    constructor() {
        this.permissions = {
            'rubrica->fatture': true,
            'magazzino->cassa': true
        };
        this.events = {};
        this.exchangeCount = 0;
        this.logMessage('[SYSTEM] WebStudio Pro Core Inizializzato. In attesa di segnali...', 'system');
    }

    // Aggiorna permessi di comunicazione tra moduli
    updatePermission(source, target, isAllowed) {
        const key = `${source}->${target}`;
        this.permissions[key] = isAllowed;
        
        if(isAllowed) {
            this.logMessage(`[PERMESSI] Canale ${source.toUpperCase()} ➔ ${target.toUpperCase()} APERTO.`, 'success');
        } else {
            this.logMessage(`[PERMESSI] Canale ${source.toUpperCase()} ➔ ${target.toUpperCase()} BLOCCATO dal sistema di sicurezza.`, 'blocked');
        }

        // Se tutti i canali sono bloccati, disattiva il pallino globale
        const anyActive = Object.values(this.permissions).some(v => v);
        const syncDot = document.getElementById('global-sync-dot');
        if(syncDot) {
            if(anyActive) syncDot.classList.add('active');
            else syncDot.classList.remove('active');
        }
    }

    // Registra un modulo che vuole ascoltare eventi
    subscribe(targetModule, type, callback) {
        if (!this.events[type]) {
            this.events[type] = [];
        }
        this.events[type].push({ targetModule, callback });
        this.logMessage(`[SYSTEM] Modulo '${targetModule}' iscritto a eventi di tipo '${type}'.`, 'system');
    }

    // Pubblica un evento da un modulo sorgente
    publish(sourceModule, type, data) {
        this.logMessage(`[ACTION] Modulo '${sourceModule}' invia evento: ${type}.`, 'action');
        
        // Simula ritardo di rete
        setTimeout(() => {
            if (!this.events[type]) return;

            this.events[type].forEach(listener => {
                const targetModule = listener.targetModule;
                const canCommunicate = this.canCommunicate(sourceModule, targetModule);

                if (canCommunicate) {
                    this.exchangeCount++;
                    document.getElementById('stat-exchanges').textContent = this.exchangeCount;
                    
                    this.logMessage(`[BUS] ${sourceModule.toUpperCase()} ➔ ${targetModule.toUpperCase()}: Consegna autorizzata.`, 'success');
                    
                    // Trigger monitor verde
                    this.triggerEventMonitor(sourceModule, targetModule, true);
                    
                    // Esegue l'azione sull'app di destinazione
                    listener.callback(data);
                } else {
                    this.logMessage(`[BUS] FIREWALL: Richiesta da ${sourceModule.toUpperCase()} verso ${targetModule.toUpperCase()} bloccata.`, 'blocked');
                    
                    // Trigger monitor rosso
                    this.triggerEventMonitor(sourceModule, targetModule, false);
                }
            });
        }, 500);
    }

    // Verifica Permission
    canCommunicate(source, target) {
        const key = `${source}->${target}`;
        return this.permissions[key] === true;
    }

    // UI Utilities centralizzate
    logMessage(msg, type = 'action') {
        const logWindow = document.getElementById('sys-logs');
        if (!logWindow) return;
        
        const time = new Date().toLocaleTimeString('it-IT');
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.innerHTML = `<span style="opacity:0.6; font-size:11px;">[${time}]</span> ${msg}`;
        
        logWindow.appendChild(div);
        logWindow.scrollTop = logWindow.scrollHeight;
    }

    triggerEventMonitor(source, target, success) {
        const mon = document.getElementById('event-monitor');
        const txt = document.getElementById('event-monitor-text');
        if(!mon || !txt) return;

        if(success) {
            mon.style.background = 'rgba(16, 185, 129, 0.2)';
            mon.style.color = '#10b981';
            txt.textContent = `Sync: ${source} > ${target}`;
        } else {
            mon.style.background = 'rgba(239, 68, 68, 0.2)';
            mon.style.color = '#ef4444';
            mon.style.borderColor = '#ef4444';
            txt.textContent = `Bloccato: ${source} > ${target}`;
        }

        setTimeout(() => {
            mon.style.background = '';
            mon.style.color = '';
            mon.style.borderColor = '';
            txt.textContent = 'Nessun transito dati';
        }, 3000);
    }
}

// Inizializza il core globale (Event Bus)
window.coreSystem = new WebStudioCore();
