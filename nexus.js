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
            console.log('Nexus 2.0: Booting Ecosistema...');
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
