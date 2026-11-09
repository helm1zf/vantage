"""Imported first by every kit script that prints: output is always UTF-8.

On Windows a script whose output is piped (the app reads it, a chat runs it) gets a legacy code page (cp1252) and crashes on any
character outside it (a Turkish name, an arrow, an emoji). The app and the agents read UTF-8, so say so once, here.
"""
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass
