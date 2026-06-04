import axios from 'axios';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Address that receives the contact-form submissions.
// Falls back to the portfolio owner's inbox if EMAIL_ADDRESS is not set.
const OWNER_EMAIL = process.env.EMAIL_ADDRESS || 'saifaalii237@gmail.com';

// Create and configure the Nodemailer transporter (Gmail SMTP).
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.GMAIL_PASSKEY,
  },
});

// Optional: also forward the message to Telegram if configured.
async function sendTelegramMessage(token, chat_id, message) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(url, { text: message, chat_id });
    return res.data.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    return false;
  }
}

// HTML email template
const generateEmailTemplate = (name, email, userMessage) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #007BFF;">New Message Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left: 4px solid #007BFF; padding-left: 10px; margin-left: 0;">
        ${userMessage}
      </blockquote>
      <p style="font-size: 12px; color: #888;">Click reply to respond to the sender.</p>
    </div>
  </div>
`;

// Send the contact email to the portfolio owner via Nodemailer.
async function sendEmail(payload, message) {
  const { name, email, message: userMessage } = payload;

  const mailOptions = {
    from: `"Portfolio Contact" <${process.env.EMAIL_ADDRESS}>`,
    to: OWNER_EMAIL,
    subject: `New Message From ${name}`,
    text: message,
    html: generateEmailTemplate(name, email, userMessage),
    replyTo: email,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error while sending email:', error.message);
    return false;
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const { name, email, message: userMessage } = payload || {};

    // Validate the submission.
    if (!name || !email || !userMessage) {
      return NextResponse.json(
        { success: false, message: 'Name, email and message are all required.' },
        { status: 400 }
      );
    }

    // Email delivery requires the Gmail credentials to be configured.
    if (!process.env.EMAIL_ADDRESS || !process.env.GMAIL_PASSKEY) {
      console.error('Email is not configured: set EMAIL_ADDRESS and GMAIL_PASSKEY.');
      return NextResponse.json(
        { success: false, message: 'Email service is not configured on the server.' },
        { status: 500 }
      );
    }

    const message = `New message from ${name}\n\nEmail: ${email}\n\nMessage:\n\n${userMessage}\n\n`;

    // Sending the email is the primary, required action.
    const emailSuccess = await sendEmail(payload, message);

    if (!emailSuccess) {
      return NextResponse.json(
        { success: false, message: 'Failed to send the email. Please try again later.' },
        { status: 500 }
      );
    }

    // Telegram is optional — only attempt it when both values are present.
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat_id = process.env.TELEGRAM_CHAT_ID;
    if (token && chat_id) {
      await sendTelegramMessage(token, chat_id, message);
    }

    return NextResponse.json(
      { success: true, message: 'Message sent successfully!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('API Error:', error.message);
    return NextResponse.json(
      { success: false, message: 'Server error occurred.' },
      { status: 500 }
    );
  }
}
