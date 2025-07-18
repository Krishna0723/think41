const mongoose = require("mongoose");

const CellDependencySchema = new mongoose.Schema({
  spreadsheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Spreadsheet",
    required: true,
  },
  cellId: { type: String, required: true },
  dependsOn: { type: String, required: true },
});

CellDependencySchema.index(
  { spreadsheetId: 1, cellId: 1, dependsOn: 1 },
  { unique: true }
);

module.exports = mongoose.model("CellDependency", CellDependencySchema);
