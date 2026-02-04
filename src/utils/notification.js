import { Vonage } from '@vonage/server-sdk'
import nodemailer from "nodemailer"
import dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

// Vonage setup
let vonage
if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
  vonage = new Vonage({
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET,
  })
  console.log('✅ Vonage client initialized for notifications')
} else {
  console.warn('⚠️ Vonage credentials not found - SMS notifications will be disabled')
}

// Nodemailer setup
let transporter
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  // Use EMAIL_PASS for App Password (more secure)
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
  console.log('✅ Nodemailer transporter initialized for email notifications')
} else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  // Fallback to EMAIL_PASSWORD if EMAIL_PASS not available
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
  console.log('✅ Nodemailer transporter initialized for email notifications (using EMAIL_PASSWORD)')
} else {
  console.warn('⚠️ Email credentials not found - Email notifications will be disabled')
}

// Send SMS
async function sendSMS(to, text) {
  try {
    if (!vonage) {
      throw new Error('Vonage client not initialized')
    }
    
    const from = process.env.VONAGE_PHONE_NUMBER || "Vonage APIs"
    const resp = await vonage.sms.send({ to, from, text })
    console.log("✅ SMS sent successfully:", resp)
    return resp
  } catch (err) {
    // Handle common Vonage errors
    if (err.response && err.response.messages) {
      const message = err.response.messages[0]
      if (message.status === '29') {
        console.error("❌ Vonage Error: Invalid credentials or insufficient credit")
      } else if (message.status === '14') {
        console.error("❌ Vonage Error: Invalid phone number format")
      } else if (message.status === '15') {
        console.error("❌ Vonage Error: Phone number not verified (trial account limitation)")
      } else {
        console.error(`❌ Vonage Error ${message.status}: ${message['error-text']}`)
      }
    } else {
      console.error("❌ Error sending SMS:", err)
    }
    throw err
  }
}

// Send Email
async function sendEmail(to, subject, text) {
  try {
    if (!transporter) {
      throw new Error('Nodemailer transporter not initialized')
    }
    
    const info = await transporter.sendMail({
      from: `"Healthcare App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    })
    console.log("✅ Email sent successfully:", info.messageId)
    return info
  } catch (err) {
    // Handle common email errors
    if (err.code === 'EAUTH') {
      console.error("❌ Email authentication failed. For Gmail, you need to use an App Password instead of your regular password.")
      console.error("See: https://support.google.com/accounts/answer/185833")
    } else if (err.code === 'EENVELOPE') {
      console.error("❌ Invalid email address format")
    } else {
      console.error("❌ Error sending Email:", err.message)
    }
    throw err
  }
}

// ✅ Send both SMS + Email
async function sendNotification({ smsTo, emailTo, subject, message }) {
  const tasks = []

  if (smsTo) {
    tasks.push(
      sendSMS(smsTo, message)
        .then(() => console.log("✅ SMS sent to", smsTo))
        .catch(err => {
          console.error("❌ Failed to send SMS to", smsTo)
          // Don't throw error to allow other notifications to proceed
          return { error: err }
        })
    )
  }

  if (emailTo) {
    tasks.push(
      sendEmail(emailTo, subject, message)
        .then(() => console.log("✅ Email sent to", emailTo))
        .catch(err => {
          console.error("❌ Failed to send Email to", emailTo)
          // Don't throw error to allow other notifications to proceed
          return { error: err }
        })
    )
  }

  // Using Promise.allSettled to ensure both notifications are attempted even if one fails
  const results = await Promise.allSettled(tasks)
  
  // Check results and count successes/failures
  let successCount = 0
  let failureCount = 0
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      // Check if the fulfilled result has an error property (our custom handling)
      if (result.value && result.value.error) {
        failureCount++
      } else {
        successCount++
      }
    } else {
      failureCount++
    }
  })
  
  console.log(`📊 Notification Results: ${successCount} succeeded, ${failureCount} failed`)
  
  return results
}

export { sendSMS, sendEmail, sendNotification }