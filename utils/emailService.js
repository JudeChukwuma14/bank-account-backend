const axios = require('axios');
const path = require('path');
const ejs = require('ejs');

// ==================== CONFIGURATION ====================
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'firstintlservices@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'First International Financial Services';

// Validate configuration on startup
if (!BREVO_API_KEY) {
  console.error('❌ CRITICAL: BREVO_API_KEY is missing in environment variables');
  console.error('   Please add to your .env file:');
  console.error('   BREVO_API_KEY=your_brevo_api_key_here');
}

// ==================== CORE FUNCTIONS ====================

/**
 * Render EJS template
 */
const renderTemplate = async (templateName, data) => {
  try {
    const templatePath = path.join(__dirname, "..", "views", "emails", `${templateName}.ejs`);
    
    if (!require('fs').existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }
    
    const html = await ejs.renderFile(templatePath, data);
    return html;
  } catch (error) {
    console.error(`❌ Error rendering template ${templateName}:`, error);
    throw new Error(`Failed to render email template: ${error.message}`);
  }
};

/**
 * Generic email sending function using Brevo
 */
const sendEmail = async (to, subject, html, replyTo = null) => {
  try {
    // Validate inputs
    if (!BREVO_API_KEY) {
      throw new Error('Brevo API key is missing. Check your BREVO_API_KEY in .env file.');
    }

    if (!to || !to.includes('@')) {
      throw new Error(`Invalid email address: ${to}`);
    }

    if (!subject || subject.trim().length === 0) {
      throw new Error('Email subject is required');
    }

    if (!html || html.trim().length === 0) {
      throw new Error('Email HTML content is required');
    }



    // Prepare email data
    const emailData = {
      sender: {
        name: FROM_NAME,
        email: SENDER_EMAIL
      },
      to: [
        {
          email: to.trim(),
          name: to.split('@')[0]
        }
      ],
      subject: subject.trim(),
      htmlContent: html
    };

    // Add replyTo if provided
    if (replyTo) {
      emailData.replyTo = {
        email: replyTo,
        name: FROM_NAME
      };
    }

    // Send email via Brevo API
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      emailData,
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
          'accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    
    return {
      success: true,
      messageId: response.data.messageId,
      data: response.data
    };
    
  } catch (error) {
    console.error('❌ Error sending email via Brevo:');
    
    // Detailed error logging
    if (error.response) {
      // Server responded with error
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        throw new Error('Invalid Brevo API key. Please check your BREVO_API_KEY.');
      }
      
      if (error.response.status === 400) {
        throw new Error(`Invalid email parameters: ${error.response.data.message || 'Bad request'}`);
      }
      
      if (error.response.status === 403) {
        throw new Error('Access forbidden. Check your Brevo account permissions.');
      }
      
    } else if (error.request) {
      // No response received
      console.error('No response received from Brevo API');
      throw new Error('Cannot connect to Brevo API. Check your internet connection.');
      
    } else {
      // Request setup error
      console.error('Request error:', error.message);
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// ==================== EMAIL FUNCTIONS ====================

/**
 * Send verification email
 */
const sendVerificationEmail = async (member, verificationCode) => {
  try {
   
    
    const html = await renderTemplate('verification', {
      firstName: member.firstName,
      verificationCode: verificationCode,
      accountNumber: member.accountNumber,
      expiresIn: '24 hours'
    });

    await sendEmail(member.email, 'Verify Your Email - First International Financial Services', html);
    console.log(`✅ Verification email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error.message);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send login verification email (2FA)
 */
const sendLoginVerificationEmail = async (member, verificationCode) => {
  try {
    console.log(`🔐 Sending login verification email to: ${member.email}`);
    
    const html = await renderTemplate('login-verification', {
      firstName: member.firstName,
      verificationCode: verificationCode,
      expiresIn: '10 minutes',
      loginTime: new Date().toLocaleString()
    });

    await sendEmail(member.email, 'Login Verification Code - First International Financial Services', html);
    console.log(`✅ Login verification email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending login verification email:', error.message);
    throw new Error('Failed to send login verification email');
  }
};

/**
 * Send payment success email
 */
const sendPaymentSuccessEmail = async (member, paymentDetails) => {
  try {
    console.log(`💰 Sending payment success email to: ${member.email}`);
    
    const html = await renderTemplate('payment-success', {
      firstName: member.firstName,
      lastName: member.lastName,
      accountNumber: member.accountNumber,
      amount: paymentDetails?.amount || member.paymentAmount || 0,
      currency: 'NGN',
      paymentDate: paymentDetails?.paymentDate || new Date().toLocaleDateString(),
      transactionId: paymentDetails?.transactionId || member.transactionId || 'N/A',
      paymentReference: paymentDetails?.paymentReference || member.paymentReference || 'N/A'
    });

    await sendEmail(member.email, 'Payment Successful - Account Activated! 🎉', html);
    console.log(`✅ Payment success email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending payment success email:', error.message);
    throw new Error('Failed to send payment success email');
  }
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (member) => {
  try {
    console.log(`👋 Sending welcome email to: ${member.email}`);
    
    const html = await renderTemplate('welcome', {
      firstName: member.firstName,
      lastName: member.lastName,
      accountNumber: member.accountNumber,
      routingNumber: member.routingNumber || 'N/A',
      accountType: member.accountType,
      openingDeposit: member.openingDeposit || 0,
      balance: member.balance || 0,
      activationFee: member.paymentAmount || 0,
      activatedAt: member.activatedAt?.toLocaleDateString() || new Date().toLocaleDateString()
    });

    await sendEmail(member.email, 'Welcome to First International Financial Services - Your Account is Now Active!', html);
    console.log(`✅ Welcome email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    throw new Error('Failed to send welcome email');
  }
};

/**
 * Send account status email
 */
const sendAccountStatusEmail = async (member, status) => {
  try {
    console.log(`📊 Sending account status email to: ${member.email}`);
    
    const getStatusMessage = (status) => {
      const messages = {
        'pending': 'Your account application is being processed.',
        'under_review': 'Your account application is under review. We will notify you once verified.',
        'verified': 'Your account has been verified successfully! Please proceed with payment.',
        'active': 'Your account is now active and ready to use.',
        'rejected': 'Your account application has been rejected. Please contact support for more information.',
        'suspended': 'Your account has been suspended. Please contact our support team.',
        'closed': 'Your account has been closed.'
      };
      return messages[status] || 'Your account status has been updated.';
    };

    const html = await renderTemplate('account-status', {
      firstName: member.firstName,
      status: status,
      accountNumber: member.accountNumber,
      message: getStatusMessage(status)
    });

    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    await sendEmail(member.email, `Account Status Update - ${formattedStatus}`, html);
    console.log(`✅ Account status email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending account status email:', error.message);
    throw new Error('Failed to send account status email');
  }
};

/**
 * Send payment instructions email
 */
const sendPaymentInstructionsEmail = async (member, paymentAccount) => {
  try {
    console.log(`📋 Sending payment instructions email to: ${member.email}`);
    
    const html = await renderTemplate('payment-instructions', {
      firstName: member.firstName,
      accountNumber: member.accountNumber,
      paymentReference: member.paymentReference,
      paymentAccount: paymentAccount,
      amount: paymentAccount?.amount || 0,
      currency: paymentAccount?.currency || 'NGN'
    });

    await sendEmail(member.email, 'Payment Instructions - Account Activation', html);
    console.log(`✅ Payment instructions email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending payment instructions email:', error.message);
    throw new Error('Failed to send payment instructions email');
  }
};

// ==================== LOAN EMAIL FUNCTIONS ====================

/**
 * Send loan payment request email
 */
const sendLoanPaymentRequestEmail = async (member, loanDetails, paymentAccounts) => {
  try {
    console.log(`📝 Sending loan payment request email to: ${member.email}`);
    
    const html = await renderTemplate('loan-payment-request', {
      firstName: member.firstName,
      loanId: loanDetails._id?.toString().slice(-8) || 'N/A',
      loanAmount: loanDetails.loanAmount || 0,
      upfrontAmount: loanDetails.upfrontPaymentRequired || 0,
      paymentReference: loanDetails.paymentReference || 'N/A',
      paymentAccounts: paymentAccounts || []
    });

    const upfrontAmount = loanDetails.upfrontPaymentRequired || 0;
    const amountFormatted = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(upfrontAmount);

    await sendEmail(
      member.email, 
      `Loan Application - Upfront Payment Required (${amountFormatted})`, 
      html
    );
    console.log(`✅ Loan payment request email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending loan payment request email:', error.message);
    throw new Error('Failed to send loan payment request email');
  }
};

/**
 * Send loan payment verified email
 */
const sendLoanPaymentVerifiedEmail = async (member, loanDetails, paymentDetails) => {
  try {
    console.log(`✅ Sending loan payment verified email to: ${member.email}`);
    
    const html = await renderTemplate('loan-payment-verified', {
      firstName: member.firstName,
      loanId: loanDetails._id?.toString().slice(-8) || 'N/A',
      paymentAmount: paymentDetails?.paymentAmount || 0,
      paymentReference: paymentDetails?.paymentReference || 'N/A',
      verificationDate: new Date().toLocaleDateString('en-NG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    });

    await sendEmail(member.email, 'Payment Verified - Loan Under Review!', html);
    console.log(`✅ Loan payment verified email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending loan payment verified email:', error.message);
    throw new Error('Failed to send loan payment verified email');
  }
};

/**
 * Send loan approved email
 */
const sendLoanApprovedEmail = async (member, loanDetails) => {
  try {
    console.log(`🎉 Sending loan approved email to: ${member.email}`);
    
    const html = await renderTemplate('loan-approved', {
      firstName: member.firstName,
      approvedAmount: loanDetails.approvedAmount || 0,
      interestRate: loanDetails.approvedInterestRate || 0,
      loanTerm: loanDetails.approvedTerm || 0,
      loanPurpose: loanDetails.loanPurpose || 'Not specified',
      monthlyPayment: loanDetails.monthlyPayment || 0,
      totalPayment: loanDetails.totalPayment || 0,
      approvalDate: loanDetails.approvalDate?.toLocaleDateString('en-NG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) || new Date().toLocaleDateString('en-NG'),
      firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-NG')
    });

    const approvedAmount = loanDetails.approvedAmount || 0;
    const amountFormatted = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(approvedAmount);

    await sendEmail(
      member.email, 
      `Congratulations! Your ${amountFormatted} Loan is Approved! 🎉`, 
      html
    );
    console.log(`✅ Loan approved email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending loan approved email:', error.message);
    throw new Error('Failed to send loan approved email');
  }
};

/**
 * Send loan rejected email
 */
const sendLoanRejectedEmail = async (member, loanDetails) => {
  try {
    console.log(`📄 Sending loan rejected email to: ${member.email}`);
    
    const html = await renderTemplate('loan-rejected', {
      firstName: member.firstName,
      loanAmount: loanDetails.loanAmount || 0,
      rejectionReason: loanDetails.rejectionReason || 'Not specified',
      applicationDate: loanDetails.applicationDate?.toLocaleDateString() || new Date().toLocaleDateString(),
      rejectionDate: loanDetails.rejectionDate?.toLocaleDateString() || new Date().toLocaleDateString()
    });

    await sendEmail(member.email, 'Update on Your Loan Application', html);
    console.log(`✅ Loan rejected email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending loan rejected email:', error.message);
    throw new Error('Failed to send loan rejected email');
  }
};

/**
 * Send loan disbursed email
 */
const sendLoanDisbursedEmail = async (member, loanDetails) => {
  try {
    console.log(`💰 Sending loan disbursed email to: ${member.email}`);
    
    const html = await renderTemplate('loan-disbursed', {
      firstName: member.firstName,
      disbursedAmount: loanDetails.disbursementAmount || 0,
      disbursementDate: loanDetails.disbursementDate?.toLocaleDateString('en-NG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) || new Date().toLocaleDateString('en-NG'),
      accountNumber: member.accountNumber,
      firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-NG'),
      monthlyPayment: loanDetails.monthlyPayment || 0
    });

    const disbursedAmount = loanDetails.disbursementAmount || 0;
    const amountFormatted = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(disbursedAmount);

    await sendEmail(
      member.email, 
      `Loan Disbursed - ${amountFormatted} Credited to Your Account`, 
      html
    );
    console.log(`✅ Loan disbursed email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending loan disbursed email:', error.message);
    throw new Error('Failed to send loan disbursed email');
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Test Brevo connection
 */
const testEmailConnection = async (testEmail = 'ebukajude14@gmail.com') => {
  try {
    console.log(`🧪 Testing Brevo email connection to: ${testEmail}`);
    
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Brevo Test Successful!</h1>
          </div>
          <div class="content">
            <p>If you receive this email, Brevo is working properly with First International Financial Services.</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Sender:</strong> ${FROM_NAME} (${SENDER_EMAIL})</p>
            <hr>
            <p>This is a test email from your First International Financial Services application using Brevo API.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} First International Financial Services. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail(testEmail, 'Brevo Test - First International Financial Services', testHtml);
    
    console.log('✅ Brevo test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Brevo test email failed:', error.message);
    return false;
  }
};

/**
 * Check email service health
 */
const checkEmailServiceHealth = async () => {
  console.log('🔍 Checking email service health...');
  
  const health = {
    brevoApiKey: !!BREVO_API_KEY,
    senderEmail: SENDER_EMAIL,
    fromName: FROM_NAME,
    brevoKeyLength: BREVO_API_KEY?.length || 0,
    brevoKeyFormat: BREVO_API_KEY ? (BREVO_API_KEY.startsWith('xkeysib-') ? 'Valid' : 'Invalid') : 'Missing'
  };
  
  console.log('Health check:', JSON.stringify(health, null, 2));
  
  return health;
};

// ==================== EXPORTS ====================
module.exports = {
  // Core functions
  sendEmail,
  renderTemplate,
  
  // Member emails
  sendVerificationEmail,
  sendLoginVerificationEmail,
  sendPaymentSuccessEmail,
  sendWelcomeEmail,
  sendAccountStatusEmail,
  sendPaymentInstructionsEmail,
  
  // Loan emails
  sendLoanPaymentRequestEmail,
  sendLoanPaymentVerifiedEmail,
  sendLoanApprovedEmail,
  sendLoanRejectedEmail,
  sendLoanDisbursedEmail,
  
  // Utility functions
  testEmailConnection,
  checkEmailServiceHealth
};