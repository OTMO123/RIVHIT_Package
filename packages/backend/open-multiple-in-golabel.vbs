' Open multiple EZPX files in GoLabel
' Usage: cscript open-multiple-in-golabel.vbs <file1> <file2> <file3> ...

Set WshShell = CreateObject("WScript.Shell")
Set objArgs = WScript.Arguments
Set fso = CreateObject("Scripting.FileSystemObject")

If objArgs.Count = 0 Then
    WScript.Echo "Usage: cscript open-multiple-in-golabel.vbs <ezpx-files...>"
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

WScript.Echo "GoLabel found at: " & golabelPath
WScript.Echo "Opening " & objArgs.Count & " files..."

' Check if GoLabel is already running
Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
Set colProcesses = objWMIService.ExecQuery("Select * from Win32_Process Where Name = 'GoLabel.exe'")

isGoLabelRunning = False
If colProcesses.Count > 0 Then
    isGoLabelRunning = True
    WScript.Echo "GoLabel is already running"
End If

' Open first file with GoLabel
WScript.Echo "Opening: " & objArgs(0)
WshShell.Run """" & golabelPath & """ """ & objArgs(0) & """", 1, False

' Wait for GoLabel to start
If Not isGoLabelRunning Then
    WScript.Sleep 3000
End If

' Open remaining files
If objArgs.Count > 1 Then
    WScript.Sleep 2000
    
    For i = 1 To objArgs.Count - 1
        WScript.Echo "Opening: " & objArgs(i)
        
        ' Try to open file in existing GoLabel instance
        ' This might open in new windows or tabs depending on GoLabel version
        WshShell.Run """" & golabelPath & """ """ & objArgs(i) & """", 1, False
        
        ' Small delay between files
        WScript.Sleep 1500
    Next
End If

WScript.Echo "All files sent to GoLabel"