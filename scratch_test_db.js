const { getOrCreateProfile, createBusinessWorkspace, getUserBusinesses } = require('./src/lib/db/index.ts');

async function runTest() {
  console.log("=== Testing Auth Flow for swarajfunda@gmail.com ===");
  const email = "swarajfunda@gmail.com";
  const pass = "20July@05";
  const name = "Swaraj";
  const bizName = "Swaraj Funda Store";
  const slug = email.replace(/[^a-zA-Z0-9]/g, '_');
  const userId = `usr_${slug}`;

  // 1. Profile Creation
  const profile = await getOrCreateProfile(userId, email, name);
  console.log("Profile created/fetched:", profile);

  // 2. Business Creation
  const bizResult = await createBusinessWorkspace(userId, bizName, "General Business", "INR");
  console.log("Business created/fetched:", bizResult.business);

  // 3. User Businesses Lookup
  const userBizs = await getUserBusinesses(userId);
  console.log("User Businesses count:", userBizs.length);
  console.log("User Business Name:", userBizs[0]?.business_name);

  if (userBizs[0]?.business_name === bizName) {
    console.log("SUCCESS: Workspace name matches exactly!");
  } else {
    console.error("FAIL: Workspace name mismatch!");
  }
}

runTest().catch(console.error);
