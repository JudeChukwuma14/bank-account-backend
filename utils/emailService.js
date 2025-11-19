// 

const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const path = require("path");
const ejs = require("ejs");

// Initialize the OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);

// Set the refresh token
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// Get access token
const getAccessToken = async () => {
    try {
        const { token } = await oAuth2Client.getAccessToken();
        if (!token) {
            throw new Error("No access token retrieved");
        }
        return token;
    } catch (error) {
        console.error("Error retrieving access token", error.message);
        throw new Error(error.message);
    }
};

// Create transporter
const createTransporter = async () => {
    try {
        const accessToken = await getAccessToken();
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.MAIL_HOST,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });
        return transporter;
    } catch (error) {
        console.error("Error creating transporter", error.message);
        throw new Error(error.message);
    }
};

// Render email template
const renderEmailTemplate = async (templateName, data) => {
    try {
        const templatePath = path.join(__dirname, "..", "views", "emails", `${templateName}.ejs`);
        return await ejs.renderFile(templatePath, data);
    } catch (error) {
        console.error("Error rendering email template", error.message);
        throw new Error("Failed to render email template");
    }
};

// Send verification email
const sendVerificationEmail = async (member, verificationCode) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('verification', {
            firstName: member.firstName,
            verificationCode: verificationCode,
            accountNumber: member.accountNumber,
            expiresIn: '24 hours'
        });

        const mailOptions = {
            from: `"SecureBank" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: 'Verify Your Email - SecureBank',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);

        return true;
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};

// Send login verification email (for 2FA)
const sendLoginVerificationEmail = async (member, verificationCode) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('login-verification', {
            firstName: member.firstName,
            verificationCode: verificationCode,
            expiresIn: '10 minutes',
            loginTime: new Date().toLocaleString()
        });

        const mailOptions = {
            from: `"SecureBank Security" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: 'Login Verification Code - SecureBank',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);

        return true;
    } catch (error) {
        console.error('❌ Error sending login verification email:', error);
        throw new Error('Failed to send login verification email');
    }
};

// Send payment success email
const sendPaymentSuccessEmail = async (member, paymentDetails) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('payment-success', {
            firstName: member.firstName,
            lastName: member.lastName,
            accountNumber: member.accountNumber,
            amount: member.paymentAmount,
            currency: 'NGN',
            paymentDate: member.paymentDate?.toLocaleDateString() || new Date().toLocaleDateString(),
            transactionId: member.transactionId || paymentDetails.transactionId,
            paymentReference: member.paymentReference
        });

        const mailOptions = {
            from: `"SecureBank Payments" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: 'Payment Successful - Account Activated! 🎉',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('❌ Error sending payment success email:', error);
        throw new Error('Failed to send payment success email');
    }
};

// Send welcome email (after payment success)
const sendWelcomeEmail = async (member) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('welcome', {
            firstName: member.firstName,
            lastName: member.lastName,
            accountNumber: member.accountNumber,
            routingNumber: member.routingNumber,
            accountType: member.accountType,
            openingDeposit: member.openingDeposit,
            balance: member.balance,
            activationFee: member.paymentAmount,
            activatedAt: member.activatedAt?.toLocaleDateString() || new Date().toLocaleDateString()
        });

        const mailOptions = {
            from: `"SecureBank Welcome" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: 'Welcome to SecureBank - Your Account is Now Active!',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
    }
};

// Send account status email
const sendAccountStatusEmail = async (member, status) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('account-status', {
            firstName: member.firstName,
            status: status,
            accountNumber: member.accountNumber,
            message: getStatusMessage(status)
        });

        const mailOptions = {
            from: `"SecureBank Notifications" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: `Account Status Update - ${status}`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('❌ Error sending account status email:', error);
        throw new Error('Failed to send account status email');
    }
};

// Send payment instructions email
const sendPaymentInstructionsEmail = async (member, paymentAccount) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('payment-instructions', {
            firstName: member.firstName,
            accountNumber: member.accountNumber,
            paymentReference: member.paymentReference,
            paymentAccount: paymentAccount,
            amount: paymentAccount.amount,
            currency: paymentAccount.currency
        });

        const mailOptions = {
            from: `"SecureBank Payments" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: 'Payment Instructions - Account Activation',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('❌ Error sending payment instructions email:', error);
        throw new Error('Failed to send payment instructions email');
    }
};

// Helper function for status messages
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

