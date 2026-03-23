/**
 * NEXUS 2.0 Engine
 * L'intelligenza sincronizzata di STUDIO PRO 1.0
 */
const Nexus = (() => {
    const registry = new Map();
    const listeners = {};
    let viewport = null;

    return {
        boot: (containerId) => {
            viewport = document.getElementById(containerId);
            console.log('Nexus 2.2: Booting Ecosistema Optimized...');
            // Inizializza Proxy Asset se disponibili
            Nexus.assets = window.Lucide || {}; 
        },

        // Data Validation (DNA Check)
        validate: (schemaName, data) => {
            const schema = window.NexusSchema ? window.NexusSchema[schemaName] : null;
            if (!schema) return true; // No schema, skip validation
            
            for (const key in schema) {
                if (!(key in data)) {
                    console.error(`Nexus DNA Alert: Campo mancante [${key}] in ${schemaName}`);
                    return false;
                }
            }
            return true;
        },

        // Cloud Persistence & Sync
        sync: async (config) => {
            if (!window.supabase) return console.error('Nexus Cloud: Supabase non caricata.');
            window.db = window.supabase.createClient(config.url, config.key);
            console.log('Nexus Cloud: Sincronizzazione Attiva.');
            Nexus.emit('cloud-status', { status: 'online' });
        },

        // Hardware Communication Bridge
        bridge: async (type) => {
            try {
                if (type === 'serial') {
                    const port = await navigator.serial.requestPort();
                    await port.open({ baudRate: 9600 });
                    console.log('Nexus Bridge: Porta Seriale Connessa.');
                    return port;
                }
                if (type === 'usb') {
                    const device = await navigator.usb.requestDevice({ filters: [] });
                    await device.open();
                    console.log('Nexus Bridge: Dispositivo USB Connesso.');
                    return device;
                }
            } catch (err) {
                console.error('Nexus Bridge Error:', err);
                Nexus.emit('hardware-error', { message: err.message });
            }
        },

        register: (id, config) => {
            registry.set(id, config);
            Nexus.emit('module-registered', { id, ...config });
        },

        launch: (id) => {
            const config = registry.get(id);
            if (!config || !viewport) return;

            viewport.innerHTML = `<iframe src="${config.uri}" id="app-${id}"></iframe>`;
            // Re-bind Lucide icons if any
            if (window.lucide) lucide.createIcons();
            
            Nexus.emit('module-launched', { id });
        },

        on: (event, callback) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(callback);
        },

        emit: (event, data) => {
            if (listeners[event]) {
                listeners[event].forEach(cb => cb(data));
            }
            // Broadcast to all iframes
            document.querySelectorAll('iframe').forEach(frame => {
                frame.contentWindow.postMessage({ type: event, data }, '*');
            });
            console.log(`[Nexus] Event: ${event}`, data);
        },

        // Persistence Helper
        save: (key, val) => localStorage.setItem(`sp10_${key}`, JSON.stringify(val)),
        load: (key) => JSON.parse(localStorage.getItem(`sp10_${key}`))
    };
})();

// Listen for messages from within iframes
window.addEventListener('message', (event) => {
    if (event.data && event.data.type) {
        Nexus.emit(event.data.type, event.data.data);
    }
});

window.Nexus = Nexus;
