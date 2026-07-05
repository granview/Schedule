// Client-side export function using ExcelJS
// Client-side export function using ExcelJS
export async function generateScheduleClient(payload, templatePath) {
    try {
        // Load template
        const response = await fetch(templatePath);
        const buffer = await response.arrayBuffer();
        
        const ExcelJS = window.ExcelJS;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);

        // 1. Parse period info
        const [year, month, half] = String(payload.period).split('-');
        const startDay = half === 'A' ? 1 : 16;
        const endDay = half === 'A' ? 15 : new Date(year, month, 0).getDate();
        
        const monthText = "月";
        const halfText = half === 'A' ? "前半" : "後半";
        const shiftText = "シフト";

        // 2. Fill fixed cells
        worksheet.getCell('M1').value = `${month}${monthText}${halfText}${shiftText}`;
        
        // Đã sửa thành C2 và J2 theo đúng file Excel
        worksheet.getCell('C2').value = parseInt(year);
        worksheet.getCell('J2').value = parseInt(month);

        // 3. Process dates and weekdays
        // Đã sửa lại các cột ngày bắt đầu từ H, J, L...
        const dayColumns = ["H", "J", "L", "N", "P", "R", "T", "V", "X", "Z", "AB", "AD", "AF", "AH", "AJ", "AL"];
        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

        for (let i = 0; i < dayColumns.length; i++) {
            const day = startDay + i;
            const col = dayColumns[i];
            
            if (day <= endDay) {
                const dateObj = new Date(year, month - 1, day);
                const weekday = weekdays[dateObj.getDay()];
                
                worksheet.getCell(`${col}6`).value = `${day}日`;
                worksheet.getCell(`${col}7`).value = weekday;
                
                // Giữ nguyên dòng 42, 43 theo code cũ
                worksheet.getCell(`${col}42`).value = `${day}日`;
                worksheet.getCell(`${col}43`).value = weekday;
            } else {
                worksheet.getCell(`${col}6`).value = "";
                worksheet.getCell(`${col}7`).value = "";
                worksheet.getCell(`${col}42`).value = "";
                worksheet.getCell(`${col}43`).value = "";
            }
        }

        // 4. Helper functions
        function normalizeName(name) {
            // Đề phòng trường hợp ExcelJS đọc tên dưới dạng RichText object
            if (name && typeof name === 'object' && name.richText) {
                name = name.richText.map(rt => rt.text).join('');
            }
            return String(name ?? "").replace(/\s+/g, "");
        }

        function convertShift(value) {
            const text = String(value ?? "");
            if (text === "休" || text === "OFF") return "休";
            if (text === "有休" || text === "PAID") return "有";
            return text;
        }

        // 5. Build map: normalizedName -> { [day]: shift }
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

        // 6. Process employee rows
        // Đã update các dòng chứa tên thực tế trong file Excel (bắt đầu từ 12)
        const nameRows = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 33, 35, 39, 41];
        
        for (const rowNum of nameRows) {
            // Lấy tên ở cột C thay vì cột B
            const cellName = worksheet.getCell(`C${rowNum}`).value;
            const key = normalizeName(cellName);
            const dayMap = shiftsByName.get(key);
            
            if (!dayMap) continue;

            for (let i = 0; i < dayColumns.length; i++) {
                const day = String(startDay + i);
                const value = dayMap[day] || "";
                worksheet.getCell(`${dayColumns[i]}${rowNum}`).value = value;
            }
        }

        // 7. Generate Excel file
        const newBuffer = await workbook.xlsx.writeBuffer();
        return newBuffer;

    } catch (error) {
        console.error('Export error:', error);
        throw error;
    }
}
