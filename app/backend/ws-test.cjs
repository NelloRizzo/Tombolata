const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001/ws');
ws.on('open', () => console.log('connected'));
ws.on('message', (d) => { const m = JSON.parse(d); if (m.type.startsWith('lottery')) console.log('MSG', m.type, 'active=', m.payload?.active, 'drawn=', m.payload?.drawn?.length); });
ws.on('error', (e) => console.log('err', e.message));
