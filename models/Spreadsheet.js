const mongoose = require("mongoose");

const SpreadsheetSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

module.exports = mongoose.model("Spreadsheet", SpreadsheetSchema);
