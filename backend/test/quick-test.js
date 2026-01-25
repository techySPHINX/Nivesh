// Quick Test Script for LLM Integration
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1/ai';

async function runTests() {
  console.log('🧪 Starting LLM Integration Tests...\n');

  // Test 1: Basic Generation
  console.log('📝 Test 1: Basic Text Generation');
  try {
    const response = await axios.post(`${BASE_URL}/generate`, {
      prompt: 'What is the benefit of SIP investing in mutual funds?',
      userId: 'test-user-001',
      temperature: 0.7
    });
    console.log('✅ SUCCESS');
    console.log('Response length:', response.data.text.length);
    console.log('Tokens used:', response.data.metadata.tokensUsed);
    console.log('Latency:', response.data.metadata.latencyMs + 'ms\n');
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data?.message || error.message);
  }

  // Test 2: Function Calling - EMI
  console.log('💰 Test 2: EMI Calculation Function');
  try {
    const response = await axios.post(`${BASE_URL}/function-call`, {
      prompt: 'Calculate EMI for ₹10 lakh loan at 8% interest for 5 years',
      userId: 'test-user-001',
      enableFunctions: true
    });
    console.log('✅ SUCCESS');
    const emiCall = response.data.functionCalls?.find(c => c.name === 'calculate_emi');
    if (emiCall) {
      console.log('Monthly EMI:', emiCall.result.monthly_emi);
      console.log('Total Interest:', emiCall.result.total_interest);
    }
    console.log('');
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data?.message || error.message);
  }

  // Test 3: Safety Check - PII Detection
  console.log('🛡️  Test 3: PII Detection (Should Block)');
  try {
    const response = await axios.post(`${BASE_URL}/generate`, {
      prompt: 'My PAN is ABCDE1234F, help me invest',
      userId: 'test-user-001'
    });
    console.log('❌ FAILED: Should have blocked PII');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message.includes('PII')) {
      console.log('✅ SUCCESS: PII correctly detected and blocked');
    } else {
      console.log('❌ FAILED:', error.message);
    }
  }
  console.log('');

  // Test 4: Structured Output
  console.log('📊 Test 4: Structured Output');
  try {
    const response = await axios.post(`${BASE_URL}/structured`, {
      prompt: 'Analyze Reliance stock',
      userId: 'test-user-001',
      schema: {
        type: 'object',
        properties: {
          ticker: { type: 'string' },
          recommendation: { type: 'string', enum: ['BUY', 'HOLD', 'SELL'] },
          targetPrice: { type: 'number' },
          reasoning: { type: 'string' }
        },
        required: ['ticker', 'recommendation', 'targetPrice', 'reasoning']
      }
    });
    console.log('✅ SUCCESS');
    console.log('Recommendation:', response.data.data.recommendation);
    console.log('Target Price:', response.data.data.targetPrice);
    console.log('');
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data?.message || error.message);
  }

  // Test 5: Create Prompt
  console.log('📝 Test 5: Create Prompt');
  try {
    const response = await axios.post(`${BASE_URL}/prompts`, {
      promptName: 'test-advisor',
      promptText: 'You are a helpful financial advisor.',
      version: '1.0.0',
      status: 'DRAFT',
      temperature: 0.8
    });
    console.log('✅ SUCCESS');
    console.log('Prompt ID:', response.data.id);
    console.log('Version:', response.data.version);
    console.log('');
  } catch (error) {
    console.log('❌ FAILED:', error.response?.data?.message || error.message);
  }

  console.log('✨ All tests completed!\n');
}

// Run tests
runTests().catch(console.error);
