# Coded Clouds Logo

## Required File

Place the **Coded Clouds logo** file here as:

```
logo.png
```

### File Requirements

- **Format:** PNG (transparent background preferred) or SVG
- **Name:** `logo.png` (exactly this name)
- **Content:** The full Coded Clouds branding mark — cloud icon with `</>` code brackets + "CODED CLOUDS" wordmark
- **Dimensions:** Original aspect ratio preserved (approximately 2.2:1 width:height)
- **Background:** White background version works for light/sky themes; the component adds a soft white pill background in dark mode for contrast

### Usage

This logo is used across the application:
- **Login page:** Large hero logo (200px wide)
- **Sidebar:** Small branding logo (120px wide, collapses to icon-only when sidebar is collapsed)
- **Favicon:** Browser tab icon (displayed from the same file)

The logo is managed through the `<BrandLogo>` component in `src/components/ui/BrandLogo.tsx`.
