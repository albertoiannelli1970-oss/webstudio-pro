/**
 * NEXUS SCHEMA REGISTRY
 * Definizione del DNA dei dati di STUDIO PRO 1.0
 */
const NexusSchema = {
    // Schema per i movimenti di Magazzino
    STOCK_ITEM: {
        id: "string",
        name: "string",
        qty: "number",
        min_qty: "number",
        supplier: "string"
    },
    
    // Schema per le transazioni (Prima Nota)
    TRANSACTION: {
        id: "string",
        date: "string",
        desc: "string",
        amount: "number",
        type: "income|expense"
    },

    // Schema per la Fatturazione
    INVOICE: {
        number: "string",
        client_id: "string",
        items: "array",
        total: "number",
        status: "paid|pending"
    }
};

if (typeof window !== 'undefined') window.NexusSchema = NexusSchema;
