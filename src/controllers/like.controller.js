import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const existing = await Like.findOne({ video: videoId, likedBy: req.user._id });

  if (existing) {
    await existing.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Like removed"));
  }

  await Like.create({ video: videoId, likedBy: req.user._id });

  return res
    .status(201)
    .json(new ApiResponse(201, { liked: true }, "Video liked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likes = await Like.find({
    likedBy: req.user._id,
    video: { $exists: true, $ne: null },
  }).populate({
    path: "video",
    populate: { path: "owner", select: "fullName username avatar" },
  });

  const videos = likes.map((like) => like.video).filter(Boolean);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Liked videos fetched successfully"));
});

export { toggleVideoLike, getLikedVideos };