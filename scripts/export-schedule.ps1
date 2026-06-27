param(
    [Parameter(Mandatory = $true)]
    [string]$InputJson,

    [Parameter(Mandatory = $true)]
    [string]$TemplatePath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Web

$payload = Get-Content -LiteralPath $InputJson -Raw -Encoding UTF8 | ConvertFrom-Json

Copy-Item -LiteralPath $TemplatePath -Destination $OutputPath -Force

$zip = [System.IO.Compression.ZipFile]::Open($OutputPath, [System.IO.Compression.ZipArchiveMode]::Update)

function Read-ZipEntryText($zipFile, $entryName) {
    $entry = $zipFile.GetEntry($entryName)
    $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8)
    try {
        return $reader.ReadToEnd()
    } finally {
        $reader.Dispose()
    }
}

function Write-ZipEntryText($zipFile, $entryName, $text) {
    $entry = $zipFile.GetEntry($entryName)
    $entry.Delete()
    $newEntry = $zipFile.CreateEntry($entryName)
    $writer = [System.IO.StreamWriter]::new($newEntry.Open(), [System.Text.UTF8Encoding]::new($false))
    try {
        $writer.Write($text)
    } finally {
        $writer.Dispose()
    }
}

function Get-SharedStrings($xmlText) {
    [xml]$sst = $xmlText
    $ns = [System.Xml.XmlNamespaceManager]::new($sst.NameTable)
    $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

    $items = @()
    foreach ($si in $sst.SelectNodes("//x:si", $ns)) {
        $parts = @()
        foreach ($t in $si.SelectNodes(".//x:t", $ns)) {
            $parts += $t.InnerText
        }
        $items += ($parts -join "")
    }
    return $items
}

function Get-CellText($cell, $sharedStrings) {
    $value = $cell.v
    if ($null -eq $value) {
        $inlineText = $cell.is.t
        if ($null -ne $inlineText) { return $inlineText.InnerText }
        return ""
    }
    if ($cell.t -eq "s") {
        return $sharedStrings[[int]$value]
    }
    return [string]$value
}

