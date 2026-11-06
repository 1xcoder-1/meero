; meero Windows installer (NSIS) — built in CI:
;   makensis /DVERSION=1.1.0 /DEXE=<abs path to meero.exe> /DICON=<abs path to meero.ico> /DOUT=<abs setup.exe> scripts\installer.nsi
; NSIS resolves relative paths against the script's own directory, so CI must
; pass absolute paths for EXE / ICON / OUT. Per-user install (no admin),
; Start Menu shortcut, PATH entry, proper uninstaller.

Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "StrFunc.nsh"

!ifndef VERSION
  !error "VERSION is not defined — pass /DVERSION=x.y.z"
!endif
!ifndef EXE
  !define EXE "meero.exe"
!endif
!ifndef ICON
  !define ICON "..\assets\meero.ico"
!endif
!ifndef OUT
  !define OUT "meero-setup.exe"
!endif

${UnStrRep} ; embed the uninstall-only variant (calls use ${UnStrRep} too)
${StrRep}    ; embed the install-context StrRep function (StrFunc usage)

!define MUI_ABORTWARNING
!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_WELCOMEPAGE_TITLE "Welcome to the meero setup"
!define MUI_WELCOMEPAGE_TEXT "This will install the meero CLI (natural language -> shell commands).$\r$\n$\r$\nAfter installation, open a NEW terminal and run:$\r$\n    meero setup"
!define MUI_FINISHPAGE_TEXT "Open a new terminal, then run:$\r$\n    meero setup"

Name "meero ${VERSION}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\meero"
InstallDirRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "InstallLocation"
RequestExecutionLevel user

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

; --- rebuild the per-user PATH with $INSTDIR exactly once (install + uninstall share it)
!macro SetUserPathInstall
  ReadRegStr $0 HKCU "Environment" "Path"
  ${StrRep} $1 $0 ";$INSTDIR" ""
  ${StrRep} $2 $1 "$INSTDIR;" ""
  ${StrRep} $3 $2 "$INSTDIR" ""
  StrCpy $4 $3 1
  ${If} $4 == ";"
    StrCpy $3 $3 "" 1
  ${EndIf}
!macroend

!macro SetUserPathUninstall
  ReadRegStr $0 HKCU "Environment" "Path"
  ${UnStrRep} $1 $0 ";$INSTDIR" ""
  ${UnStrRep} $2 $1 "$INSTDIR;" ""
  ${UnStrRep} $3 $2 "$INSTDIR" ""
  StrCpy $4 $3 1
  ${If} $4 == ";"
    StrCpy $3 $3 "" 1
  ${EndIf}
!macroend

Section "Install"
  SetOutPath "$INSTDIR"
  File "${EXE}"
  WriteUninstaller "$INSTDIR\uninstall.exe"

  CreateDirectory "$SMPROGRAMS\meero"
  CreateShortCut "$SMPROGRAMS\meero\meero.lnk" "$INSTDIR\meero.exe"
  CreateShortCut "$SMPROGRAMS\meero\Uninstall meero.lnk" "$INSTDIR\uninstall.exe"

  ; PATH (HKCU\Environment) — strip any old entries first, then append once.
  ; WriteRegExpandStr keeps the value expandable if the user had %tokens% there.
  !insertmacro SetUserPathInstall
  ${If} $3 == ""
    WriteRegExpandStr HKCU "Environment" "Path" "$INSTDIR"
  ${Else}
    WriteRegExpandStr HKCU "Environment" "Path" "$3;$INSTDIR"
  ${EndIf}
  SendMessage "${HWND_BROADCAST}" ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000

  ; App Paths: lets `meero.exe` resolve from anywhere
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\meero.exe" "" "$INSTDIR\meero.exe"

  ; Add/Remove Programs entry
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "DisplayName" "meero"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "Publisher" "1xcoder"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "URLInfoAbout" "https://github.com/1xcoder-1/meero"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "DisplayIcon" "$INSTDIR\meero.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\meero.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\meero\meero.lnk"
  Delete "$SMPROGRAMS\meero\Uninstall meero.lnk"
  RMDir "$SMPROGRAMS\meero"

  ; PATH — remove $INSTDIR occurrences; never touch the value if it never
  ; contained us (avoids re-writing/expanding an unrelated user PATH).
  !insertmacro SetUserPathUninstall
  ${If} $0 != ""
    ${If} $3 == ""
      DeleteRegValue HKCU "Environment" "Path"
    ${Else}
      WriteRegExpandStr HKCU "Environment" "Path" "$3"
    ${EndIf}
  ${EndIf}
  SendMessage "${HWND_BROADCAST}" ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\meero.exe"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\meero"
SectionEnd
