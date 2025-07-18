const mongoose = require("mongoose");

const CellSchema = new mongoose.Schema({
  spreadsheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Spreadsheet",
    required: true,
  },
  cellId: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null },
  formulaString: { type: String, default: null },
});

CellSchema.index({ spreadsheetId: 1, cellId: 1 }, { unique: true });

module.exports = mongoose.model("Cell", CellSchema);
