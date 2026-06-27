const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

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

app.post('/api/export-schedule', (req, res) => {
    const payload = req.body;
    const safePeriod = String(payload?.period || 'schedule').replace(/[^0-9A-Za-z_-]/g, '_');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-export-'));
    const inputPath = path.join(tempDir, 'input.json');
    const outputPath = path.join(tempDir, `schedule_${safePeriod}.xlsx`);
    const templatePath = path.join(__dirname, 'schedule.xlsx');
    const scriptPath = path.join(__dirname, 'scripts', 'export-schedule.ps1');

    fs.writeFileSync(inputPath, JSON.stringify(payload), 'utf8');

    const ps = spawn('powershell', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
        '-InputJson',
        inputPath,
        '-TemplatePath',
        templatePath,
        '-OutputPath',
        outputPath
    ]);

    let errorOutput = '';
    ps.stderr.on('data', data => {
        errorOutput += data.toString();
    });

    ps.on('close', code => {
        if (code !== 0) {
            console.error(errorOutput);
            res.status(500).json({ error: 'Failed to export schedule.' });
            fs.rm(tempDir, { recursive: true, force: true }, () => {});
            return;
        }

        res.download(outputPath, `schedule_${safePeriod}.xlsx`, err => {
            if (err) console.error(err);
            fs.rm(tempDir, { recursive: true, force: true }, () => {});
        });
    });
});

app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
