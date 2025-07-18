const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const spreadsheetRoutes = require("./routes/spreadsheet");

const app = express();
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/think41", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use("/spreadsheets", spreadsheetRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
