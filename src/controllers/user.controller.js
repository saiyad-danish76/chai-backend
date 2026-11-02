import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { useEffect } from "react";


const genrateAccessAndRefreshToken = async (userId) => {

  try {
        const user = await User.findById(userId)
         const refreshToken = user.generateRefreshToken();
         const accessToken = user.generateAccessToken();

         user.refreshToken = refreshToken;
         await user.save({ validateBeforeSave: false });

         return { accessToken, refreshToken };

  }catch (error) {
    throw new ApiError(500, "Failed to generate tokens");
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, username } = req.body;

  if (!fullName || !email || !password || !username) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(400, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath || !coverImageLocalPath) {
    throw new ApiError(400, "Avatar and Cover Image are required");
  }

  const avatar = await uploadToCloudinary(avatarLocalPath);
  const coverImage = await uploadToCloudinary(coverImageLocalPath);

  if (!avatar || !coverImage) {
    throw new ApiError(500, "Failed to upload images to cloudinary");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url,
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Failed to create user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

const loginUser = asyncHandler (async(req ,res)=>{
  const {email,username,password} =req.body 
    if(!username && !email){
      throw new ApiError(400,'username or email is required')
    }
    const user = await User.findOne({
      $or :[{username},{email}]
    })
    if(!user){
      throw new ApiError(404,"user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
      if(!isPasswordValid){
        throw new ApiError(401,"Invalid User credential")
      }

      const {accessToken,refreshToken} = await genrateAccessAndRefreshToken(user._id)

      const loggedInUser = await User.findById(user._id).select("-password -refreshToken" )
         const options ={
          httpOnly : true,
          secure : true
         }

         return res.status(200)
         .cookie("accessToken",accessToken,options)
         .cookie("refreshToken",refreshToken,options)
         .json(
          new ApiResponse(
            200,
            {
              user : loggedInUser,accessToken,refreshToken
            },
            "user logged in succsesfully"
          )
         )
})

const logoutUser = asyncHandler(async(req,res)=>{
  User.findByIdAndUpdate(req.user._id,{refreshToken :undefined},{new : true})
   const options ={
    httpOnly : true,
    secure : true
   }
   return res.status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(
    new ApiResponse(
      200,{},"user is logged out")
    )
})




export { registerUser ,
  loginUser,
  logoutUser
};