// import express from 'express';
// import cors from 'cors';
// import ImageKit from 'imagekit';
// import nodemailer from 'nodemailer';
// import axios from 'axios';

// const app = express();

// // Proper CORS setup for Vercel
// app.use(cors({
//   origin: '*', // Allow all origins in development - restrict this in production
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // OTP.dev API credentials (stored securely in backend)
// const OTP_API_KEY = process.env.OTP_API_KEY || "6kYl97wGW2X0IPyUsnhNgOMSE3zVTmpL";
// const OTP_API_TOKEN = process.env.OTP_API_TOKEN || "38fcuvgs4o0hl6tm9y72qza1bwnpi5xk";

// // Health check endpoint for Vercel
// app.get("/api/health", (req, res) => {
//   res.status(200).json({ status: "ok", message: "Server is running" });
// });

// // Initialize ImageKit (keeping your existing code)
// const imagekit = new ImageKit({
//   publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=",
//   privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_GVqKpddh6IL6eBWJDCWB3TBWWpg=",
//   urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/6jmupcf63/"
// });

// // Generate authentication parameters for ImageKit
// app.get("/api/auth", (req, res) => {
//   try {
//     const authenticationParameters = imagekit.getAuthenticationParameters();
//     res.json(authenticationParameters);
//   } catch (error) {
//     console.error("ImageKit auth error:", error);
//     res.status(500).json({ success: false, message: "Failed to generate authentication parameters" });
//   }
// });

// // Create a transporter for sending emails
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER || 'ysaig786@gmail.com',
//     pass: process.env.EMAIL_PASS || 'cjuu fedt fcia bbcs'
//   }
// });

// // Store OTPs temporarily (in production, use Redis or a database)
// const otpStorage = new Map();
// const smsOtpRequestIds = new Map(); // To store OTP request IDs for verification

// // Generate a random 6-digit OTP (for email OTP)
// function generateOTP() {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }

// // API endpoint to send OTP via email
// app.post('/api/send-otp', async (req, res) => {
//   // Keeping your existing email OTP implementation
//   try {
//     const { email } = req.body;
    
//     if (!email) {
//       return res.status(400).json({ success: false, message: 'Email is required' });
//     }
    
//     // Generate OTP
//     const otp = generateOTP();
    
//     // Store OTP with expiry (5 minutes)
//     otpStorage.set(email, {
//       otp,
//       expiry: Date.now() + 5 * 60 * 1000 // 5 minutes from now
//     });
    
//     console.log(`OTP for ${email}: ${otp}`); // For debugging
    
//     // Send email with OTP
//     const mailOptions = {
//       from: process.env.EMAIL_USER || 'ysaig786@gmail.com',
//       to: email,
//       subject: 'Your OTP Verification Code',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
//           <h2 style="color: #4285f4;">Verify Your Email Address</h2>
//           <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
//           <div style="background-color: #f2f2f2; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 4px; margin: 20px 0;">
//             ${otp}
//           </div>
//           <p>This OTP is valid for 5 minutes.</p>
//           <p>If you did not request this OTP, please ignore this email.</p>
//         </div>
//       `
//     };
    
//     await transporter.sendMail(mailOptions);
    
//     res.json({ success: true, message: 'OTP sent successfully' });
//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     res.status(500).json({ success: false, message: 'Failed to send OTP' });
//   }
// });

// // API endpoint to verify email OTP
// app.post('/api/verify-otp', (req, res) => {
//   // Keeping your existing email OTP verification
//   try {
//     const { email, otp } = req.body;
    
//     if (!email || !otp) {
//       return res.status(400).json({ success: false, message: 'Email and OTP are required' });
//     }
    
//     const storedData = otpStorage.get(email);
    
//     if (!storedData) {
//       return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });
//     }
    
//     if (Date.now() > storedData.expiry) {
//       otpStorage.delete(email);
//       return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
//     }
    
//     if (storedData.otp !== otp) {
//       return res.status(400).json({ success: false, message: 'Invalid OTP' });
//     }
    
//     // OTP is valid, delete it after use
//     otpStorage.delete(email);
    
//     res.json({ success: true, message: 'Email verified successfully' });
//   } catch (error) {
//     console.error('Error verifying OTP:', error);
//     res.status(500).json({ success: false, message: 'Failed to verify OTP' });
//   }
// });

// // NEW IMPLEMENTATION - API endpoint to initiate SMS OTP using OTP.dev
// app.post('/api/send-sms-otp', async (req, res) => {
//   try {
//     const { phone } = req.body;
    
