import mongoose from 'mongoose';



const productSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required:true
    },
    image: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    }
},{timestamps: true});

productSchema.index({ name: 'text', description: 'text' });


export const productModel = mongoose.model('products', productSchema);

