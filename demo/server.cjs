const http = require('http');
const {WebSocketServer} = require('ws');

// Helper: stream reader for POST body
async function streamData(req) {
    for await (const chunk of req) {
        console.log('Streamed chunk:', chunk.toString());
    }
}

async function openWebSocketServer(server) {
    const wss = new WebSocketServer({server});

    wss.on('connection', ws => {
        console.log('Client connected');
        ws.on('message', message => {
            console.log('Received (WS):', message.toString());
            ws.send(`Echo: ${message}`);
        });
    });
}

async function startServer() {
    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === '/stream') {
            await streamData(req);
            res.writeHead(200);
            res.end('Stream received');
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    await openWebSocketServer(server);

    server.listen(3000, () => {
        console.log('Server running on http://localhost:3000');
    });
}

startServer();
