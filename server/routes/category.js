import express from "express";
import {
  addCategory,
  deleteCategory,
  formedCatgoriesAsMenu,
  getAllCategories,
  getCategory,
  updateCategory,
} from "../controllers/category.js";

const router = express.Router();

router.get("/categories", getAllCategories);

router.get("/categories/menu", formedCatgoriesAsMenu);

router.get("/category/:id", getCategory);

router.post("/category", addCategory);

router.put("/category/:id", updateCategory);

router.delete("/category/:id", deleteCategory);

export default router;
