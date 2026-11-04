# Shop settings responsive verification — 2026-11-04

Actual ShopSettingsPage, AppShell, CSS and query/mutation hooks rendered with in-memory repositories. No production shop data changed. This checks browser viewports, not physical iOS devices or real storage/GPS services.

- 390×844: name saved with a long Thai name; selected an existing JPG under a long filename, saved through the mock logo service; automatic mock coordinates and manually entered negative latitude/long longitude saved successfully.
- 768×1024: long name wrapped in identity area; file control remained bounded; latitude and longitude displayed in two columns.
- 320×740: no input or button extended outside the viewport, including with the long saved name and filename.
- Measurements: 390px viewport had 375px document content width (scrollbar), 309px inputs within 309px parents. 768px viewport had 753px content width, name/file inputs 639px and coordinate inputs 311.5px. At 320px, document width was 320px. No horizontal document overflow.
- Screenshots: screenshots/shop-settings-phone-coordinates-20261104.png and screenshots/shop-settings-tablet-20261104.png.
