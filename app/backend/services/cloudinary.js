import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Carica un file (base64 data URI o raw base64) e restituisce il secure URL.
// resource_type: "video" | "image" | "auto" | "raw".
export function uploadBase64(base64, { resourceType = "auto", folder = "" } = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: folder || undefined },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    ).end(Buffer.from(base64, "base64"));
  });
}

export function getCloudinaryConfig() {
  return {
    configured: isCloudinaryConfigured(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    folder: "tombolata"
  };
}

export default cloudinary;
