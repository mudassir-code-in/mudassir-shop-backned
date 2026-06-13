import { productModel } from "../models/product.model.js";
import jwt from 'jsonwebtoken';
import { uploadToImageKit } from "../services/storage.service.js";
import { userModel } from "../models/user.model.js";
import { cartModel } from "../models/cart.model.js";



export async function uploadProduct(req, res) {
    try {

        const { name, price, description, category } = req.body;

        const decoded = req.user;

        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins are allowed to perform this action.'
            });
        }


        const imageData = await uploadToImageKit(req.file.buffer);


        const product = await productModel.create({
            adminId: decoded.userId,
            image: imageData.url,
            name,
            price,
            description,
            category
        });

        res.status(201).json({
            success: true,
            message: "Product added!",
            product
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
};


export async function deleteProduct(req, res) {
    try {

        const { id } = req.params;

        const decoded = req.user;

        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins are allowed to perform this action.'
            });
        }

        const deletedProduct = await productModel.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


export async function updateProduct(req, res) {
    try {

        const { productId, name, price, description, category } = req.body;


        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product id is required'
            })
        }

        const decoded = req.user;

        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins are allowed to perform this action.'
            });
        }


        const updateData = {};


        if (name) updateData.name = name;
        if (price) updateData.price = price;
        if (description) updateData.description = description;
        if (category) updateData.category = category;


        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            updateData,
            { returnDocument: 'after' }
        );

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            updatedProduct
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
};


export async function card(req, res) {

    try {

        ;

        const { productId, quantity = 1 } = req.body;


        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId is required' });
        }


        const decoded = req.user;

        let userCart = await cartModel.findOne({ userId: decoded.userId });

        if (!userCart) {
            userCart = await cartModel.create({
                userId: decoded.userId,
                products: [{ productId, quantity }]
            });

            return res.status(201).json({
                success: true,
                message: 'New card created and product add',
                userCart
            })
        }


        const isAvalable = userCart.products.find(function (item) {
            return item.productId.toString() === productId;
        });

        if (isAvalable) {

            isAvalable.quantity = isAvalable.quantity + 1;
        } else {

            userCart.products.push({ productId: productId, quantity });
        };

        await userCart.save();

        res.status(200).json({
            success: true,
            message: 'Card updated successfully',
            userCart
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
};


export async function getCartProducts(req, res) {
    try {

        const decoded = req.user;

        const userCart = await cartModel.findOne({ userId: decoded.userId }).populate('products.productId');

        if (!userCart || userCart.products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empty'
            })
        }

        res.status(200).json({
            success: true,
            message: 'Cart products fetch successfully',
            userCart
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
};

export async function removeCartProduct(req, res) {
    try {

        const { productId } = req.body;


        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId is required' });
        }

        const decoded = req.user;


        const updatedCart = await cartModel.findOneAndUpdate(
            { userId: decoded.userId },
            { $pull: { products: { productId: productId } } },
            { returnDocument: 'after' }
        ).populate('products.productId');


        if (!updatedCart || updatedCart.products.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Product removed. Cart is now empty.',
                usercart: { products: [] }
            });
        }


        return res.status(200).json({
            success: true,
            message: 'Product removed from cart successfully',
            usercart: updatedCart
        });

    } catch (error) {
        console.error("Remove cart product error:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export async function getAllProducts(req, res) {
    try {

        const allProducts = await productModel.find();


        if (!allProducts || allProducts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Products not available'
            })
        }

        res.status(200).json({
            success: true,
            message: 'All products fetched successfully',
            allProducts
        })

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

export async function searchProduct(req, res) {
    try {
     
        const { q, page = 1, limit = 10 } = req.query;

       
        if (!q || q.trim() === "") {
            return res.status(200).json({
                success: true,
                products: [],
                currentPage: Number(page),
                totalPages: 0,
                totalProducts: 0
            });
        }

    
        const searchRegex = new RegExp(q.trim(), 'i');

       
        const searchQuery = {
            $or: [
                { name: { $regex: searchRegex } },
                { description: { $regex: searchRegex } }
            ]
        };

   
        const skip = (Number(page) - 1) * Number(limit);

      
        const [products, totalProducts] = await Promise.all([
            productModel.find(searchQuery)
                .skip(skip)
                .limit(Number(limit))
                .lean(), 
            productModel.countDocuments(searchQuery)
        ]);

        const totalPages = Math.ceil(totalProducts / Number(limit));

  
        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            products,
            currentPage: Number(page),
            totalPages,
            totalProducts
        });

    } catch (error) {
        console.error("Error in searchProduct API ❌ :", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
