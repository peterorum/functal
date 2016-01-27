$path = "\process\"
$filter = "*.jpg"
$count = 0

$cwd = Split-Path $script:MyInvocation.MyCommand.Path

Write-Host "Loading files....";

$files = @(get-childitem -recurse -path $path -filter $filter)

foreach ($file in $files) {
    $count ++
    $f = [io.path]::GetFileNameWithoutExtension($file)
    Write-Host $f;

    node --harmony 3d-image.js $path$f.jpg;

    cd $path

    slimerjs $cwd\3d2jpg.js $f".html";

    write-host "Moving to s3"

    aws s3 cp $f"-3d.jpg" s3://functal-images --acl="public-read"

    write-host "Deleting"

    remove-item $f".jpg"
    remove-item $f".html"
    remove-item $f"-3d.jpg"

    cd $cwd
}

Write-Host "There were $count files with the pattern $filter in folder $path"

# sleep
psshutdown -d -t 0