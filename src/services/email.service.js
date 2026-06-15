import { Resend } from 'resend';

// API Key ko environment variable se lena
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async (to, subject, text, html) => {
    try {
        const response = await resend.emails.send({
            from: 'onboarding@resend.dev', 
            to: [to],
            subject: subject,
            text: text,
            html: html
        });

        console.log('Email sent successfully:', response?.id);
        return response;
    } catch (error) {
        console.error('Resend API Error:', error);
        throw error; 
    }
}