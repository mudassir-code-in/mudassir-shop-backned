import dotenv from 'dotenv';
dotenv.config();
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { connectRedis } from './src/config/redis.js';
import { transporter } from './src/services/email.service.js';



connectDB();

connectRedis();



const port = 3000

app.listen(port, () => {
    console.log('server is running on 3000 port');
    transporter.verify((error, success) => {
        if (error) {
            console.log('Email server connecting error', error);
        } else {
            console.log('Email server ready to send message');
        }
    });
});
