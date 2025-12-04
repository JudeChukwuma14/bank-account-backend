const express = require("express")
const { 
    RegisterMember, 
    LoginMember, 
    registerValidation 
} = require("../controller/userController")
const upload = require("../middleware/multer")

const router = express.Router()

// Apply multer upload and validation as middleware
router.post("/register", 
    upload.fields([
        { name: "birthCertificate", maxCount: 1 },
        { name: "passport", maxCount: 1 },
        { name: "driversLicense", maxCount: 1 },
    ]),
    registerValidation, // Apply validation checks
    RegisterMember
)

router.post("/login", LoginMember)

module.exports = router