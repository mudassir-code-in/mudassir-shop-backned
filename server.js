import dotenv from 'dotenv';
dotenv.config();
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { connectRedis } from './src/config/redis.js';




connectDB();

connectRedis();



const port = 3000

app.listen(port, () => {
    console.log('server is running on 3000 port');
    });

