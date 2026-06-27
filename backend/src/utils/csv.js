function csvValue(value) {
  if (value == null) return "";
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function buildCsv(rows, columns) {
  const header = columns.map((column) => csvValue(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => csvValue(column.value ? column.value(row) : row[column.key])).join(",")
  );
  return [header, ...body].join("\r\n");
}

module.exports = {
  buildCsv,
  csvValue,
};
