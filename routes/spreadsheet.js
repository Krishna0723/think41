const express = require("express");
const router = express.Router();
const controller = require("../controllers/spreadsheetController");

// Set or update cell value
router.post("/:spreadsheetId/cells/:cellId/value", controller.setCellValue);

// Set or update cell formula
router.post("/:spreadsheetId/cells/:cellId/formula", controller.setCellFormula);

// Get cell state
router.get("/:spreadsheetId/cells/:cellId", controller.getCell);

// Get cell precedents (dependencies)
router.get(
  "/:spreadsheetId/cells/:cellId/precedents",
  controller.getCellPrecedents
);

// Get recalculation order (topological sort)
router.get(
  "/:spreadsheetId/recalculate-order",
  controller.getRecalculationOrder
);

module.exports = router;
