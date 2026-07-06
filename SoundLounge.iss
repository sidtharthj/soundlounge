[Setup]
AppName=Sound Lounge
AppVersion=1.0
DefaultDirName={pf}\Sound Lounge
DefaultGroupName=Sound Lounge
UninstallDisplayIcon={app}\SoundLounge.exe
Compression=lzma2
SolidCompression=yes
OutputDir=dist
OutputBaseFilename=SoundLounge-Setup

[Files]
Source: "dist\SoundLounge\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Sound Lounge"; Filename: "{app}\SoundLounge.exe"
Name: "{group}\Uninstall Sound Lounge"; Filename: "{uninstallexe}"
Name: "{commondesktop}\Sound Lounge"; Filename: "{app}\SoundLounge.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"
