const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');


const app = express();
const PORT = 5000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }

    next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/api/export-schedule', async (req, res) => {
    try {
        const payload = req.body;
        const safePeriod = String(payload?.period || 'schedule').replace(/[^0-9A-Za-z_-]/g, '_');

        const outputDir = os.tmpdir();
        const outputPath = path.join(outputDir, `schedule_${safePeriod}.xlsx`);
        const templatePath = path.join(__dirname, 'schedule.xlsx');

        const { generateSchedule } = require('./js/exportSchedule.js');


        await generateSchedule(payload, templatePath, outputPath);



        res.download(outputPath, `schedule_${safePeriod}.xlsx`, err => {
            if (err) console.error(err);
            fs.unlink(outputPath, () => {});
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi khi xuất lịch.' });
    }
});


app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
