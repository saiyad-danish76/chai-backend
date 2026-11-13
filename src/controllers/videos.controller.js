import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "title and description are required");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "video file and thumbnail are required");
  }

  const videoFile = await uploadToCloudinary(videoLocalPath);
  const thumbnail = await uploadToCloudinary(thumbnailLocalPath);

  if (!videoFile?.url || !thumbnail?.url) {
    throw new ApiError(500, "Failed to upload video or thumbnail");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

export { publishAVideo };