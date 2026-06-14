import { userModel } from "../models/user.model.js";
import { sessionModel } from "../models/session.model.js";
import { redisClient } from "../config/redis.js";
import bcrypt from 'bcrypt';
import { generateOtp, getOtpHtml } from "../utils/email.utils.js";
import { sendMail } from "../services/email.service.js";
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";



export async function register(req, res) {
    try {

        const { email, password, role = 'user', accesspassword } = req.body;

        if (role === 'admin' || role === 'deliveryagent') {

            if (!accesspassword) {
                return res.status(400).json({
                    success: false,
                    message: 'accesspassword is required'
                });
            }

        }


        if (role === 'admin' && accesspassword !== process.env.ADMIN_PASS) {
            return res.status(400).json({
                success: false,
                message: 'Invalid access password for Admin'
            });
        }



        if (role === 'deliveryagent' && accesspassword !== process.env.DELIVERYAGENT_PASS) {
            return res.status(400).json({
                success: false,
                message: 'Invalid access password for Delivery Agent'
            });
        }



        const userAlreadyExists = await userModel.findOne({
            email
        });

        if (userAlreadyExists && userAlreadyExists.verified === true) {
            return res.status(409).json({
                success: false,
                message: 'User Already Exists'
            });
        };

        const redisKey = `temp_user:${email}`

        const isPending = await redisClient.get(redisKey);

        if (isPending) {
            return res.status(400).json({
                success: false,
                message: 'An OTP has already been sent to this email. Please check your inbox or wait 5 minutes.'
            })
        }

        const otp = generateOtp();

        const html = getOtpHtml(otp);

        sendMail(email, 'OTP Verification', `Your OTP Code is ${otp}`, html).catch(async (error) => {

            await redisClient.del(redisKey);
        });


        const hashedPassword = await bcrypt.hash(password, 10);


        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');


        const temporaryUserData = {
            email,
            password: hashedPassword,
            role,
            otpHash
        };

        await redisClient.set(
            `temp_user:${email}`,
            JSON.stringify(temporaryUserData),
            {
                EX: 300
            }
        );

        res.status(200).json({
            success: true,
            message: 'OTP Successfully Sent. Please check your email inbox'
        });


    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }


};


export async function verifyEmail(req, res) {
    try {

        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP and Email are required'
            });
        }




        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        const cachedData = await redisClient.get(`temp_user:${email}`);

        if (!cachedData) {
            return res.status(400).json({
                success: false,
                message: 'OTP has Expired or invalid email'
            });
        }

        const temporaryUserData = JSON.parse(cachedData);

        if (temporaryUserData.otpHash !== otpHash) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        const user = await userModel.create({
            email,
            password: temporaryUserData.password,
            role: temporaryUserData.role,
            verified: true
        });

        await redisClient.del(`temp_user:${email}`);

        res.status(201).json({
            success: true,
            message: 'User registerd successfully and verified',
            email: user.email,
            role: user.role,
            verified: user.verified
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


export async function login(req, res) {
    try {

        const { email, password } = req.body;

        const user = await userModel.findOne({
            email
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        };

        if (user.verified === false) {
            return res.status(401).json({
                success: false,
                message: 'Email not verified'
            });
        };



        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        };


        const sessionId = new mongoose.Types.ObjectId();


        const refreshToken = jwt.sign({
            userId: user._id,
            sessionId: sessionId
        }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });


        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const session = await sessionModel.create({
            _id: sessionId,
            userId: user._id,
            refreshTokenHash,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });



        const sessionData = {
            userId: session.userId,
            role: user.role,
            ip: session.ip,
            userAgent: session.userAgent
        }

        const redisKey = `userId:${user._id}:sessionId:${sessionId}`

        await redisClient.set(
            redisKey,
            JSON.stringify(sessionData),
            { EX: 604800 }
        )


        const accessToken = jwt.sign({
            userId: user._id,
            role: user.role,
            sessionId: sessionId
        }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15min' });


        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true, 
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 15 * 60 * 1000
        });


        res.status(200).json({
            success: true,
            message: 'User login successfully',
            user: {
                email: user.email,
                role: user.role
            }
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


export async function logout(req, res) {
    try {

        const refreshToken = req.cookies.refreshToken;


        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh Token not found'
            });
        };

        let decoded
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Refresh Token expire or invalid. Please login again'
            });
        };


        const redisKey = `userId:${decoded.userId}:sessionId:${decoded.sessionId}`

        const sessionRawData = await redisClient.get(redisKey);

        if (!sessionRawData) {
            return res.status(401).json({
                success: false,
                message: 'Session not found'
            });
        };

        const sessionData = JSON.parse(sessionRawData);

        if (sessionData.revoked === true || sessionData.userAgent !== req.headers['user-agent']) {
            await redisClient.del(redisKey);

            await sessionModel.findByIdAndDelete(decoded.sessionId);

            res.clearCookie('refreshToken');
            res.clearCookie('accessToken');


            return res.status(403).json({
                success: false,
                message: 'Access Denied: Session revoked or suspicious activity detected. Please login again.'
            });
        }

        res.clearCookie('refreshToken');
        res.clearCookie('accessToken');

        await redisClient.del(redisKey);

        await sessionModel.findByIdAndUpdate(decoded.sessionId, {
            revoked: true
        });


        res.status(200).json({
            success: true,
            message: 'User logout successfully'
        });



    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export async function refreshToken(req, res) {
    try {

        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh Token not found'
            });
        };

        let decoded;

        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Refresh Token expire or invalid. Please login again'
            });
        }

        const redisKey = `userId:${decoded.userId}:sessionId:${decoded.sessionId}`;

        const sessionRawData = await redisClient.get(redisKey);

        if (!sessionRawData) {
            return res.status(401).json({
                success: false,
                message: 'session not found'
            });
        };

        const sessionData = JSON.parse(sessionRawData);

        if (sessionData.revoked === true || sessionData.userAgent !== req.headers['user-agent']) {
            await redisClient.del(redisKey);
            await sessionModel.findByIdAndDelete(decoded.sessionId);


            res.clearCookie('refreshToken');
            res.clearCookie('accessToken');

            return res.status(403).json({
                success: false,
                message: 'Access Denied: Session revoked or suspicious activity detected. Please login again'
            });
        }


        const newRefreshToken = jwt.sign({
            userId: decoded.userId,
            sessionId: decoded.sessionId
        }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: '7d'
        });



        const accessToken = jwt.sign({
            userId: decoded.userId,
            sessionId: decoded.sessionId,
            role: sessionData.role
        }, process.env.JWT_ACCESS_SECRET, {
            expiresIn: '15min'
        });


        const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');


        await sessionModel.findByIdAndUpdate(
            decoded.sessionId,
            {
                refreshTokenHash: newRefreshTokenHash,
                createdAt: new Date()
            }
        );





        await redisClient.set(
            redisKey,
            JSON.stringify(sessionData),
            { EX: 604800 }
        );



        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,  
        });

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 15 * 60 * 1000
        });


       res.status(200).json({
            success: true,
            message: 'access token generated successfully',
            user: {
                role: sessionData.role 
            }
        });



    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

