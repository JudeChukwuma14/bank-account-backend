// middleware/auth.js - Add detailed logging
const jwt = require('jsonwebtoken');
const Member = require('../models/Member');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
  
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                message: 'No token, authorization denied' 
            });
        }

        const token = authHeader.replace('Bearer ', '');
    
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'No token, authorization denied' 
            });
        }

        // Verify token
   
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
        
        const member = await Member.findById(decoded.memberId);
        
        if (!member) {
        
            return res.status(401).json({ 
                success: false,
                message: 'Token is not valid' 
            });
        }

        // ✅ ALLOW payment routes for verified but not-yet-paid users
        const isPaymentRoute = req.originalUrl.includes('/payments/');
        
        if (isPaymentRoute) {
            // Allow access to payment if email is verified
            if (!member.isEmailVerified) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Please verify your email first' 
                });
            }
        
        } else if (member.accountStatus !== 'active') {
            return res.status(403).json({ 
                success: false,
                message: `Account is ${member.accountStatus}. Access denied.` 
            });
        }

        req.memberId = member._id;
        req.member = member;
        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error.message);
        console.error('🔍 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token format',
                error: error.message
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired' 
            });
        }
        
        res.status(401).json({ 
            success: false,
            message: 'Token is not valid' 
        });
    }
};

module.exports = auth;