//     if (!phone) {
//       return res.status(400).json({ success: false, message: 'Phone number is required' });
//     }
    
//     // Format phone number
//     const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
//     // Your application domain (replace with your actual domain)
//     const appDomain = process.env.APP_DOMAIN || "http://localhost:5173";
    
//     console.log('Sending OTP to:', formattedPhone);
    
//     try {
//       // Call OTP.dev API
//       const response = await axios({
//         method: 'post',
//         url: 'https://otp.dev/api/verify/',
//         auth: {
//           username: process.env.OTP_API_KEY,
//           password: process.env.OTP_API_TOKEN
//         },
//         data: new URLSearchParams({
//           'channel': 'sms',
//           'phone_sms': formattedPhone,
//           'success_redirect_url': `${appDomain}/verification/success`,
//           'fail_redirect_url': `${appDomain}/verification/fail`,
//           'callback_url': `${appDomain}/api/otp-callback`
//         }),
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       });
      
//       console.log('OTP.dev API response:', response.data);
      
//       // Store the OTP ID for verification later
//       if (response.data && response.data.otp_id) {
//         smsOtpRequestIds.set(formattedPhone, {
//           otp_id: response.data.otp_id,
//           otp_secret: response.data.otp_secret,
//           expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
//         });
        
//         return res.json({
//           success: true,
//           message: 'SMS OTP initiated successfully',
//           otpLink: response.data.link
//         });
//       } else {
//         throw new Error('Invalid response from OTP.dev API');
//       }
//     } catch (apiError) {
//       console.error('OTP.dev API error:', apiError);
//       console.error('Response data:', apiError.response?.data);
//       console.error('Response status:', apiError.response?.status);
      
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to initiate SMS OTP',
//         error: apiError.response?.data?.error || apiError.message
//       });
//     }
//   } catch (error) {
//     console.error('Error sending SMS OTP:', error);
//     res.status(500).json({ success: false, message: 'Failed to send SMS OTP' });
//   }
// });
// // API endpoint to manually verify SMS OTP (Alternative to webhook)
// app.post('/api/verify-sms-otp', async (req, res) => {
//   try {
//     const { phone, otp } = req.body;
    
//     if (!phone || !otp) {
//       return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
//     }
    
//     const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
//     const storedData = smsOtpRequestIds.get(formattedPhone);
    
//     if (!storedData) {
//       return res.status(400).json({ success: false, message: 'OTP request not found or expired' });
//     }
    
//     if (Date.now() > storedData.expiry) {
//       smsOtpRequestIds.delete(formattedPhone);
//       return res.status(400).json({ success: false, message: 'OTP request expired' });
//     }
    
//     // In a real implementation, you would validate with OTP.dev
//     // For demo purposes, we'll simulate validation
//     // In production, you should use the webhook to receive verification status
    
//     // Simple validation for demonstration (in real app, use the callback webhook)
//     // This is just a placeholder - the real validation happens via the OTP.dev callback
//     if (otp.length === 6 && /^\d+$/.test(otp)) {
//       // Clean up
//       smsOtpRequestIds.delete(formattedPhone);
//       return res.json({ success: true, message: 'Phone number verified successfully' });
//     } else {
//       return res.status(400).json({ success: false, message: 'Invalid OTP' });
//     }
//   } catch (error) {
//     console.error('Error verifying SMS OTP:', error);
//     res.status(500).json({ success: false, message: 'Failed to verify SMS OTP' });
//   }
// });

// // Webhook endpoint for OTP.dev callbacks
// app.post('/api/otp-callback', (req, res) => {
//   try {
//     const { otp_id, auth_status, phone_sms, metadata } = req.body;
    
//     console.log('OTP callback received:', req.body);
    
//     // Process the verification result
//     // Update your database or session based on auth_status
    
//     // Respond to OTP.dev
//     res.status(200).json({ received: true });
    
//     // You might want to emit an event or update your database here
//   } catch (error) {
//     console.error('Error processing OTP callback:', error);
//     res.status(500).json({ success: false, message: 'Failed to process OTP callback' });
//   }
// });

// // API endpoint to send inquiry replies (keeping your existing code)
// app.post('/api/send-inquiry-reply', async (req, res) => {
//   try {
//     const { email, name, originalMessage, replyMessage } = req.body;
    
//     if (!email || !replyMessage) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Email and reply message are required' 
//       });
//     }
    
