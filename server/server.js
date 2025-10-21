import { WebSocketServer , WebSocket} from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is required');
    process.exit(1);
}

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', async (clientWs) => {
    console.log('Client connected');
    
    try {
        // Connect to OpenAI Realtime API
        const openaiWs = new WebSocket(
            'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'realtime=v1'
                }
            }
        );
        
        openaiWs.on('open', () => {
            console.log('Connected to OpenAI');
            
            // Configure session
            openaiWs.send(JSON.stringify({
                type: 'session.update',
                session: {
                    modalities: ['text', 'audio'],
                    instructions: 'You are a helpful AI meeting assistant. Be concise and friendly.',
                    voice: 'alloy',
                    input_audio_format: 'pcm16',
                    output_audio_format: 'pcm16',
                    turn_detection: {
                        type: 'server_vad'
                    }
                }
            }));
        });
        
        // Client -> OpenAI
        clientWs.on('message', (message) => {
            if (openaiWs.readyState === WebSocket.OPEN) {
                openaiWs.send(message);
            }
        });
        
        // OpenAI -> Client
        openaiWs.on('message', (message) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(message);
            }
        });
        
        // Handle closures
        clientWs.on('close', () => {
            console.log('Client disconnected');
            openaiWs.close();
        });
        
        openaiWs.on('close', () => {
            console.log('OpenAI disconnected');
            clientWs.close();
        });
        
        openaiWs.on('error', (error) => {
            console.error('OpenAI error:', error);
            clientWs.close();
        });
        
    } catch (error) {
        console.error('Connection error:', error);
        clientWs.close();
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
