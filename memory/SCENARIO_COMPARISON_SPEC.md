# What-If Scenario Comparison Feature

## Status: PLANNED — On hold per user request

## Feature Overview
Users can create up to 3 pricing scenarios within a project and compare them side-by-side for client negotiations.

## Implementation Plan

### 1. Scenario Management
- "Scenarios" tab/section in Estimator workspace
- Each scenario = snapshot of wave grid with different overrides/resource mixes
- Create from current state (copies all waves + allocations)
- Name and describe each (e.g., "Option A - Aggressive", "Option B - Premium")
- Max 3 scenarios per project

### 2. Scenario Editing
- Switch between scenarios to modify override rates, swap resources, adjust allocations
- Each scenario has its own overrides and resource configurations
- Base project data (skills, locations, logistics config) stays shared

### 3. Side-by-Side Comparison View
- Comparison dashboard: 2-3 scenarios in columns
- Key metrics: Total MM, Resources Price, Logistics, CTC, Selling Price, Final Price
- Highlighted differences (green = lower cost, red = higher)
- Per-wave breakdown comparison
- Bar chart visualization of price differences

### 4. Finalize & Apply
- User picks winning scenario → applies as active estimation
- Option to export comparison as Excel (all scenarios on one sheet)

### Storage
- Stored as part of project document in MongoDB
- Versioned with the project

## Date Saved: March 2026
