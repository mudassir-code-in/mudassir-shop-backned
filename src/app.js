import express from "express";
import { authRouter } from './routes/auth.routes.js';
import cookieParser from 'cookie-parser';
import { productRouter } from "./routes/product.routes.js";
import { orderRouter } from "./routes/order.routes.js";
import cors from 'cors'
import { healthRouter } from "./routes/health.routes.js";



const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: 'https://mudassir-shop.vercel.app', 
    credentials: true,             
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));



app.use('/api/auth', authRouter);
app.use('/api/product', productRouter);
app.use('/api/order', orderRouter);
app.use('/api/health', healthRouter);


export default app;