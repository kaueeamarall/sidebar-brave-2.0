' Inicia o iniciar_bridge.bat sem abrir janela (modo silencioso).
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = dir
sh.Run "cmd /c """"" & dir & "\iniciar_bridge.bat"" silent""", 0, False
