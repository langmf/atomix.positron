## 2.8.0 - 2025-09-01
- Added new setting of the editor ("Quick Suggestions Delay").
- Fixed that when clicking on a tree of the included files, they did not open.

## 2.7.0 - 2025-04-05
- Updated database file "main.json"

## 2.5.1 - 2024-07-07
- Minor updates.

## 2.5.0 - 2024-06-16
- Minor updates and fixes.

## 2.4.9 - 2024-05-28
- Fixed processing of command file calls on Linux systems.

## 2.4.7 - 2024-05-26
- Added processing of command line arguments during compilation.
- Added calling the "compiler.cmd"   file instead of the compiler   if it is found in the source folder.
- Added calling the "programmer.cmd" file instead of the programmer if it is found in the source folder.

## 2.4.5 - 2024-05-09
- Improved compilation processing algorithm.

## 2.4.1 - 2023-09-18
- Improved display in the window "Positron Editor".

## 2.4.0 - 2023-05-17
- Fixed highlighting when displaying a Hover block (VSCode v1.78).

## 2.1.5 - 2023-03-07
- Fixed that when starting VSCode, if the (*.inc) file was opened, then there was a large continuous load on the CPU.

## 2.1.2 - 2022-12-24
- Updated database file "main.json" (color has been changed for "KeywordCommand").

## 2.1.0 - 2022-11-03
- Updated database file "main.json".
- Fixed webpages not working in VSCode 1.7.3.
- Added new setting of the editor ("Outline Collapse").
  (version of VSCode IDE 1.7.3 is required and also developers have fixed keeping "Outline" panel when switching to another file).

## 2.0.9 - 2022-10-19
- Improved work smart mode highlight for the included files from the parent file (when starting VSCode IDE).

## 2.0.8 - 2022-10-17
- Fixed highlighting when displaying a Hover block.

## 2.0.7 - 2022-10-14
- Fixed links in the "Positron About" window in the "Documents" tab.
- Updated database file "main.json".

## 2.0.6 - 2022-10-12
- Various minor fixes.

## 2.0.4 - 2022-10-10
- Added the ability to stop compilation using the "Terminate" button in the "Program is already running!" window.
- Added the ability to work extension under Linux (You will need to install Wine for the compiler to work).
- Various minor fixes.


## 2.0.0 - 2022-10-01
- Improved the "Find All References" function, when the text is not selected, the whole word search is used.
- Added parsing of variables, symbols and labels in the "Procedure" structure and separate highlighting for procedure parameters.
- Added separate highlight for "Subroutine", "Parameter".
- Changed the default highlight for dark themes.
- The group of keywords "Keyword" was divided into groups:
  "Keyword"         - basic syntax and language constructs
  "KeywordMain"     - the main keywords of the language
  "KeywordType"     - types of declared variables or pins
  "KeywordModifier" - modifiers for variables and built-in language commands
  "KeywordCommand"  - built-in commands and language functions

## 1.9.8 - 2022-09-24
- Fixed the order of scanning the directories of included files.
- Fixed update of compiled file version when compiling from included files.
- Added navigation by errors in "Output" window for file "c:\path_to_project\A.S"
- Added new settings of the editor ("Format On Type", "Format On Save").
- Four code formatting modes are now available:
  1) Context Menu  -> "Format Document"                         - formats the code when clicking on this menu item.
  2) Positron Menu -> "Settings" -> "pos.timeout.AutoFormat"    - formats the code on the fly with the specified timeout.
  3) Positron Menu -> "Editor"   -> "Format On Type"            - formats the code when the user presses the "Enter" key in the code.
  4) Positron Menu -> "Editor"   -> "Format On Save"            - formats the code when the user saves the file.

## 1.9.7 - 2022-09-14
- Improved auto format function.

## 1.9.6 - 2022-09-13
- Fixed call "programmer.cmd" from included files.

## 1.9.5 - 2022-09-10
- Much improved work smart mode highlight for the included files from the parent file.
- Updated file "database.json".

## 1.9.4 - 2022-09-05
- Changed extension settings ("pos.show.SaveIconsInTitleMenu", "pos.show.ViewInContextMenu", "pos.show.CompileInContextMenu").
- Added links in elements ("Positron Samples", "Positron About").
- Various minor fixes.

## 1.9.2 - 2022-09-02
- Added new setting of the editor ("Sticky Scroll") and added support for this option.

## 1.9.1 - 2022-08-29
- Added highlighting of the label before the keyword "EData".
- Fixed an error when showing Hover block.

## 1.9.0 - 2022-08-26
- Fixed the error of highlighting the main blocks.
- Some changes in the settings.

## 1.8.9 - 2022-08-25
- Added the ability to call compilation and view assembler from included files.
  
