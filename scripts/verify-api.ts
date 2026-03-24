import fetch from 'node-fetch';

async function verify() {
  console.log('--- FINAL API VERIFICATION ---');
  try {
    const response = await fetch('http://127.0.0.1:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'bonjour' }),
    });
    
    console.log('STATUS:', response.status);
    const data = await response.json();
    console.log('DATA:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ API responds correctly.');
    } else {
      console.log('❌ API error.');
    }
  } catch (error) {
    console.error('FETCH ERROR:', error);
  }
}

verify();
