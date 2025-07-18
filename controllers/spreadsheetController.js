const Spreadsheet = require("../models/Spreadsheet");
const Cell = require("../models/Cell");
const CellDependency = require("../models/CellDependency");

// Utility to extract cell references from formula string (e.g., =A1+B2)
function extractDependencies(formulaString) {
  if (!formulaString) return [];
  // Match cell references like A1, B2, etc.
  const matches = formulaString.match(/[A-Z]+\d+/g);
  return matches ? Array.from(new Set(matches)) : [];
}

exports.setCellValue = async (req, res) => {
  const { spreadsheetId, cellId } = req.params;
  const { value } = req.body;
  try {
    let cell = await Cell.findOne({ spreadsheetId, cellId });
    if (!cell) {
      cell = new Cell({ spreadsheetId, cellId });
    }
    cell.value = value;
    cell.formulaString = null;
    await cell.save();
    // Remove dependencies if any
    await CellDependency.deleteMany({ spreadsheetId, cellId });
    res.json({ cell_id: cellId, value, status: "value_set" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setCellFormula = async (req, res) => {
  const { spreadsheetId, cellId } = req.params;
  const { formula_string } = req.body;
  try {
    let cell = await Cell.findOne({ spreadsheetId, cellId });
    if (!cell) {
      cell = new Cell({ spreadsheetId, cellId });
    }
    cell.formulaString = formula_string;
    cell.value = null; // Mark for recalculation
    await cell.save();
    // Parse dependencies
    const dependencies = extractDependencies(formula_string);
    // Remove old dependencies
    await CellDependency.deleteMany({ spreadsheetId, cellId });
    // Add new dependencies
    await CellDependency.insertMany(
      dependencies.map((dep) => ({ spreadsheetId, cellId, dependsOn: dep }))
    );
    res.json({
      cell_id: cellId,
      formula_string,
      status: "formula_set",
      dependencies_identified: dependencies,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCell = async (req, res) => {
  const { spreadsheetId, cellId } = req.params;
  try {
    const cell = await Cell.findOne({ spreadsheetId, cellId });
    if (!cell) {
      return res.status(404).json({ error: "Cell not found" });
    }
    res.json({
      cell_id: cellId,
      value: cell.value,
      formula_string: cell.formulaString,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCellPrecedents = async (req, res) => {
  const { spreadsheetId, cellId } = req.params;
  try {
    const precedents = await CellDependency.find({ spreadsheetId, cellId });
    res.json(precedents.map((dep) => dep.dependsOn));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRecalculationOrder = async (req, res) => {
  const { spreadsheetId } = req.params;
  const { changed_cell_id } = req.query;
  if (!changed_cell_id) {
    return res
      .status(400)
      .json({ error: "changed_cell_id query parameter is required" });
  }
  try {
    // Build dependency graph: cellId -> [dependents]
    const allDeps = await CellDependency.find({ spreadsheetId });
    const graph = {};
    const reverseGraph = {};
    allDeps.forEach((dep) => {
      if (!graph[dep.dependsOn]) graph[dep.dependsOn] = [];
      graph[dep.dependsOn].push(dep.cellId);
      if (!reverseGraph[dep.cellId]) reverseGraph[dep.cellId] = [];
      reverseGraph[dep.cellId].push(dep.dependsOn);
    });
    // DFS for topological sort and cycle detection
    const order = [];
    const visited = {};
    const visiting = {};
    const cycle = [];
    function dfs(cellId) {
      if (visiting[cellId]) {
        cycle.push(cellId);
        return false; // cycle detected
      }
      if (visited[cellId]) return true;
      visiting[cellId] = true;
      const dependents = graph[cellId] || [];
      for (const dep of dependents) {
        if (!dfs(dep)) {
          cycle.push(cellId);
          return false;
        }
      }
      visiting[cellId] = false;
      visited[cellId] = true;
      order.push(cellId);
      return true;
    }
    // Start DFS from changed_cell_id
    const stack = [changed_cell_id];
    const allReachable = new Set();
    while (stack.length) {
      const curr = stack.pop();
      if (!allReachable.has(curr)) {
        allReachable.add(curr);
        (graph[curr] || []).forEach((dep) => stack.push(dep));
      }
    }
    // Topo sort only reachable cells
    let ok = true;
    for (const cell of allReachable) {
      if (!visited[cell]) {
        if (!dfs(cell)) {
          // Cycle detected
          const cycleCells = [...new Set(cycle.reverse())];
          return res
            .status(400)
            .json({
              error: "cycle_detected_involving_cells",
              cells: cycleCells,
            });
        }
      }
    }
    // Only include cells that have a formula (need recalculation) or are the changed cell
    const cellsToRecalc = await Cell.find({
      spreadsheetId,
      cellId: { $in: order },
    });
    const cellSet = new Set(
      cellsToRecalc.filter((c) => c.formulaString).map((c) => c.cellId)
    );
    cellSet.add(changed_cell_id);
    const filteredOrder = order.filter((cellId) => cellSet.has(cellId));
    res.json({ order: filteredOrder.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
