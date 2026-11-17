import os
import sys

# When running in PyInstaller's --onefile mode, the bundled Tcl/Tk data
# directories are extracted to sys._MEIPASS. Set TCL_LIBRARY and TK_LIBRARY
# to the names used by PyInstaller's own tkinter runtime hook.

if hasattr(sys, '_MEIPASS'):
    meipass = sys._MEIPASS
    tcl_lib = os.path.join(meipass, '_tcl_data')
    tk_lib = os.path.join(meipass, '_tk_data')

    if os.path.isdir(tcl_lib):
        os.environ['TCL_LIBRARY'] = tcl_lib
    if os.path.isdir(tk_lib):
        os.environ['TK_LIBRARY'] = tk_lib
