; SoundLounge Inno Setup Script
; Produces: releases\SoundLounge-Setup.exe
; Requirements: Inno Setup 6+ (https://jrsoftware.org/isdl.php)
;
; The resulting installer is 100% self-contained:
;   - Python runtime (bundled by PyInstaller)
;   - All Python packages: FastAPI, yt-dlp, uvicorn, mutagen, SQLModel, etc.
;   - React frontend (pre-built static files, served by FastAPI)
;   - FFmpeg + FFprobe (bundled in ffmpeg\ subfolder)
;
; Users need NOTHING pre-installed. Just run SoundLounge-Setup.exe.

#define AppName      "Sound Lounge"
#define AppVersion   "1.2"
#define AppPublisher "Sound Lounge"
#define AppURL       "https://github.com/sidtharthj/soundlounge"
#define AppExeName   "SoundLounge.exe"
#define SourceDir    "dist\SoundLounge"

[Setup]
; ── Identity ──────────────────────────────────────────────────────────────────
AppId={{A7B3C2D4-E5F6-4789-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}

; ── Install location ──────────────────────────────────────────────────────────
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
; Allow user to install without admin rights (uses %LOCALAPPDATA% instead)
PrivilegesRequiredOverridesAllowed=dialog

; ── Output ────────────────────────────────────────────────────────────────────
OutputDir=releases
OutputBaseFilename=SoundLounge-Setup
SetupIconFile=
; Remove above line if you add dist_tools\icon.ico later:
; SetupIconFile=dist_tools\icon.ico

; ── Compression (LZMA2 solid = smallest possible installer) ───────────────────
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes

; ── Appearance ────────────────────────────────────────────────────────────────
WizardStyle=modern
WizardResizable=no
DisableWelcomePage=no
DisableDirPage=no
DisableReadyPage=no
DisableProgramGroupPage=yes

; ── Uninstaller ───────────────────────────────────────────────────────────────
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}
CreateUninstallRegKey=yes

; ── Misc ──────────────────────────────────────────────────────────────────────
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
; Bundle the ENTIRE PyInstaller output folder (includes Python runtime, all packages,
; yt-dlp, FastAPI, uvicorn, mutagen, frontend static files, and FFmpeg binaries).
; Nothing else is needed — this is a completely self-contained application.
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu
Name: "{group}\{#AppName}";        Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
; Desktop (optional, user must tick the checkbox)
Name: "{autodesktop}\{#AppName}";  Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
; Offer to launch the app immediately after installation finishes
Filename: "{app}\{#AppExeName}"; \
    Description: "Launch {#AppName} now"; \
    Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Clean up the user-data folder (downloads, thumbnails, database) on uninstall
; NOTE: this asks the user via the "Also delete user data?" prompt below.
; Comment out if you want to preserve user data across uninstall/reinstall.
Type: filesandordirs; Name: "{localappdata}\SoundLounge"

[Code]
// ── Optional: ask user whether to delete their music data on uninstall ────────
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
  Msg: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DataDir := ExpandConstant('{localappdata}\SoundLounge');
    if DirExists(DataDir) then
    begin
      Msg := 'Sound Lounge has found your music library data at:' + #13#10 +
             DataDir + #13#10#13#10 +
             'Do you want to DELETE this folder and all downloaded music?' + #13#10 +
             '(Select No to keep your music library intact)';
      if MsgBox(Msg, mbConfirmation, MB_YESNO) = IDYES then
        DelTree(DataDir, True, True, True);
    end;
  end;
end;