## 1.8.7 - 2022-08-22
- The work with the highlighting database file ("database.json") has been changed, now it is two files:
  "main.json" - to highlight files (*.bas, *.inc)
  "asm.json"  - to highlight files (*.asm, *.lst)

## 1.8.6 - 2022-08-20
- Added new setting of the editor ("Line Numbers", "Scroll LastLine", "Select Suggestions").
- Small improvements.

## 1.8.5 - 2022-08-14
- Added new setting of the editor ("Vertical Rulers").
- Improved work and added new operators in PreprocessorJS.

## 1.8.4 - 2022-08-11
- Improved display of the "Tools" page.

## 1.8.2 - 2022-08-08
- Updated file "database.json".

## 1.8.1 - 2022-08-04
- The menu items are renamed: "Settings" => "Editor", "Programs" => "Tools".
- Added the menu item "Settings" (go to the page with extension settings).

## 1.8.0 - 2022-08-02
- Added new settings of the editor ("Selection Highlight", "Occurrences Highlight").

## 1.7.9 - 2022-08-01
- Added information usage of bytes and variables as a percentage in the "Output" window.
- Fixed navigation by errors in "Output" window.
- Improved display in the "Samples" window.

## 1.7.5 - 2022-07-30
- Added go to references (search for text in all files in the project).
- Added submenu "Samples" (allows you to navigate by examples in folders "C:\Users\NameUser\PDS\Samples").

## 1.7.4 - 2022-07-27
- Added PreprocessorJS based on the JavaScript engine (see "PreprocessorJS" in menu "Help").
- Fixed way to jump to error or warning line directly from "Output" window.
- Added submenu "Help".
- Small improvements.

## 1.7.1 - 2022-07-07
- Added highlighting macro definitions.
- Added editing the theme of "High Contrast Light".
- Added icons for operations to save and save all.
- Small improvements.

## 1.6.7 - 2022-06-11
- Fixed auto converting the path into "Output" window.
- Fixed work on 32-bit systems.

## 1.6.4 - 2022-06-06
- Added way to jump to error or warning line directly from "Output" window.
- Some improvements.

## 1.5.3 - 2022-04-03
- Added selection a location of an editor (for new open ASM or LST files) in the window.

## 1.5.2 - 2022-04-02
- Fixed navigation when clicked on the includes elements.

## 1.5.0 - 2022-03-01
- Fixed adding separator when showing Hover block.

## 1.4.9 - 2022-02-23
- Added help with Procedure and Define Signatures (from the comment above).
- Various minor fixes.

## 1.4.7 - 2022-02-20
- Added some elements in the settings editor.
- Improved device type detection.
- Various minor fixes.

## 1.4.5 - 2022-02-18
- Added help with Procedure and Define Signatures.
- Slightly corrected colors by default.
- Improved display hover block.
- Various minor fixes.

## 1.4.0 - 2022-02-13
- Added enable header.
- Added saving active tab on the settings page.
- Added file processing "Positron.js" in the current folder.
- Added version display and editing in the file (*.mci).

## 1.2.5 - 2022-02-09
- Added highlight for hover action.
- Various minor fixes.

## 1.2.4 - 2022-02-06
- Added highlight editor, general settings editor and editor header for a new file.
- Added about page and page with programs.
- Added auto format.

## 1.2.0 - 2022-01-09
- Added searching for the first definition of the device and its highlight for other files.
- Added smart mode highlight for the included files from the parent file.
- Added auto completion.

## 1.1.7 - 2022-01-07
- Various minor fixes.
- Added go to definition.

## 1.1.5 - 2022-01-06
- Added hovers show information about the symbol/object that's below the mouse cursor.

## 1.0.9 - 2022-01-03
- Added highlight names (procedure, define, label) in full text.

## 1.0.8 - 2022-01-03
- Added parse all files (by includes).

## 1.0.7 - 2022-01-01
- Improved analysis of the main designs of the compiler.
- Added when you click on the item in the Includes group, the corresponding file is opening.
- Added setting "outline.showInRoot" that allows you to show the specified groups of elements 
  in the root of the Outline panel. This will allow you when setting up "Outline -> Follow Cursor" 
  move the selected item in the Outline panel.

## 1.0.4 - 2021-12-26
- Added registers and alias bits for device by finding files *.ppi and *.def
- Added highlight name procedures in full text.

## 1.0.2 - 2021-12-20
- Added labels and removed duplicate items from outline.

## 1.0.1 - 2021-12-19
- Added outline tree view.

## 1.0.0 - 2021-12-07
- Added settings delay time and mouse click for auto hide output window.

## 0.9.9 - 2021-12-06
- Added view assembler with find by current line or selection.

## 0.9.8 - 2021-12-05
- Fix args command line.
- Added view assembler and listing.

## 0.9.7 - 2021-12-04
- Many improvements.

## 0.0.2 - 2021-11-27
- Initial release.