//     // Create email content
//     const mailOptions = {
//       from: `"Transgression Vigilance" <${process.env.EMAIL_USER || 'ysaig786@gmail.com'}>`,
//       to: email,
//       subject: 'Response to Your Inquiry - Transgression Vigilance',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
//           <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
//             <h2 style="color: #d32f2f; margin-top: 0;">Response to Your Inquiry</h2>
//             <p>Dear ${name},</p>
//             <p>Thank you for contacting Transgression Vigilance. We've reviewed your inquiry and here's our response:</p>
//           </div>
//           <div style="background-color: #fff; border-left: 4px solid #d32f2f; padding: 15px; margin-bottom: 20px;">
//             <p style="margin-top: 0;"><strong>Our Response:</strong></p>
//             <p style="white-space: pre-line;">${replyMessage}</p>
//           </div>
//           <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
//             <p style="margin-top: 0;"><strong>Your Original Inquiry:</strong></p>
//             <p style="white-space: pre-line;">${originalMessage}</p>
//           </div>
//           <p>If you have any further questions, please don't hesitate to contact us.</p>
//           <p>Best regards,<br>The Transgression Vigilance Team</p>
          
//           <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
//             <p>This is an automated email. Please do not reply directly to this message.</p>
//           </div>
//         </div>
//       `
//     };
    
//     // Send email
//     await transporter.sendMail(mailOptions);
    
//     // Return success response
//     return res.status(200).json({
//       success: true,
//       message: 'Reply sent successfully'
//     });
//   } catch (error) {
//     console.error('Error sending inquiry reply:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to send reply email',
//       error: error.message
//     });
//   }
// });

// // For Vercel serverless functions
// if (process.env.NODE_ENV !== 'production') {
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// }

// // Export for serverless use
// export default app;


import express from 'express';
import cors from 'cors';
import ImageKit from 'imagekit';
import nodemailer from 'nodemailer';

const app = express();

// Proper CORS setup for Vercel
app.use(cors({
  origin: '*', // Allow all origins in development - restrict this in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Vercel
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_GVqKpddh6IL6eBWJDCWB3TBWWpg=",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/6jmupcf63/"
});

// Generate authentication parameters for ImageKit
app.get("/api/auth", (req, res) => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.json(authenticationParameters);
  } catch (error) {
    console.error("ImageKit auth error:", error);
    res.status(500).json({ success: false, message: "Failed to generate authentication parameters" });
  }
});

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'ysaig786@gmail.com',
    pass: process.env.EMAIL_PASS || 'cjuu fedt fcia bbcs'
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
    
    console.log(`OTP for ${email}: ${otp}`); // For debugging
    
    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USER || 'ysaig786@gmail.com',
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

// API endpoint to send inquiry replies
app.post('/api/send-inquiry-reply', async (req, res) => {
  try {
    const { email, name, originalMessage, replyMessage } = req.body;
    
    if (!email || !replyMessage) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and reply message are required' 
      });
    }
    
    // Create email content
    const mailOptions = {
      from: `"Transgression Vigilance" <${process.env.EMAIL_USER || 'ysaig786@gmail.com'}>`,
      to: email,
      subject: 'Response to Your Inquiry - Transgression Vigilance',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h2 style="color: #d32f2f; margin-top: 0;">Response to Your Inquiry</h2>
            <p>Dear ${name},</p>
            <p>Thank you for contacting Transgression Vigilance. We've reviewed your inquiry and here's our response:</p>
          </div>
          <div style="background-color: #fff; border-left: 4px solid #d32f2f; padding: 15px; margin-bottom: 20px;">
            <p style="margin-top: 0;"><strong>Our Response:</strong></p>
            <p style="white-space: pre-line;">${replyMessage}</p>
          </div>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin-top: 0;"><strong>Your Original Inquiry:</strong></p>
            <p style="white-space: pre-line;">${originalMessage}</p>
          </div>
          <p>If you have any further questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>The Transgression Vigilance Team</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Reply sent successfully'
    });
  } catch (error) {
    console.error('Error sending inquiry reply:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send reply email',
      error: error.message
    });
  }
});

// For Vercel serverless functions
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for serverless use
export default app;


// // Using ES Modules syntax instead of CommonJS
// import express from 'express';
// import cors from 'cors';
// import ImageKit from 'imagekit';
// import nodemailer from 'nodemailer';
// // import fetch from 'node-fetch'; // Add this for making API requests

// const app = express();

