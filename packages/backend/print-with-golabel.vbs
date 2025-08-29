' GoLabel Automation Script
' This opens GoLabel and sends an EZPX file for printing

Set WshShell = CreateObject("WScript.Shell")
Set objArgs = WScript.Arguments

If objArgs.Count = 0 Then
    WScript.Echo "Usage: cscript print-with-golabel.vbs <ezpx-file-path>"
    WScript.Quit 1
End If

ezpxFile = objArgs(0)

' Start GoLabel with the file
WshShell.Run """C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"" """ & ezpxFile & """", 1, False

' Wait for GoLabel to open
WScript.Sleep 3000

' Send Ctrl+P to print
WshShell.SendKeys "^p"
WScript.Sleep 1000

' Send Enter to confirm
WshShell.SendKeys "{ENTER}"
WScript.Sleep 2000

' Optional: Close GoLabel after printing
' WshShell.SendKeys "%{F4}"

WScript.Echo "Print command sent"
