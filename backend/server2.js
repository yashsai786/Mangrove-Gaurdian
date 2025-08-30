const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const TelesignSDK = require("telesignenterprisesdk");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const customerId = process.env.CUSTOMER_ID || "BF12EAD9-D8A1-4282-9D85-A10FF6212045";
const apiKey = process.env.API_KEY || "fhDYXKuIRncX+JV7msZP/NXBl64EnhIPpi/C0D4Vxtb1SfeccGlwo2WJv6f8Hh0vI5c3CGiSBGicyiXl6UA8TQ==";

app.post("/send-otp", (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Phone number is required" });

    const verifyCode = Math.floor(Math.random() * 99999).toString();
    const params = { verify_code: verifyCode, sender_id: "undefined" };
    const client = new TelesignSDK(customerId, apiKey);

    client.verify.sms((error, responseBody) => {
        if (error) {
            return res.status(500).json({ error: "Failed to send OTP" });
        }
        res.json({ success: true, message: "OTP sent successfully!", verifyCode });
    }, phoneNumber, params);
});

// Start the server
const PORT = process.env.PORT2 || 5001;
app.listen(PORT, () => {
    console.log("Server running on port ${PORT}");
});