// // Proper CORS setup for Vercel
// app.use(cors({
//   origin: '*', // Allow all origins in development - restrict this in production
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Health check endpoint for Vercel
// app.get("/api/health", (req, res) => {
//   res.status(200).json({ status: "ok", message: "Server is running" });
// });

// // Initialize ImageKit
// const imagekit = new ImageKit({
//   publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=",
//   privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_GVqKpddh6IL6eBWJDCWB3TBWWpg=",
//   urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/6jmupcf63/"
// });

// // Generate authentication parameters for ImageKit
// app.get("/api/auth", (req, res) => {
//   try {
//     const authenticationParameters = imagekit.getAuthenticationParameters();
//     res.json(authenticationParameters);
//   } catch (error) {
//     console.error("ImageKit auth error:", error);
//     res.status(500).json({ success: false, message: "Failed to generate authentication parameters" });
//   }
// });

// // Create a transporter for sending emails
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER || 'ysaig786@gmail.com',
//     pass: process.env.EMAIL_PASS || 'cjuu fedt fcia bbcs'
//   }
// });

// // Store OTPs temporarily (in production, use Redis or a database)
// const otpStorage = new Map();

// // Generate a random 6-digit OTP
// function generateOTP() {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }

// // API endpoint to send OTP
// app.post('/api/send-otp', async (req, res) => {
//   try {
//     const { email } = req.body;
    
//     if (!email) {
//       return res.status(400).json({ success: false, message: 'Email is required' });
//     }
    
//     // Generate OTP
//     const otp = generateOTP();
    
//     // Store OTP with expiry (5 minutes)
//     otpStorage.set(email, {
//       otp,
//       expiry: Date.now() + 5 * 60 * 1000 // 5 minutes from now
//     });
    
//     console.log(`OTP for ${email}: ${otp}`); // For debugging
    
//     // Send email with OTP
//     const mailOptions = {
//       from: process.env.EMAIL_USER || 'ysaig786@gmail.com',
//       to: email,
//       subject: 'Your OTP Verification Code',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
//           <h2 style="color: #4285f4;">Verify Your Email Address</h2>
//           <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
//           <div style="background-color: #f2f2f2; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 4px; margin: 20px 0;">
//             ${otp}
//           </div>
//           <p>This OTP is valid for 5 minutes.</p>
//           <p>If you did not request this OTP, please ignore this email.</p>
//         </div>
//       `
//     };
    
//     await transporter.sendMail(mailOptions);
    
//     res.json({ success: true, message: 'OTP sent successfully' });
//   } catch (error) {
//     console.error('Error sending OTP:', error);
//     res.status(500).json({ success: false, message: 'Failed to send OTP' });
//   }
// });

// // API endpoint to verify OTP
// app.post('/api/verify-otp', (req, res) => {
//   try {
//     const { email, otp } = req.body;
    
//     if (!email || !otp) {
//       return res.status(400).json({ success: false, message: 'Email and OTP are required' });
//     }
    
//     const storedData = otpStorage.get(email);
    
//     if (!storedData) {
//       return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });
//     }
    
//     if (Date.now() > storedData.expiry) {
//       otpStorage.delete(email);
//       return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
//     }
    
//     if (storedData.otp !== otp) {
//       return res.status(400).json({ success: false, message: 'Invalid OTP' });
//     }
    
//     // OTP is valid, delete it after use
//     otpStorage.delete(email);
    
//     res.json({ success: true, message: 'Email verified successfully' });
//   } catch (error) {
//     console.error('Error verifying OTP:', error);
//     res.status(500).json({ success: false, message: 'Failed to verify OTP' });
//   }
// });

// // API endpoint to send inquiry replies
// app.post('/api/send-inquiry-reply', async (req, res) => {
//   try {
//     const { email, name, originalMessage, replyMessage } = req.body;
    
//     if (!email || !replyMessage) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Email and reply message are required' 
//       });
//     }
    
//     // Create email content
//     const mailOptions = {
//       from: `"Transgression Vigilance" <${process.env.EMAIL_USER || 'ysaig786@gmail.com'}>`,
//       to: email,
//       subject: 'Response to Your Inquiry - Transgression Vigilance',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
//           <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
//             <h2 style="color: #d32f2f; margin-top: 0;">Response to Your Inquiry</h2>
//             <p>Dear ${name},</p>
//             <p>Thank you for contacting Transgression Vigilance. We've reviewed your inquiry and here's our response:</p>
//           </div>
//           <div style="background-color: #fff; border-left: 4px solid #d32f2f; padding: 15px; margin-bottom: 20px;">
//             <p style="margin-top: 0;"><strong>Our Response:</strong></p>
//             <p style="white-space: pre-line;">${replyMessage}</p>
//           </div>
//           <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
//             <p style="margin-top: 0;"><strong>Your Original Inquiry:</strong></p>
//             <p style="white-space: pre-line;">${originalMessage}</p>
//           </div>
//           <p>If you have any further questions, please don't hesitate to contact us.</p>
//           <p>Best regards,<br>The Transgression Vigilance Team</p>
          
