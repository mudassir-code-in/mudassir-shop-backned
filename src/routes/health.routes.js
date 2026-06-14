import express from 'express';
import { testHealth } from '../controllers/health.controller.js';



export const healthRouter = express.Router();


healthRouter.get('/check-health', testHealth);