// Test email connection
const testEmailConnection = async () => {
    try {
        const transporter = await createTransporter();
        await transporter.verify();
        return true;
    } catch (error) {
        console.error('❌ Email server connection failed:', error);
        return false;
    }
};

const sendLoanPaymentRequestEmail = async (member, loanDetails, paymentAccounts) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('loan-payment-request', {
            firstName: member.firstName,
            loanId: loanDetails._id,
            loanAmount: loanDetails.loanAmount,
            upfrontAmount: loanDetails.upfrontPaymentRequired,
            paymentReference: loanDetails.paymentReference,
            paymentAccounts: paymentAccounts
        });

        const mailOptions = {
            from: `"SecureBank Loans" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: `Loan Application - Upfront Payment Required (₦${loanDetails.upfrontPaymentRequired.toLocaleString()})`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Loan payment request email sent to ${member.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending loan payment request email:', error);
        throw new Error('Failed to send loan payment request email');
    }
};

// Send loan payment verified email
const sendLoanPaymentVerifiedEmail = async (member, loanDetails, paymentDetails) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('loan-payment-verified', {
            firstName: member.firstName,
            loanId: loanDetails._id,
            paymentAmount: paymentDetails.paymentAmount,
            paymentReference: paymentDetails.paymentReference,
            verificationDate: new Date().toLocaleDateString('en-NG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        });

        const mailOptions = {
            from: `"SecureBank Loans" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: 'Payment Verified - Loan Under Review!',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Loan payment verified email sent to ${member.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending loan payment verified email:', error);
        throw new Error('Failed to send loan payment verified email');
    }
};

// Send loan approved email
const sendLoanApprovedEmail = async (member, loanDetails) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('loan-approved', {
            firstName: member.firstName,
            approvedAmount: loanDetails.approvedAmount,
            interestRate: loanDetails.approvedInterestRate,
            loanTerm: loanDetails.approvedTerm,
            loanPurpose: loanDetails.loanPurpose,
            monthlyPayment: loanDetails.monthlyPayment,
            totalPayment: loanDetails.totalPayment,
            approvalDate: loanDetails.approvalDate.toLocaleDateString('en-NG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-NG')
        });

        const mailOptions = {
            from: `"SecureBank Loans" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: `Congratulations! Your ₦${loanDetails.approvedAmount.toLocaleString()} Loan is Approved! 🎉`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Loan approved email sent to ${member.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending loan approved email:', error);
        throw new Error('Failed to send loan approved email');
    }
};

// Send loan rejected email
const sendLoanRejectedEmail = async (member, loanDetails) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('loan-rejected', {
            firstName: member.firstName,
            loanAmount: loanDetails.loanAmount,
            rejectionReason: loanDetails.rejectionReason,
            applicationDate: loanDetails.applicationDate.toLocaleDateString(),
            rejectionDate: loanDetails.rejectionDate.toLocaleDateString()
        });

        const mailOptions = {
            from: `"SecureBank Loans" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: 'Update on Your Loan Application',
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Loan rejected email sent to ${member.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending loan rejected email:', error);
        throw new Error('Failed to send loan rejected email');
    }
};

// Send loan disbursed email
const sendLoanDisbursedEmail = async (member, loanDetails) => {
    try {
        const transporter = await createTransporter();
        const htmlContent = await renderEmailTemplate('loan-disbursed', {
            firstName: member.firstName,
            disbursedAmount: loanDetails.disbursementAmount,
            disbursementDate: loanDetails.disbursementDate.toLocaleDateString('en-NG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            accountNumber: member.accountNumber,
            firstPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-NG'),
            monthlyPayment: loanDetails.monthlyPayment
        });

        const mailOptions = {
            from: `"SecureBank Loans" <${process.env.MAIL_HOST}>`,
            to: member.email,
            subject: `Loan Disbursed - ₦${loanDetails.disbursementAmount.toLocaleString()} Credited to Your Account`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Loan disbursed email sent to ${member.email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending loan disbursed email:', error);
        throw new Error('Failed to send loan disbursed email');
    }
};

module.exports = {
    createTransporter,
    renderEmailTemplate,
    sendVerificationEmail,
    sendLoginVerificationEmail,
    sendPaymentSuccessEmail,
    sendWelcomeEmail,
    sendAccountStatusEmail,
    sendPaymentInstructionsEmail,
    testEmailConnection,
    sendLoanPaymentRequestEmail,
    sendLoanPaymentVerifiedEmail,
    sendLoanApprovedEmail,
    sendLoanRejectedEmail,
    sendLoanDisbursedEmail
};