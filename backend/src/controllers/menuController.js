const {
  createMenu,
  getAllMenus,
  updateMenu,
  deleteMenu
} = require('../services/menuService');

async function createMenuHandler(req, res, next) {
  try {
    const menu = await createMenu(req.body);
    res.status(201).json({ data: menu });
  } catch (err) {
    next(err);
  }
}

async function getAllMenusHandler(req, res, next) {
  try {
    const menus = await getAllMenus();
    res.json({ data: menus });
  } catch (err) {
    next(err);
  }
}

async function updateMenuHandler(req, res, next) {
  try {
    const { id } = req.params;
    const menu = await updateMenu(id, req.body);
    res.json({ data: menu });
  } catch (err) {
    next(err);
  }
}

async function deleteMenuHandler(req, res, next) {
  try {
    const { id } = req.params;
    const menu = await deleteMenu(id);
    res.json({ data: menu, message: 'Menu deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createMenuHandler,
  getAllMenusHandler,
  updateMenuHandler,
  deleteMenuHandler
};
