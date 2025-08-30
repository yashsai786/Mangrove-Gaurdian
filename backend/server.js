const express = require("express");
const cors = require("cors");
const ImageKit = require("imagekit");
const app = express();
const nodemailer = require('nodemailer');

// Add body parsing middleware
app.use(cors());
app.use(express.json());  // Add this line to parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Add this line to parse URL-encoded bodies

const imagekit = new ImageKit({
  publicKey: "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=",
  privateKey: "private_GVqKpddh6IL6eBWJDCWB3TBWWpg=",
  urlEndpoint: "https://ik.imagekit.io/6jmupcf63/"
});

// Generate authentication parameters
app.get("/auth", (req, res) => {
  const authenticationParameters = imagekit.getAuthenticationParameters();
  res.json(authenticationParameters);
});

// OTP Email Configuration
// ---------------------------------------------

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ysaig786@gmail.com',
    pass: 'cjuu fedt fcia bbcs' // App-specific password
  }
});

// Store OTPs temporarily (in production, use Redis or a database)
const otpStorage = new Map();

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// API endpoint to send OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiry (5 minutes)
    otpStorage.set(email, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000 // 5 minutes from now
    });
    
    // Send email with OTP
    const mailOptions = {
      from: 'ysaig786@gmail.com',
      to: email,
      subject: 'Your OTP Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4285f4;">Verify Your Email Address</h2>
          <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
          <div style="background-color: #f2f2f2; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 4px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for 5 minutes.</p>
          <p>If you did not request this OTP, please ignore this email.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// API endpoint to verify OTP
app.post('/api/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    
    const storedData = otpStorage.get(email);
    
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });
    }
    
    if (Date.now() > storedData.expiry) {
      otpStorage.delete(email);
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    // OTP is valid, delete it after use
    otpStorage.delete(email);
    
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});