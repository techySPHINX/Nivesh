// WebSocket Streaming Test
const io = require('socket.io-client');

console.log('🔌 Connecting to WebSocket...\n');

const socket = io('http://localhost:3001/ai-chat', {
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ Connected to AI Chat Gateway\n');
  console.log('📤 Sending query...\n');
  
  socket.emit('query', {
    prompt: 'Explain the benefits of long-term investing in equity markets with a simple example',
    userId: 'test-websocket-user',
    temperature: 0.7
  });
});

socket.on('stream_started', (data) => {
  console.log('🚀 Stream Started');
  console.log('Trace ID:', data.traceId);
  console.log('\n📨 Response:\n');
  console.log('─'.repeat(60));
});

let fullText = '';

socket.on('response_chunk', (data) => {
  process.stdout.write(data.chunk);
  fullText += data.chunk;
});

socket.on('stream_complete', (data) => {
  console.log('\n' + '─'.repeat(60));
  console.log('\n✅ Stream Complete');
  console.log('Total Tokens:', data.metadata.tokensUsed);
  console.log('Total Latency:', data.metadata.latencyMs + 'ms');
  console.log('Characters:', fullText.length);
  
  // Send positive feedback
  console.log('\n👍 Sending positive feedback...');
  socket.emit('feedback', {
    traceId: data.metadata.traceId,
    rating: 1,
    comment: 'Great explanation!'
  });
  
  setTimeout(() => {
    console.log('✅ Test completed successfully!\n');
    socket.disconnect();
    process.exit(0);
  }, 1000);
});

socket.on('error', (error) => {
  console.error('\n❌ Error:', error.message);
  socket.disconnect();
  process.exit(1);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection Error:', error.message);
  console.log('\n💡 Make sure the backend server is running on http://localhost:3001');
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n❌ Test timeout after 30 seconds');
  socket.disconnect();
  process.exit(1);
}, 30000);
