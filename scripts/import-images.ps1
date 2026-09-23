param([Parameter(Mandatory=$true)][string]$ZipPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$project = Split-Path $PSScriptRoot -Parent
$dataPath = Join-Path $project 'src/data/pokemon.json'
$data = Get-Content -LiteralPath $dataPath -Raw -Encoding utf8 | ConvertFrom-Json
$destination = Join-Path $project 'src/assets/pokemon'
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$forms = @{ 'raichu-alola'='A'; 'ninetales-alola'='A'; 'aggron-mega'='M'; 'garchomp-mega'='M' }
$zip = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ZipPath).Path)
$manifest = @()
try {
  foreach ($p in $data) {
    if ($p.id -notmatch '^[a-z0-9-]+$') { throw 'Unsafe Pokemon id' }
    $code = '{0:D4}{1}' -f [int]$p.dex, $forms[$p.id]
    $name = "80px-Champions_${code}_Sprite.png"
    $entries = @($zip.Entries | Where-Object Name -eq $name)
    if ($entries.Count -ne 1) { throw "Expected one image: $name" }
    $inputStream = $entries[0].Open()
    $memory = [IO.MemoryStream]::new()
    try { $inputStream.CopyTo($memory); $bytes = $memory.ToArray() }
    finally { $inputStream.Dispose(); $memory.Dispose() }
    $extension = if ([Text.Encoding]::ASCII.GetString($bytes,0,4) -eq 'RIFF' -and [Text.Encoding]::ASCII.GetString($bytes,8,4) -eq 'WEBP') { 'webp' }
      elseif ([BitConverter]::ToString($bytes,0,8) -eq '89-50-4E-47-0D-0A-1A-0A') { 'png' }
      else { throw "Unsupported image: $name" }
    $filename = $p.id + '.' + $extension
    [IO.File]::WriteAllBytes((Join-Path $destination $filename), $bytes)
    $p | Add-Member -NotePropertyName image -NotePropertyValue "./assets/pokemon/$filename" -Force
    $manifest += [ordered]@{id=$p.id; originalFile=$name; file=$filename; sourcePage='https://wiki.52poke.com/wiki/宝可梦列表（Champions）'}
  }
} finally { $zip.Dispose() }
$encoding = [Text.UTF8Encoding]::new($false)
[IO.File]::WriteAllText($dataPath, ($data | ConvertTo-Json -Depth 6), $encoding)
[IO.File]::WriteAllText((Join-Path $destination 'sources.json'), ($manifest | ConvertTo-Json -Depth 4), $encoding)
Write-Output "Imported $($manifest.Count) images."
