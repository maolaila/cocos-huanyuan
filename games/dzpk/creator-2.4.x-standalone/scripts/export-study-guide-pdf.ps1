param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$project = [System.IO.Path]::GetFullPath($ProjectRoot)
$allowedRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
if (-not $project.StartsWith($allowedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "ProjectRoot must remain under $allowedRoot"
}

$docxPath = Join-Path $project 'docs\dzpk-phase-a-original-cocos-study-guide.docx'
$pdfPath = Join-Path $project 'docs\dzpk-phase-a-original-cocos-study-guide.pdf'
if (-not (Test-Path -LiteralPath $docxPath)) {
  throw "Study guide DOCX is missing: $docxPath"
}

$wordApplication = $null
$wordDocument = $null
try {
  $wordApplication = New-Object -ComObject Word.Application
  $wordApplication.Visible = $false
  $wordApplication.DisplayAlerts = 0
  # Open read-only and never save through Word.  python-docx deliberately
  # emits isolated numbering definitions; Word's normalizing save pass can
  # merge those independent lists even though the OOXML is valid.
  $wordDocument = $wordApplication.Documents.Open($docxPath, $false, $true)
  foreach ($section in $wordDocument.Sections) {
    foreach ($header in $section.Headers) {
      $header.Range.Fields.Update() | Out-Null
    }
    foreach ($footer in $section.Footers) {
      $footer.Range.Fields.Update() | Out-Null
    }
  }
  $wordDocument.ExportAsFixedFormat($pdfPath, 17)
} finally {
  if ($wordDocument) {
    $wordDocument.Close($false)
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordDocument) | Out-Null
  }
  if ($wordApplication) {
    $wordApplication.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordApplication) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

$docxInfo = Get-Item -LiteralPath $docxPath
$pdfInfo = Get-Item -LiteralPath $pdfPath
[PSCustomObject]@{
  verdict = 'WordPdfExportPassed'
  docxBytes = $docxInfo.Length
  pdfBytes = $pdfInfo.Length
  pdfPath = $pdfInfo.FullName
} | ConvertTo-Json
