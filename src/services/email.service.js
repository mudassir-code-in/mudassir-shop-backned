import nodemailer from 'nodemailer';



const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log('Email server connecting error', error);
    } else {
        console.log('Email server ready to send message');
    }
});

    export const sendMail = async (to, subject, text, html) => {
        try {
            const info = await transporter.sendMail({
                from: `Mudassir developer, ${process.env.EMAIL_USER}`,
                to,
                subject,
                text,
                html
            });

        } catch (error) {
            console.log('Email sending error', error);

            throw error;
        }
    }