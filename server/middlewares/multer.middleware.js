import multer from "multer";

const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
});
