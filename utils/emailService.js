const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter with better Docker compatibility
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail service directly
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: 'rhnz ljhb wvnl enlj'
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
  logger: true, // Enable logging
  debug: process.env.NODE_ENV !== 'production', // Enable debug in development
});

// Function to send order confirmation email
const sendOrderConfirmationEmail = async (orderDetails) => {
  try {
    // Debug logging
    console.log('SMTP Configuration:');
    console.log('- SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
    console.log('- SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');
    console.log('- SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.log('- SMTP_PORT:', process.env.SMTP_PORT || '587');
    const { order_id, delivery_date, items, branch_info } = orderDetails;
    
    // Calculate total amount
    const totalAmount = items.reduce((total, item) => {
      return total + (item.quantity * item.price);
    }, 0);

    // Create email content
    const itemsList = items.map(item => 
      `<tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.food_name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${item.price.toLocaleString()}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${(item.quantity * item.price).toLocaleString()}</td>
      </tr>`
    ).join('');

    const emailContent = `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">New Order Received</h1>
            </div>
            
            <div style="padding: 20px;">
              <h2 style="color: #333; margin-top: 0;">Order Details</h2>
              
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Order ID:</strong> #${order_id}</p>
                <p style="margin: 5px 0;"><strong>Delivery Date:</strong> ${new Date(delivery_date).toLocaleDateString('id-ID', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p style="margin: 5px 0;"><strong>Branch:</strong> ${branch_info.full_name}</p>
                <p style="margin: 5px 0;"><strong>Branch Address:</strong> ${branch_info.branch_address}</p>
                <p style="margin: 5px 0;"><strong>Delivery Time:</strong> ${branch_info.delivery_time}</p>
              </div>

              <h3 style="color: #333;">Ordered Items</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Item</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Qty</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Price</th>
                    <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f8f9fa; font-weight: bold;">
                    <td colspan="3" style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Amount:</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">Rp ${totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>

              <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #0066cc;"><strong>📧 This is an automated notification</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
                  A new order has been placed and is now ready for processing.
                </p>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              <p style="margin: 0;">Chateraise Online Order System</p>
              <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} All rights reserved</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: 'naufalrs9708@gmail.com',
      subject: `New Order #${order_id} - ${branch_info.full_name}`,
      html: emailContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOrderConfirmationEmail
}; 