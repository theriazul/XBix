# NumberCheck

A static, browser-only phone number format checker with an approximate country map, a global administrative place explorer, and consent-based device location sharing.

## Run locally

Open `index.html`, or serve this folder from `localhost` (recommended for clipboard and geolocation browser permissions). The location-sharing feature is available only after an explicit button click and a browser permission grant.

## Test the location explorer

1. Open **Places**, focus **Country or territory**, and type a country name or ISO code. Use arrow keys and Enter, or click a result.
2. With a country selected, type a first-level division (for example, `California` under United States or `Ontario` under Canada); select it, then search for a child such as `Toronto`.
3. Use **Search any place worldwide** for country-qualified locations such as `Bavaria, Germany`, `Maharashtra, India`, `Tokyo, Japan`, or ambiguous `London`. Results include country and returned place type so same-name locations can be distinguished.
4. Select Bangladesh and search `Dhaka` in both the division and district fields. The bundled list supplies all 8 divisions and 64 districts even if Photon has no point for a selection.
5. Use **Fit to location** and **Reset map**. Simulate a disconnected network or HTTP 429 response to verify the geographic-search error state. Search suggestions use the public Photon demo and are intentionally throttled.

## Features and privacy

- International number validation, including Bangladesh `+880`, uses `libphonenumber-js` metadata. A valid format does not establish that a number is active, assigned, or associated with an owner.
- Country map pins show approximate country-level views only. Shared calling codes are resolved from valid number metadata. A small built-in set of map centers is used; regions without one are identified without guessing.
- The global location explorer uses the [`world-countries` 5.1.0 ODbL dataset](https://github.com/mledoze/countries) for its 250-country/territory catalog, ISO codes, flags, and approximate country centers. It loads only when the country selector is first used.
- Global place search and state/county/city suggestions use the [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md) over OpenStreetMap. Queries are debounced, cancelled when superseded, cached in memory, limited to eight results, filtered by ISO country when selected, and rate-limited to at most one request per second in this page.
- Bangladesh's bundled 8-division/64-district directory remains available as the country-specific local hierarchy. A selected division/district can be geocoded by exact-name Photon search for an approximate point; the local result remains available if that lookup fails.
- Photon results describe OSM-mapped places and vary by country. The interface reports the returned administrative type, parent fields, source, approximate point, and OSM admin level when present. Photon does not return full boundary geometry from this hosted service; no polygons are drawn. An extent, when returned, is used only to frame the map.
- Place exploration is manual and independent of phone lookup and GPS. A phone number never selects or implies an administrative area. Place-name queries and the selected ISO country filter (not phone numbers or GPS coordinates) are sent to Photon.
- GPS coordinates are requested only after clicking **Share my location**. They are held in page memory, are not uploaded or added to history, and can be cleared to restore the previous map view.
- Up to five valid phone numbers may be saved in this browser's local storage as recent checks. Use **Clear history** to remove them. This storage is local to the browser and is not sent to a server.

## External services

The static app has no API keys or backend. It loads `libphonenumber-js`, Leaflet, and Lucide from pinned CDNs; the country catalog comes from jsDelivr, place search from the Photon public demo, fonts from Google Fonts, and map tiles from OpenStreetMap. These services require an internet connection. Photon allows reasonable use but may throttle requests and does not guarantee availability; production/high-volume use needs an appropriately hosted geocoder or backend. OpenStreetMap data is ODbL and tile use is subject to its separate tile usage policy. Keep visible [OpenStreetMap attribution](https://www.openstreetmap.org/copyright).

## GitHub Pages deployment

1. Put `index.html`, `style.css`, `script.js`, and this README in the repository root.
2. In GitHub, open **Settings → Pages**.
3. Choose **Deploy from a branch**, then select the `main` branch and `/ (root)`.
4. Save and open the published HTTPS URL. Geolocation requires HTTPS (GitHub Pages provides it) or localhost.

## Limitations

This frontend cannot access private telecom databases, identify subscribers, retrieve operator or SIM-registration details, or locate a phone from its number. Numbering metadata verifies format only. Approximate map markers are not device locations; precise coordinates appear only when the device user consents to browser geolocation.

## Security and source protection

- The project is frontend-only. A visitor's browser receives the HTML, CSS, JavaScript, and UI assets, so a technically knowledgeable visitor can inspect and copy them. The scoped right-click suppression and non-selectable decorative branding only discourage casual copying; they do not protect source code or guarantee ownership.
- Text selection remains enabled for inputs and ordinary content. Right-click is suppressed only on decorative branding, labels, and icon elements; forms, links, and map controls keep their normal browser interactions.
- The repository contains no local image assets, credentials, API keys, or backend configuration. The logo is text/CSS and icons come from Lucide. No image watermark was added because there are no first-party image files to mark.
- Number validation runs against downloaded local metadata; submitted numbers are not sent to a lookup API. Up to five valid numbers are stored in this origin's `localStorage` until cleared. GPS coordinates are not stored there, but are visible in the current page memory. Use **Clear history** on shared devices.
- The app does not upload GPS coordinates to its own server. However, when the map is centered on a shared GPS position, OpenStreetMap tile requests can reveal the approximate area being viewed to the tile provider. Opening the coordinate link sends the coordinates in the OpenStreetMap URL. External CDNs and Google Fonts also receive ordinary resource requests.
- User-provided number strings and selected district names are inserted as text, not parsed as HTML. There are no API secrets or private business rules in the frontend.
- Recent numbers are browser-local but not encrypted. JavaScript running in the page, including third-party scripts, technically has page-level access to the DOM and `localStorage`. SRI checks resource integrity; it does not sandbox a dependency. The app does not submit the entered number to a phone lookup API.

## Browser policy and hosting

`index.html` includes a restrictive Content Security Policy meta tag for the actual resources used: same-origin app files; pinned scripts and Leaflet CSS on unpkg; country data on jsDelivr; place queries on Photon; Google Fonts CSS and font files; and the three OpenStreetMap tile hosts. It blocks objects, frames, unapproved form targets, and other resource origins. `img-src data:` permits Leaflet's tiny transparent GIF tile-loading placeholder; it does not permit data scripts or styles. `style-src-attr 'unsafe-inline'` is limited to style attributes because Leaflet positions map elements with runtime inline styles; script `unsafe-inline` and `unsafe-eval` are not enabled. The page also sets a `no-referrer` policy.

The third-party scripts and Leaflet stylesheet are version-pinned and use Subresource Integrity (SRI). Keep each integrity digest in sync with the exact file when updating a dependency. Google Fonts may serve browser-dependent CSS, so it is not SRI-pinned. CDN libraries and OpenStreetMap tiles require an internet connection.

The meta CSP is a useful static-site fallback, not equivalent to HTTP response headers. In particular, CSP `frame-ancestors`, report-only enforcement, HSTS, `X-Content-Type-Options`, and `Permissions-Policy` must be set as response headers to be reliable; GitHub Pages does not provide a repository file for arbitrary custom response headers. For stronger hosting-level policy, put a CDN or reverse proxy that supports response-header rules in front of the site. Recommended headers include:

```text
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()
X-Content-Type-Options: nosniff
Content-Security-Policy: <the site's tested policy, with frame-ancestors 'none'>
```

Add HSTS only at a host that serves the site exclusively over HTTPS and only after confirming all covered subdomains support HTTPS. GitHub Pages can serve the site over HTTPS, but a meta tag cannot provide HSTS.

## Repository and licensing

This repository currently contains `index.html`, `style.css`, `script.js`, `README.md`, and `LICENSE`; there are no local image or font assets, package manifests, or build configuration. If the GitHub repository is public, its source, documentation, and license are publicly accessible. A private repository may be used with GitHub Pages only where the account/organization plan and settings support it; private source still does not make delivered frontend code secret from visitors.

The footer identifies **Riazul Islam Tusar** as the copyright owner. The existing [MIT License](LICENSE) is permissive and explicitly grants reuse, modification, and redistribution rights. Copyright ownership and an open-source license are separate: the copyright notice identifies the owner, while MIT grants the permissions stated in that license. The MIT license was left unchanged. If reuse should be restricted, choose suitable proprietary terms and replace the license only after the owner approves; a notice or license file does not register copyright or create government-issued protection.

External components remain subject to their own terms: Leaflet is BSD-2-Clause, `libphonenumber-js` is MIT, Lucide is ISC, Google Fonts' font files use their listed font licenses, the `world-countries` data is ODbL, and Photon searches OpenStreetMap data under ODbL. Keep their attributions and license terms when changing or self-hosting these resources.

No JavaScript obfuscation or build pipeline was added: it would not conceal delivered code and would make this small static project harder to maintain. If desired later, minification can be introduced as an optional deployment step that leaves these readable source files intact.