//           <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
//             <p>This is an automated email. Please do not reply directly to this message.</p>
//           </div>
//         </div>
//       `
//     };
    
//     // Send email
//     await transporter.sendMail(mailOptions);
    
//     // Return success response
//     return res.status(200).json({
//       success: true,
//       message: 'Reply sent successfully'
//     });
//   } catch (error) {
//     console.error('Error sending inquiry reply:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to send reply email',
//       error: error.message
//     });
//   }
// });

// // NEW ENDPOINTS FOR PHONE OTP VERIFICATION
// // Proxy endpoint to send phone OTP
// // Modify the phone OTP verification endpoints in the Express server

// // Inside your Express app in the server-side code
// // Replace the existing endpoint implementations with these:

// // API endpoint to send phone OTP
// app.post('/api/send-phone-otp', async (req, res) => {
//   try {
//     const { phone_number, channel } = req.body;
    
//     if (!phone_number || !channel) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Phone number and channel are required' 
//       });
//     }
    
//     // Get API credentials from environment variables instead of request body
//     const apiKey = process.env.OTP_API_KEY || "6kYl97wGW2X0IPyUsnhNgOMSE3zVTmpL";
//     const apiToken = process.env.OTP_API_TOKEN || "38fcuvgs4o0hl6tm9y72qza1bwnpi5xk";
    
//     console.log(`Sending OTP to ${phone_number} via ${channel}`);
    
//     // Forward the request to the OTP API
//     const response = await fetch("https://otp.dev/api/verify/", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${apiToken}`,
//         "x-api-key": apiKey
//       },
//       body: JSON.stringify({
//         phone_number,
//         channel
//       })
//     });
    
//     const data = await response.json();
//     console.log("OTP API Response:", data);
    
//     // Return the response from the OTP API
//     return res.status(response.status).json(data);
    
//   } catch (error) {
//     console.error('Error sending phone OTP:', error);
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Failed to send phone OTP',
//       error: error.message
//     });
//   }
// });

// // API endpoint to verify phone OTP
// app.post('/api/verify-phone-otp', async (req, res) => {
//   try {
//     const { verificationId, code } = req.body;
    
//     if (!verificationId || !code) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Verification ID and code are required' 
//       });
//     }
    
//     // Get API credentials from environment variables
//     const apiKey = process.env.OTP_API_KEY || "6kYl97wGW2X0IPyUsnhNgOMSE3zVTmpL";
//     const apiToken = process.env.OTP_API_TOKEN || "38fcuvgs4o0hl6tm9y72qza1bwnpi5xk";
    
//     console.log(`Verifying OTP code: ${code} for ID: ${verificationId}`);
    
//     // Forward the request to the OTP API
//     const response = await fetch(`https://otp.dev/api/verify/${verificationId}/check`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${apiToken}`,
//         "x-api-key": apiKey
//       },
//       body: JSON.stringify({
//         code
//       })
//     });
    
//     const data = await response.json();
//     console.log("OTP Verification API Response:", data);
    
//     // Return the response from the OTP API
//     return res.status(response.status).json(data);
    
//   } catch (error) {
//     console.error('Error verifying phone OTP:', error);
//     return res.status(500).json({ 
//       success: false, 
//       message: 'Failed to verify phone OTP',
//       error: error.message
//     });
//   }
// });

// // For Vercel serverless functions
// if (process.env.NODE_ENV !== 'production') {
//   const PORT = process.env.PORT || 5000;
//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// }

// // Export for serverless use
// export default app;

// // Using ES Modules syntax instead of CommonJS

// // // Using ES Modules syntax instead of CommonJS
// // import express from 'express';
// // import cors from 'cors';
// // import ImageKit from 'imagekit';
// // import nodemailer from 'nodemailer';

// // const app = express();

// // // Proper CORS setup for Vercel
// // app.use(cors({
// //   origin: '*', // Allow all origins in development - restrict this in production
// //   methods: ['GET', 'POST', 'PUT', 'DELETE'],
// //   allowedHeaders: ['Content-Type', 'Authorization']
// // }));

