$path = "c:\process\"
$filter = "*.jpg"
$count = 0

$startTime = (get-date)

# minutes to run
$runDuration = 55;

$cwd = Split-Path $script:MyInvocation.MyCommand.Path

Write-Host "Getting file list"

$files = aws s3 ls functal-images

$list = ($files -split '[\r\n]')

# get acceptable files
$names = @()

foreach ($f in $list) {
    if ($f -notmatch "(-wgl.*|-svg|-3d).jpg") {
        $names += $f.SubString(31)
    }
}

while ($true) {

    # select random image
    $image = ($names) | get-random

    write-host "Image $image"

    #download it
    aws s3 cp s3://functal-images/$image \process

    $f = [io.path]::GetFileNameWithoutExtension($image);

    get-date -format r

    # try to get a large enough jpeg which should show some detail
    $tries = 0
    $ok = $false

    $suffix = get-date -format yyyyMMddHHmmss

    while  ( ($tries -lt 10) -and (!($ok)) ) {

      $tries++;

      Write-Host "Making 3d from $f - try $tries";

      node 3d-image.js $path$f".jpg";

      # saves as 768x1029
      write-host "Saving png"

      node screenshot $path$f;

      if (test-path $path$f".png")  {

        # crop bottom off to 768x1024 & convert to jpg
        write-host "Cropping to jpg"

        convert $path$f".png" -gravity south -chop 0x5 $path$f"-wgl-$suffix.jpg"

        if ((get-item $path$f"-"$suffix".jpg").length -gt 100kb){
          $count ++;
          $ok = $true;

          write-host "Moving to s3"

          aws s3 cp $path$f"-wgl-"$suffix".jpg" s3://functal-images --acl="public-read"

        } else {

          write-host "------------------ too small"

        }

      } else {

        write-host "==================== fail"

      }
    }

    write-host "Deleting"

    remove-item $path$f".jpg"
    remove-item $path$f".html"
    remove-item $path$f".png"
    remove-item $path$f"-wgl-"$suffix".jpg"

    $currentTime = (get-date)
    $runningTime = ($currentTime-$startTime).totalminutes

    write-host "Minutes running " ([math]::Round($runningTime, 2))
    write-host "Seconds per image " ([math]::Round($runningTime / $count * 60))
    write-host "Expected images " ([math]::Round( $count / $runningTime * $runDuration))
    write-host "-----------------------------------------------"

    if ($runningTime -gt $runDuration) {
      break;
    }
}

shutdown /s
