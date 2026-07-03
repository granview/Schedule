const ExcelJS = require('exceljs');
const path = require('path');

async function generateSchedule(payload, templatePath, outputPath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    // 1. Xử lý thông tin thời gian
    const [year, month, half] = String(payload.period).split('-');
    const startDay = half === 'A' ? 1 : 16;
    const endDay = half === 'A' ? 15 : new Date(year, month, 0).getDate();
    
    const monthText = "月";
    const halfText = half === 'A' ? "前半" : "後半";
    const shiftText = "シフト";

    // 2. Điền thông tin vào các ô cố định
    worksheet.getCell('M1').value = `${month}${monthText}${halfText}${shiftText}`;
    worksheet.getCell('B2').value = parseInt(year);
    worksheet.getCell('I2').value = parseInt(month);

    // 3. Xử lý ngày và thứ
    const dayColumns = ["G", "I", "K", "M", "O", "Q", "S", "U", "W", "Y", "AA", "AC", "AE", "AG", "AI", "AK"];
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

    for (let i = 0; i < dayColumns.length; i++) {
        const day = startDay + i;
        const col = dayColumns[i];
        
        if (day <= endDay) {
            const dateObj = new Date(year, month - 1, day);
            const weekday = weekdays[dateObj.getDay()];
            
            worksheet.getCell(`${col}6`).value = `${day}日`;
            worksheet.getCell(`${col}7`).value = weekday;
            worksheet.getCell(`${col}42`).value = `${day}日`;
            worksheet.getCell(`${col}43`).value = weekday;
        } else {
            worksheet.getCell(`${col}6`).value = "";
            worksheet.getCell(`${col}7`).value = "";
            worksheet.getCell(`${col}42`).value = "";
            worksheet.getCell(`${col}43`).value = "";
        }
    }

    // 4. Xử lý dữ liệu nhân viên
    const nameRows = [16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 37, 39];

    function normalizeName(name) {
        return String(name ?? "").replace(/\s+/g, "");
    }

    function convertShift(value) {
        // Đồng bộ logic với PowerShell (Convert-Shift)
        const text = String(value ?? "");
        if (text === "休" || text === "OFF") return "公";
        if (text === "有休" || text === "PAID") return "有";
        return text;
    }

    // Build map: normalizedName -> { [day]: shift }
    const shiftsByName = new Map();
    for (const r of payload.rows || []) {
        const key = normalizeName(r.name);
        if (!key) continue;
        const dayMap = {};
        for (const [dayKey, dayValue] of Object.entries(r.days || {})) {
            dayMap[dayKey] = convertShift(dayValue);
        }
        shiftsByName.set(key, dayMap);
    }

    // Duyệt các dòng template để map tên -> rowNum
    for (const rowNum of nameRows) {
        const cellName = worksheet.getCell(`B${rowNum}`).value;
        const key = normalizeName(cellName);
        const dayMap = shiftsByName.get(key);
        if (!dayMap) continue;

        for (let i = 0; i < dayColumns.length; i++) {
            const day = String(startDay + i);
            const value = dayMap[day] || "";
            worksheet.getCell(`${dayColumns[i]}${rowNum}`).value = value;
        }
    }


    await workbook.xlsx.writeFile(outputPath);
}

module.exports = { generateSchedule };