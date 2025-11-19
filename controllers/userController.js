const Member = require("../models/Member")
const bcryptjs = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { check, validationResult } = require("express-validator")

// Validation rules as separate middleware arrays
const registerValidation = [
  check("firstName", "First name is required").notEmpty(),
  check("lastName", "Last name is required").notEmpty(),
  check("email", "Email is required").isEmail(),
  check("phone", "Phone number is required").notEmpty(),
  check("ssn", "SSN is required").notEmpty(),
  check("password", "Password is required").notEmpty(),
  check("address.street", "Street is required").notEmpty(),
  check("address.city", "City is required").notEmpty(),
  check("address.state", "State is required").notEmpty(),
  check("address.zip", "Zip code is required").notEmpty(),
];

const RegisterMember = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            ssn,
            password,
            address,
        } = req.body;

        let member = await Member.findOne({ $or: [{ email }, { ssn }] })
        if (member) {
            return res.status(400).json({ message: "Member already exists" })
        }
        
        // Verify all images are uploaded
        if (!req.files || !req.files.birthCertificate || !req.files.driversLicense || !req.files.passport) {
            return res.status(400).json({ message: 'All images (birth certificate, driver\'s license, passport) are required' });
        }
        
        const hashPassword = await bcryptjs.hashSync(password, 10)
        
        // Handle address parsing (it might be a string or object)
        let addressData = address;
        if (typeof address === 'string') {
            addressData = JSON.parse(address);
        }
        
        member = new Member({
            firstName,
            lastName,
            email,
            phone,
            ssn,
            password: hashPassword,
            address: addressData,
            birthCertificate: req.files.birthCertificate[0].path,
            passport: req.files.passport[0].path,
            driversLicense: req.files.driversLicense[0].path,
        })
        
        await member.save()
        const payload = {
            memberId: member._id,
        }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" })
        res.status(201).json({ 
            token, 
            member: { 
                ...member._doc, 
                password: undefined, 
                ssn: undefined 
            },
            message: "Membership created successfully!" 
        });
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}

const LoginMember = async (req, res) => {
    try {
        const { email, password } = req.body
        const member = await Member.findOne({ email })
        if (!member) {
            return res.status(400).json({ message: "Member not found" })
        }
        const isMatch = await bcryptjs.compareSync(password, member.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" })
        }
        const payload = {
            memberId: member._id,
        }
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" })
        res.status(200).json({ 
            token, 
            member: { 
                ...member._doc, 
                password: undefined, 
                ssn: undefined 
            } 
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: error.message })
    }
}

module.exports = {
    RegisterMember,
    LoginMember,
    registerValidation,
}