import express from 'express';
import { uploadProduct, card, deleteProduct, getCartProducts, updateProduct, removeCartProduct, getAllProducts, searchProduct } from '../controllers/product.controller.js';
import multer from 'multer';
import { verifyToken } from '../middleware/auth.middleware.js';


export const productRouter = express.Router();


const upload = multer({storage: multer.memoryStorage()});

productRouter.post('/upload-product',verifyToken, upload.single('image'), uploadProduct);

productRouter.delete('/delete/:id',verifyToken, deleteProduct);

productRouter.post('/add-cart',verifyToken, card);

productRouter.get('/get-cart',verifyToken, getCartProducts);

productRouter.post('/update-product',verifyToken, updateProduct);

productRouter.post('/remove-cart-product',verifyToken, removeCartProduct);

productRouter.get('/get-all-products', getAllProducts);

productRouter.get('/search-product', searchProduct);



