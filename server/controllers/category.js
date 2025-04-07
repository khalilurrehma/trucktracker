import {
  allCategoriesReports,
  createCategory,
  getCategories,
  getCategoryById,
  modifyCatefory,
  removeCategory,
} from "../model/category.js";

export const getAllCategories = async (req, res) => {
  try {
    const category = await getCategories();
    res.json(category);
  } catch (error) {
    console.log(error);
  }
};

export const formedCatgoriesAsMenu = async (req, res) => {
  try {
    const menu = await allCategoriesReports();

    if (!menu) {
      return res.status(404).json({
        status: false,
        error: "No categories found",
      });
    }

    res.status(200).json({
      status: true,
      message: menu,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const getCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await getCategoryById(id);

    res.json(category);
  } catch (error) {
    console.log(error);
  }
};

export const addCategory = async (req, res) => {
  try {
    const body = req.body;
    const newCategory = await createCategory(body);

    res
      .status(201)
      .json({ message: "Category created", id: newCategory.insertId });
  } catch (error) {
    console.log(error);
  }
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  try {
    const updatedCategory = await modifyCatefory(id, body);

    res.json(updatedCategory);
  } catch (error) {
    console.log(error);
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const removedCategory = await removeCategory(id);
    if (removedCategory.affectedRows === 1) {
      res.json({ message: "Category deleted" });
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  } catch (error) {
    console.log(error);
  }
};