function Set-CellText($sheet, $ns, $rowNumber, $cellRef, $text) {
    $row = $sheet.SelectSingleNode("//x:row[@r='$rowNumber']", $ns)
    if ($null -eq $row) { return }

    $cell = $row.SelectSingleNode("x:c[@r='$cellRef']", $ns)
    if ($null -eq $cell) { return }

    $cell.RemoveAttribute("t")
    $cell.SetAttribute("t", "inlineStr")

    foreach ($child in @($cell.ChildNodes)) {
        $cell.RemoveChild($child) | Out-Null
    }

    $is = $sheet.CreateElement("is", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $t = $sheet.CreateElement("t", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $t.SetAttribute("xml:space", "preserve")
    $t.InnerText = [string]$text
    $is.AppendChild($t) | Out-Null
    $cell.AppendChild($is) | Out-Null
}

function Normalize-Name($name) {
    if ($null -eq $name) { return "" }
    return ([string]$name) -replace "\s+", ""
}

function Convert-Shift($value) {
    $text = [string]$value
    $holiday = [string]([char]0x4F11)
    $publicHoliday = [string]([char]0x516C)
    $paidHoliday = ([string]([char]0x6709)) + ([string]([char]0x4F11))
    $paidShort = [string]([char]0x6709)

    if ($text -eq $holiday) { return $publicHoliday }
    if ($text -eq "OFF") { return $publicHoliday }
    if ($text -eq $paidHoliday) { return $paidShort }
    if ($text -eq "PAID") { return $paidShort }
    return $text
}

$sharedStringsXml = Read-ZipEntryText $zip "xl/sharedStrings.xml"
$sharedStrings = Get-SharedStrings $sharedStringsXml
$sheetXml = Read-ZipEntryText $zip "xl/worksheets/sheet1.xml"
[xml]$sheet = $sheetXml
$ns = [System.Xml.XmlNamespaceManager]::new($sheet.NameTable)
$ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

$periodParts = ([string]$payload.period).Split("-")
$year = [int]$periodParts[0]
$month = [int]$periodParts[1]
$half = [string]$periodParts[2]
$startDay = if ($half -eq "A") { 1 } else { 16 }
$endDay = if ($half -eq "A") { 15 } else { [DateTime]::DaysInMonth($year, $month) }
$monthText = [string]([char]0x6708)
$dayText = [string]([char]0x65E5)
$shiftText = ([string]([char]0x30B7)) + ([string]([char]0x30D5)) + ([string]([char]0x30C8))
$halfText = if ($half -eq "A") {
    ([string]([char]0x524D)) + ([string]([char]0x534A))
} else {
    ([string]([char]0x5F8C)) + ([string]([char]0x534A))
}
$weekdays = @(
    [string]([char]0x65E5),
    [string]([char]0x6708),
    [string]([char]0x706B),
    [string]([char]0x6C34),
    [string]([char]0x6728),
    [string]([char]0x91D1),
    [string]([char]0x571F)
)
$dayColumns = @("G", "I", "K", "M", "O", "Q", "S", "U", "W", "Y", "AA", "AC", "AE", "AG", "AI", "AK")

Set-CellText $sheet $ns 1 "M1" ("{0}{1}{2}{3}  " -f $month, $monthText, $halfText, $shiftText)
Set-CellText $sheet $ns 2 "B2" ([string]$year)
Set-CellText $sheet $ns 2 "I2" ([string]$month)

for ($i = 0; $i -lt $dayColumns.Count; $i++) {
    $day = $startDay + $i
    $dateCellTop = "$($dayColumns[$i])6"
    $weekCellTop = "$($dayColumns[$i])7"
    $dateCellBottom = "$($dayColumns[$i])42"
    $weekCellBottom = "$($dayColumns[$i])43"

    if ($day -le $endDay) {
        $weekday = $weekdays[[int]([DateTime]::new($year, $month, $day).DayOfWeek)]
        Set-CellText $sheet $ns 6 $dateCellTop ("{0}{1}" -f $day, $dayText)
        Set-CellText $sheet $ns 7 $weekCellTop $weekday
        Set-CellText $sheet $ns 42 $dateCellBottom ("{0}{1}" -f $day, $dayText)
        Set-CellText $sheet $ns 43 $weekCellBottom $weekday
    } else {
        Set-CellText $sheet $ns 6 $dateCellTop ""
        Set-CellText $sheet $ns 7 $weekCellTop ""
        Set-CellText $sheet $ns 42 $dateCellBottom ""
        Set-CellText $sheet $ns 43 $weekCellBottom ""
    }
}

$shiftsByName = @{}
foreach ($row in $payload.rows) {
    $key = Normalize-Name $row.name
    if ($key -ne "") {
        $dayMap = @{}
        foreach ($cell in $row.days.PSObject.Properties) {
            $dayMap[$cell.Name] = Convert-Shift $cell.Value
        }
        $shiftsByName[$key] = $dayMap
    }
}

$nameRows = @(16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 37, 39)
foreach ($rowNumber in $nameRows) {
    $nameCell = $sheet.SelectSingleNode("//x:c[@r='B$rowNumber']", $ns)
    if ($null -eq $nameCell) { continue }

    $templateName = Get-CellText $nameCell $sharedStrings
    $key = Normalize-Name $templateName
    $dayMap = $shiftsByName[$key]

    for ($i = 0; $i -lt $dayColumns.Count; $i++) {
        $day = $startDay + $i
        $targetCell = "$($dayColumns[$i])$rowNumber"
        $value = ""
        if ($null -ne $dayMap -and $dayMap.ContainsKey([string]$day)) {
            $value = $dayMap[[string]$day]
        }
        Set-CellText $sheet $ns $rowNumber $targetCell $value
    }
}

Write-ZipEntryText $zip "xl/worksheets/sheet1.xml" $sheet.OuterXml
$zip.Dispose()
