require('dotenv').config();
const path = require('path');

// Ensure .env is loaded
console.log('Current directory:', __dirname);
console.log('Loading environment from:', path.join(__dirname, '.env'));

// Import email service
const {
  testEmailConnection,
  checkEmailServiceHealth,
  sendEmail
} = require('./utils/emailService');

async function runTests() {
  console.log('🚀 Starting Email Service Tests\n');
  
  // Show current environment
  console.log('🔍 Environment Variables:');
  console.log('- BREVO_API_KEY:', process.env.BREVO_API_KEY ? `Set (${process.env.BREVO_API_KEY.substring(0, 10)}...)` : 'MISSING');
  console.log('- SENDER_EMAIL:', process.env.SENDER_EMAIL || 'Not set');
  console.log('- FROM_NAME:', process.env.FROM_NAME || 'Not set');
  
  // 1. Check health
  console.log('\n1. Checking service health...');
  try {
    const health = await checkEmailServiceHealth();
    console.log('✅ Health check completed');
    console.log(JSON.stringify(health, null, 2));
    
    if (!health.brevoApiKey) {
      console.error('❌ Brevo API key is missing!');
      console.error('   Please add BREVO_API_KEY to your .env file');
      console.error('   Get your key from: https://app.brevo.com/settings/keys/api');
      process.exit(1);
    }
    
    if (health.brevoKeyFormat === 'Invalid') {
      console.warn('⚠️  Brevo API key format may be invalid');
      console.warn('   It should start with "xkeysib-"');
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
  
  // 2. Test with your actual email
  console.log('\n2. Testing email connection with your email...');
  try {
    const testEmail = 'firstintlservices@gmail.com'; // Replace with your email
    console.log(`   Testing with: ${testEmail}`);
    
    const testResult = await testEmailConnection(testEmail);
    
    if (testResult) {
      console.log('✅ Test email sent successfully!');
      console.log('   Check your inbox (and spam folder)');
    } else {
      console.log('❌ Test email failed');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('   Error details:', error);
  }
  
  // 3. Direct send test with simpler email
  console.log('\n3. Testing direct email send...');
  try {
    const testEmail = 'ebukajude14@gmail.com'; // Replace with your email
    const result = await sendEmail(
      testEmail,
      'Direct Email Test from First International Financial Services',
      `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h1 style="color: #4CAF50;">📧 Direct Email Test</h1>
        <p>This is a direct test of the email service.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Service:</strong> Brevo API</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">
          If you receive this, your email service is working correctly!
        </p>
      </div>
      `
    );
    console.log('✅ Direct test passed!');
    console.log('   Message ID:', result.messageId);
  } catch (error) {
    console.log('❌ Direct test failed -', error.message);
    
    // Provide troubleshooting tips
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your .env file exists in the correct location');
    console.log('2. Verify BREVO_API_KEY is correct');
    console.log('3. Make sure "firstintlservices@gmail.com" is verified in Brevo');
    console.log('4. Check Brevo dashboard for any API usage limits');
  }
  
  console.log('\n🏁 Test sequence completed');
}

runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});