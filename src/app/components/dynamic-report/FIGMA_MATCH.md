# Reports screen – Figma se match kaise karein

Figma link (proto):  
[CX Dashboard - PDA Design System](https://www.figma.com/proto/9P2o2OVWfZaTo7CIXQdACT/CX-Dashboard---PDA-Design-System?node-id=3701-3339)

## Step 1: Figma open karo
- Browser mein link kholo (login ho to design dikhega).
- Node **3701:3339** Reports wala frame/screen hai.

## Step 2: Values note karo
Figma left panel se **Inspect** (Dev mode) use karke ye cheezein copy karo:

| Cheez | Figma mein kahan | Yahan change kahan |
|-------|-------------------|---------------------|
| Page padding | Frame padding | `dynamic-report.component.scss` → `$report-page-padding` |
| Title font size | "Reports" text | `$report-title-size` |
| Dropdown width | Category select width | `$report-dropdown-width` |
| Dropdown/button radius | Corner radius | `$report-dropdown-radius` |
| Pill radius | Subcategory pills | `$report-pill-radius` |
| Tile radius | Data point cards | `$report-tile-radius` |
| Border color | Kisi bordered box ka stroke | `$report-border-color` |
| Active (teal) color | Selected pill / active tile | `$report-active-teal` |
| Green button | Generate Report fill | `$report-btn-green` |

## Step 3: SCSS variables update karo
File: `dynamic-report.component.scss`  
Upar jo variables hain (e.g. `$report-dropdown-width: 320px`) unko Figma ki values se replace karo. Save karte hi UI update ho jayega.

## Step 4: Layout / spacing
Agar Figma mein:
- **Header** (Reports + dropdown + button) ka gap alag hai → `.report-controls` ka `gap` change karo.
- **Pills** ka spacing alag hai → `.subcategory-pills` ka `gap` / `margin-bottom` change karo.
- **Tiles** ka grid gap alag hai → `.tiles-grid` ka `gap` change karo.
- **Chart** panel ka padding alag hai → `.chart-area` ka `padding` change karo.

## Agar Figma file open nahi hoti
- File **share** / **view** link ho to Cursor agent ko access nahi hota.
- Tum apne browser mein Figma khol kar values manually copy karke SCSS variables mein daal sakte ho (Step 2 + 3).
