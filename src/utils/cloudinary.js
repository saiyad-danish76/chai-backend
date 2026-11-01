import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';



    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
    });


    const uploadToCloudinary = async (localFilePath) => {
        try {
            if (!fs.existsSync(localFilePath)) {
                throw new Error('File not found');
            }
            const response = await cloudinary.uploader.upload(localFilePath, { 
                resource_type: 'auto', // This will automatically detect the file type (image, video, etc.)
             })
             //file has been uploaded succsesfully to cloudinary
             
            return response.secure_url; // Return the secure URL of the uploaded file
        } catch (error) {
            fs.unlinkSync(localFilePath);//delete the ;local file after upload 
            
            return null
        }
    }


    export { uploadToCloudinary };