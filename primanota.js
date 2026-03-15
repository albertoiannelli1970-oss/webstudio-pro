// Prima Nota Module Logic
const appPrimaNota = {
    currentCassa: 12150.00,
    
    registraMovimento: function(e) {
        e.preventDefault();
        const dataVal = document.getElementById('pn-data').value;
        const tipoVal = document.getElementById('pn-tipo').value;
        const descVal = document.getElementById('pn-desc').value;
        const importoVal = parseFloat(document.getElementById('pn-importo').value);

        if(!dataVal || !descVal || isNaN(importoVal)) {
            alert("Compila tutti i campi correttamente.");
            return;
        }

        // Format Date
        const dateParts = dataVal.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : dataVal;

        let icon = '';
        let color = '';
        let prefix = '';

        if(tipoVal === 'entrata') {
            this.currentCassa += importoVal;
            icon = 'arrow-upRight';
            color = 'var(--success)';
            prefix = '+';
            // Aggiorna anche la dashboard
            const dashCassa = document.getElementById('dash-cassa');
            if(dashCassa) dashCassa.innerHTML = `€ ${this.currentCassa.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
        } else {
            this.currentCassa -= importoVal;
            icon = 'arrow-downRight';
            color = 'var(--danger)';
            prefix = '-';
        }

        const container = document.getElementById('pn-table-container');
        if (container.querySelector('.fa-file-x, .lucide-file-x')) {
            container.innerHTML = `<table style="width:100%; text-align:left; border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <th style="padding:10px;">Data</th>
                        <th style="padding:10px;">Movimento</th>
                        <th style="padding:10px;">Importo</th>
                    </tr>
                </thead>
                <tbody id="pn-tbody"></tbody>
            </table>`;
        }
        
        const tbody = document.getElementById('pn-tbody');
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        tr.innerHTML = `
            <td style="padding:10px;">${formattedDate}</td>
            <td style="padding:10px; font-weight:500; color:#fff;">${descVal}</td>
            <td style="padding:10px; color:${color}; font-weight:bold;">${prefix} € ${importoVal.toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
        `;
        
        tbody.insertBefore(tr, tbody.firstChild);

        // Aggiungi un piccolo log in sistema
        coreSystem.addLog(`[PRIMA NOTA] Registrato movimento: ${descVal} (${prefix}€${importoVal})`, 'success');

        document.getElementById('form-primanota').reset();
    }
}
