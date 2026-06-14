import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000, 
    greetingTimeout: 10000,   
    socketTimeout: 30000
});

transporter.verify((error, success) => {
    if (error) {
        console.log('email connecting error', error);
    } else {
        console.log('Email server ready to send message');
    }
});

export const sendMail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Mudassir Developer" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });

        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.log('Email sending error', error);
        throw error;
    }
}