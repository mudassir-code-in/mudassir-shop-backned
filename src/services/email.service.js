import nodemailer from 'nodemailer';



export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


export const sendMail = async (to, subject, text, html) => {
    try{
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