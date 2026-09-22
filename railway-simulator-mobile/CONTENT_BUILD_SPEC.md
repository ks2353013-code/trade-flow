# Northern Railway Simulator — Content Build Specification

This is the implementation contract for the remaining simulator content.

## Route
Primary release corridor: New Delhi–Ghaziabad–Meerut City–Muzaffarnagar–Saharanpur–Ambala Cantt.
Expansion corridors are represented in `data/route_segments.csv` and must be populated with verified geometry before release.

## Train systems
Implement Open Rails ENG/CVF/WAG-style definitions for the Indian fleet, with continuous controls, air-brake behaviour, vigilance and traction/braking interlocks.

## Operations
Use timetable/activity files for player and AI trains. Signals, blocks and points must be route-driven rather than decorative.

## Content rule
Use procedural/original geometry or assets with explicit redistribution/modification rights. Do not copy arbitrary commercial simulator assets.

## Release gate
A release is only marked COMPLETE after a Windows build succeeds and a test session verifies: loading, cab controls, acceleration, braking, signal compliance, station stop, AI traffic, timetable progression, weather mode and save/replay behaviour.
