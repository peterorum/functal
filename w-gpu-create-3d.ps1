$path = "c:\process\"
$filter = "*.jpg"
$count = 0

$startTime = (get-date)

$cwd = Split-Path $script:MyInvocation.MyCommand.Path

Write-Host "Loading files....";

$files = @(get-childitem -recurse -path $path -filter $filter)

foreach ($file in $files) {
    $count ++;
    $f = [io.path]::GetFileNameWithoutExtension($file);

    get-date -format r

    Write-Host $count": Making 3d from "$f;

    node 3d-image.js $path$f".jpg";

    # saves as 768x1029
    write-host "Saving png"

    node screenshot $path$f;

    if (test-path $path$f".png")  {

      # crop bottom off to 768x1024 & convert to jpg
      write-host "Cropping to jpg"

      convert $path$f".png" -gravity south -chop 0x5 $path$f"-3d.jpg"

      write-host "Moving to s3"

      aws s3 cp $path$f"-3d.jpg" s3://functal-images --acl="public-read"

    } else {

      write-host "==================== fail"

    }

    write-host "Deleting"

    remove-item $path$f".jpg"
    remove-item $path$f".html"
    remove-item $path$f".png"
    remove-item $path$f"-3d.jpg"

    $currentTime = (get-date)
    $runningTime = ($currentTime-$startTime).totalminutes

    write-host "Minutes running " [math]::Round($runningTime, 2)
    write-host "Seconds per image " [math]::Round($runningTime / $count * 60)

    if ($runningTime -gt 55) {
      break;
    }
}

Write-Host "$count files were processed"

shutdown /s
