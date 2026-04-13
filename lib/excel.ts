import ExcelJS from "exceljs";

export type ExcelRow = Record<string, string | undefined>;

export async function generateExcel(rows: ExcelRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("数据");

  if (rows.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // 从数据动态获取字段（排除内部字段）
  const dataFields = Object.keys(rows[0]).filter(
    (k) => !k.startsWith("_") && k !== "imageBase64" && k !== "imageMediaType"
  );

  // 列定义：图片 + 动态字段
  const columns = [
    { header: "图片", key: "图片", width: 55 },
    ...dataFields.map((f) => ({ header: f, key: f, width: 18 })),
  ];
  sheet.columns = columns;

  // 表头样式
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // 数据行
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const excelRow = sheet.getRow(rowNum);
    excelRow.height = 190;

    // 嵌入图片
    if (row.imageBase64) {
      const ext = row.imageMediaType?.includes("png") ? "png" : "jpeg";
      const imageId = workbook.addImage({
        base64: row.imageBase64,
        extension: ext,
      });
      sheet.addImage(imageId, {
        tl: { col: 0, row: rowNum - 1 },
        ext: { width: 320, height: 240 },
      });
    }

    // 动态数据列（从 B 列开始）
    dataFields.forEach((field, idx) => {
      excelRow.getCell(idx + 2).value = row[field] || "";
    });

    // 样式
    const totalCols = 1 + dataFields.length;
    for (let c = 1; c <= totalCols; c++) {
      const cell = excelRow.getCell(c);
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
