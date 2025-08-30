' Open EZPX file in GoLabel
' Usage: cscript open-in-golabel.vbs <ezpx-file-path>

Set WshShell = CreateObject("WScript.Shell")
Set objArgs = WScript.Arguments
Set fso = CreateObject("Scripting.FileSystemObject")

If objArgs.Count = 0 Then
    WScript.Echo "Usage: cscript open-in-golabel.vbs <ezpx-file-path>"
    WScript.Quit 1
End If

ezpxFile = objArgs(0)

' Check if file exists
If Not fso.FileExists(ezpxFile) Then
    WScript.Echo "File not found: " & ezpxFile
    WScript.Quit 1
End If

' Try different GoLabel paths
Dim golabelPaths(3)
golabelPaths(0) = "C:\Program Files (x86)\Godex\GoLabel\GoLabel.exe"
golabelPaths(1) = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
golabelPaths(2) = "C:\Program Files\Godex\GoLabel\GoLabel.exe"
golabelPaths(3) = "C:\GoLabel\GoLabel.exe"

Dim golabelPath
golabelPath = ""

For i = 0 To 3
    If fso.FileExists(golabelPaths(i)) Then
        golabelPath = golabelPaths(i)
        Exit For
    End If
Next

If golabelPath = "" Then
    WScript.Echo "GoLabel not found!"
    WScript.Quit 1
End If

WScript.Echo "Opening file in GoLabel: " & ezpxFile
WScript.Echo "GoLabel path: " & golabelPath

' Start GoLabel with the file
WshShell.Run """" & golabelPath & """ """ & ezpxFile & """", 1, False

WScript.Echo "File opened successfully"