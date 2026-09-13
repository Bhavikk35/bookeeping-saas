const https = require('https');

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function testNetlifyLive() {
  console.log("==================================================");
  console.log("TESTING LIVE NETLIFY DEPLOYMENT AT:");
  console.log("https://bookeeping-sas.netlify.app/");
  console.log("==================================================");

  const email = "swarajfunda@gmail.com";
  const password = "20July@05";
  const name = "Swaraj";
  const bizName = "Swaraj Funda Store";

  // Test 1: Sign Up / Register Account on Netlify
  console.log("\n1. Testing POST /api/auth/login on Netlify Live...");
  const loginRes = await makeRequest('https://bookeeping-sas.netlify.app/api/auth/login', 'POST', {
    email,
    password,
    name,
    businessName: bizName
  });

  console.log("Netlify HTTP Status Code:", loginRes.statusCode);
  console.log("Netlify Response Data:", JSON.stringify(loginRes.data, null, 2));

  if (loginRes.data && loginRes.data.success) {
    console.log("\n✅ NETLIFY AUTH LOGIN PASSED!");
    console.log("User Email:", loginRes.data.user.email);
    console.log("Business Name:", loginRes.data.business.business_name);
    console.log("Business ID:", loginRes.data.business.id);

    // Test 2: Fetch Transactions List for the newly created Business Workspace on Netlify
    const bizId = loginRes.data.business.id;
    console.log(`\n2. Testing GET /api/transactions/list?businessId=${bizId} on Netlify Live...`);
    const listRes = await makeRequest(`https://bookeeping-sas.netlify.app/api/transactions/list?businessId=${bizId}`, 'GET');

    console.log("Netlify Transactions HTTP Status Code:", listRes.statusCode);
    console.log("Netlify Transactions Count:", listRes.data.transactions?.length || 0);
    console.log("Netlify Metrics:", JSON.stringify(listRes.data.metrics, null, 2));

    if (listRes.data.transactions?.length === 0) {
      console.log("\n✅ NETLIFY WORKSPACE ISOLATION PASSED!");
      console.log("New account has 0 leaked transactions, $0 revenue, $0 expenses!");
    } else {
      console.log("\n⚠️ Transactions returned:", listRes.data.transactions);
    }
  } else {
    console.error("❌ NETLIFY AUTH FAILED:", loginRes);
  }
}

testNetlifyLive().catch(console.error);