// // app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));

// // // Health check endpoint for Vercel
// // app.get("/api/health", (req, res) => {
// //   res.status(200).json({ status: "ok", message: "Server is running" });
// // });

// // // Initialize ImageKit
// // const imagekit = new ImageKit({
// //   publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=",
// //   privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_GVqKpddh6IL6eBWJDCWB3TBWWpg=",
// //   urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/6jmupcf63/"
// // });

// // // Generate authentication parameters for ImageKit
// // app.get("/api/auth", (req, res) => {
// //   try {
// //     const authenticationParameters = imagekit.getAuthenticationParameters();
// //     res.json(authenticationParameters);
// //   } catch (error) {
// //     console.error("ImageKit auth error:", error);
// //     res.status(500).json({ success: false, message: "Failed to generate authentication parameters" });
// //   }
// // });

// // // Create a transporter for sending emails
// // const transporter = nodemailer.createTransport({
// //   service: 'gmail',
// //   auth: {
// //     user: process.env.EMAIL_USER || 'ysaig786@gmail.com',
// //     pass: process.env.EMAIL_PASS || 'cjuu fedt fcia bbcs'
// //   }
// // });

// // // Store OTPs temporarily (in production, use Redis or a database)
// // const otpStorage = new Map();

// // // Generate a random 6-digit OTP
// // function generateOTP() {
// //   return Math.floor(100000 + Math.random() * 900000).toString();
// // }

// // // API endpoint to send OTP
// // app.post('/api/send-otp', async (req, res) => {
// //   try {
// //     const { email } = req.body;
    
// //     if (!email) {
// //       return res.status(400).json({ success: false, message: 'Email is required' });
// //     }
    
// //     // Generate OTP
// //     const otp = generateOTP();
    
// //     // Store OTP with expiry (5 minutes)
// //     otpStorage.set(email, {
// //       otp,
// //       expiry: Date.now() + 5 * 60 * 1000 // 5 minutes from now
// //     });
    
// //     console.log(`OTP for ${email}: ${otp}`); // For debugging
    
// //     // Send email with OTP
// //     const mailOptions = {
// //       from: process.env.EMAIL_USER || 'ysaig786@gmail.com',
// //       to: email,
// //       subject: 'Your OTP Verification Code',
// //       html: `
// //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
// //           <h2 style="color: #4285f4;">Verify Your Email Address</h2>
// //           <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
// //           <div style="background-color: #f2f2f2; padding: 10px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; border-radius: 4px; margin: 20px 0;">
// //             ${otp}
// //           </div>
// //           <p>This OTP is valid for 5 minutes.</p>
// //           <p>If you did not request this OTP, please ignore this email.</p>
// //         </div>
// //       `
// //     };
    
// //     await transporter.sendMail(mailOptions);
    
// //     res.json({ success: true, message: 'OTP sent successfully' });
// //   } catch (error) {
// //     console.error('Error sending OTP:', error);
// //     res.status(500).json({ success: false, message: 'Failed to send OTP' });
// //   }
// // });

// // // API endpoint to verify OTP
// // app.post('/api/verify-otp', (req, res) => {
// //   try {
// //     const { email, otp } = req.body;
    
// //     if (!email || !otp) {
// //       return res.status(400).json({ success: false, message: 'Email and OTP are required' });
// //     }
    
// //     const storedData = otpStorage.get(email);
    
// //     if (!storedData) {
// //       return res.status(400).json({ success: false, message: 'OTP not found or expired. Please request a new one.' });
// //     }
    
// //     if (Date.now() > storedData.expiry) {
// //       otpStorage.delete(email);
// //       return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
// //     }
    
// //     if (storedData.otp !== otp) {
// //       return res.status(400).json({ success: false, message: 'Invalid OTP' });
// //     }
    
// //     // OTP is valid, delete it after use
// //     otpStorage.delete(email);
    
// //     res.json({ success: true, message: 'Email verified successfully' });
// //   } catch (error) {
// //     console.error('Error verifying OTP:', error);
// //     res.status(500).json({ success: false, message: 'Failed to verify OTP' });
// //   }
// // });

// // // For Vercel serverless functions
// // if (process.env.NODE_ENV !== 'production') {
// //   const PORT = process.env.PORT || 5000;
// //   app.listen(PORT, () => {
// //     console.log(`Server running on port ${PORT}`);
// //   });
// // }

// // // Export for serverless use
// // export default app;
