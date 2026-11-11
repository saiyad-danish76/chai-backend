import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


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
    await User.findByIdAndUpdate(req.user._id,{$unset : {refreshToken :1}},{new : true})
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

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies?.refreshAccessToken || req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(400,"refresh token is required")
  }
  try{
  const decodedToken =jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

  const user = await User.findById(decodedToken?._id)
  if(!user ){
    throw new ApiError(404,"user does not exist"

    )
  }
  if(user.refreshToken !== incomingRefreshToken){
    throw new ApiError(401,"refresh token is not valid")
  }
  const options ={
    httpOnly : true,
    secure : true
  }

    const {accessToken,refreshToken} = await genrateAccessAndRefreshToken(user._id)

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,refreshToken
        
        },
        "access token refreshed successfully"
      )
    )}
    catch(error){
  throw new ApiError(401,"refresh token is not valid")
   }
  })



  const changeUserPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword,confirmPassword} = req.body
     const user = await User.findById(req.user?._id)
     const isPasswordValid = await user.isPasswordCorrect(oldPassword)
     if(!isPasswordValid){
      throw new ApiError(401,"old password is not correct")
     }
     if(newPassword !== confirmPassword){
      throw new ApiError(400,"passwords do not match")
     }
     user.password = newPassword
     await user.save()
     return res.status(200).json(new ApiResponse(200,{},"password changed successfully"))

  })


  const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,{user : req.user},"current user fetched successfully"))
  })


  const updateUserProfile = asyncHandler(async(req,res)=>{
    const {fullName,username,email,bio} = req.body
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { fullName, email } },
      { new: true }
    ).select("-password")
    if(!user){
      throw new ApiError(404,"user does not exist")
    }
    res.status(200).json(new ApiResponse(200,{user},"user profile updated successfully"))

  })


  const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath){
      throw new ApiError(400,"Avataar is required")
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);

    if (!avatar?.url) {
      throw new ApiError(500, "Failed to upload avatar to cloudinary");
    }

    await User.findByIdAndUpdate(req.user._id, { avatar: avatar.url }, { new: true });

    return res.status(200).json(new ApiResponse(200, { avatar: avatar.url }, "Avatar updated successfully"));
  }

  )
    const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath){
      throw new ApiError(400,"Cover image is required")
    }

    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if (!coverImage?.url) {
      throw new ApiError(500, "Failed to upload cover image to cloudinary");
    }

    await User.findByIdAndUpdate(req.user._id, { coverImage: coverImage.url }, { new: true });

    return res.status(200).json(new ApiResponse(200, { coverImage: coverImage.url }, "Cover image updated successfully"));
  })
const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is required");
  }
 const channel = await User.aggregate([
  {
    $match: { username: username.toLowerCase() },
  },
  {
    $lookup: {
      from: "subscriptions",
      localField: "_id",
      foreignField: "channel",
      as: "subscribers",
    },
  },
  {
    $lookup: {
      from: "subscriptions",
      localField: "_id",
      foreignField: "subscriber",
      as: "subscribedTo",
    },
  },
  {
    $addFields: {
      subscribersCount: { $size: "$subscribers" },
      channelsSubscribedToCount: { $size: "$subscribedTo" },
      isSubscribed: {
        $cond: {
          if: { $in: [req.user?._id, "$subscribers.subscriber"] },
          then: true,
          else: false,
        },
      },
    },
  },
  {
    $project: {
      fullName: 1,
      username: 1,
      avatar: 1,
      coverImage: 1,
      email: 1,
      subscribersCount: 1,
      channelsSubscribedToCount: 1,
      isSubscribed: 1,
    },
  },
]);
  
   
  

      if(!channel?.length){
        throw new ApiError(404,"channel does not exist")
      }

      return res.status(200).json(new ApiResponse(200,{channel : channel[0]},"channel fetched successfully"))
  })

  const getUserWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
      {
        $match : {_id : new mongoose.Types.ObjectId(req.user?._id)}
      },
      {
        $lookup : {
          from : "videos",
          localField : "watchHistory",
          foreignField : "owner",
          as : "watchHistory",
          pipeline : [
            { $lookup : {
              from : "users",
              localField : "owner",
              foreignField : "_id",
              as : "owner",
              pipeline : [{
                $project : {
                  fullName : 1,
                  username : 1,
                  avatar : 1
                }
              }]
            }},
            {$addFields : {
              owner : {$first : "$owner"}
            }},
          ]
        }
      }
    ])

    if(!user?.length){
      throw new ApiError(404,"User not found")
    }

    return res.status(200).json(new ApiResponse(200,{watchHistory : user[0].watchHistory},"Watch history fetched successfully"))
  })





export { registerUser ,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeUserPassword,
  getCurrentUser,
  updateUserProfile,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,


};