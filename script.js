"use strict";

const HISTORY_KEY = "numbercheck.recent-numbers.v1";
const COUNTRY_DATA_URL = "https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json";
const COUNTRY_DATA_INTEGRITY = "sha384-J2799pXmuGfHQjOErUWJG6CC1C6fRQA4HemJ3jbYJlqpVFudfJdz793JMcC/1hsr";
const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";
const DEFAULT_VIEW = { center: [20, 0], zoom: 2 };
const MAP_CENTERS = {
    BD: [[23.685, 90.3563], 6], US: [[39.8283, -98.5795], 4], CA: [[56.1304, -106.3468], 3],
    GB: [[55.3781, -3.436], 5], IN: [[20.5937, 78.9629], 5], PK: [[30.3753, 69.3451], 5],
    AU: [[-25.2744, 133.7751], 4], NZ: [[-40.9006, 174.886], 5], JP: [[36.2048, 138.2529], 5],
    CN: [[35.8617, 104.1954], 4], SG: [[1.3521, 103.8198], 11], MY: [[4.2105, 101.9758], 6],
    ID: [[-0.7893, 113.9213], 4], LK: [[7.8731, 80.7718], 7], NP: [[28.3949, 84.124], 7],
    AE: [[23.4241, 53.8478], 6], SA: [[23.8859, 45.0792], 5], QA: [[25.3548, 51.1839], 8],
    KW: [[29.3117, 47.4818], 8], TR: [[38.9637, 35.2433], 5], EG: [[26.8206, 30.8025], 5],
    ZA: [[-30.5595, 22.9375], 5], NG: [[9.082, 8.6753], 5], KE: [[-0.0236, 37.9062], 5],
    DE: [[51.1657, 10.4515], 6], FR: [[46.2276, 2.2137], 5], IT: [[41.8719, 12.5674], 5],
    ES: [[40.4637, -3.7492], 5], NL: [[52.1326, 5.2913], 7], BE: [[50.5039, 4.4699], 7],
    CH: [[46.8182, 8.2275], 7], SE: [[60.1282, 18.6435], 4], NO: [[60.472, 8.4689], 4],
    FI: [[61.9241, 25.7482], 4], GR: [[39.0742, 21.8243], 6], PL: [[51.9194, 19.1451], 5],
    UA: [[48.3794, 31.1656], 5], BR: [[-14.235, -51.9253], 4], MX: [[23.6345, -102.5528], 4],
    AR: [[-38.4161, -63.6167], 4], CL: [[-35.6751, -71.543], 4], CO: [[4.5709, -74.2973], 5],
    TH: [[15.87, 100.9925], 5], VN: [[14.0583, 108.2772], 5], PH: [[12.8797, 121.774], 5],
    IR: [[32.4279, 53.688], 5], IQ: [[33.2232, 43.6793], 5], IL: [[31.0461, 34.8516], 7],
    MA: [[31.7917, -7.0926], 5], GH: [[7.9465, -1.0232], 6], ET: [[9.145, 40.4897], 5]
};
const DISTRICTS = {
    "Barishal": ["Barguna", "Barishal", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
    "Chattogram": ["Bandarban", "Brahmanbaria", "Chandpur", "Chattogram", "Cumilla", "Cox's Bazar", "Feni", "Khagrachhari", "Lakshmipur", "Noakhali", "Rangamati"],
    "Dhaka": ["Dhaka", "Faridpur", "Gazipur", "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Narayanganj", "Narsingdi", "Rajbari", "Shariatpur", "Tangail"],
    "Khulna": ["Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Khulna", "Kushtia", "Magura", "Meherpur", "Narail", "Satkhira"],
    "Mymensingh": ["Jamalpur", "Mymensingh", "Netrokona", "Sherpur"],
    "Rajshahi": ["Bogura", "Chapainawabganj", "Joypurhat", "Naogaon", "Natore", "Pabna", "Rajshahi", "Sirajganj"],
    "Rangpur": ["Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Rangpur", "Thakurgaon"],
    "Sylhet": ["Habiganj", "Moulvibazar", "Sunamganj", "Sylhet"]
};

const phoneForm = document.getElementById("phoneForm");
const phoneInput = document.getElementById("phoneNumber");
const phoneResult = document.getElementById("phoneResult");
const phoneError = document.getElementById("phoneError");
const searchButton = document.getElementById("searchButton");
const mapResult = document.getElementById("mapResult");
const gpsResult = document.getElementById("gpsResult");
const shareLocationBtn = document.getElementById("shareLocationBtn");
const clearLocationBtn = document.getElementById("clearLocationBtn");
const toast = document.getElementById("toast");
let map;
let countryMarker;
let gpsMarker;
let explorerMarker;
let toastTimer;
let preGpsView;
let preGpsMapMessage = "Search a number, choose a place, or share your location.";
let privacyReturnFocus;
let privacyCloseTimer;
let countryCatalogPromise;
let countryCatalog;
let photonAbortController;
let lastPhotonRequestAt = 0;
let selectedExplorerCountry;
let selectedExplorerAdmin1;
let selectedExplorerAdmin2;
let selectedExplorerLocation;
const photonCache = new Map();
const explorerDebounceTimers = new Map();

function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons();
    }
}

function createIcon(name) {
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", name);
    icon.setAttribute("aria-hidden", "true");
    return icon;
}

function createMapMarkerIcon(isGps = false) {
    const marker = document.createElement("span");
    marker.className = isGps ? "map-marker map-marker-gps" : "map-marker";
    marker.setAttribute("aria-hidden", "true");
    return L.divIcon({ className: "", html: marker, iconSize: [16, 16], iconAnchor: [8, 8] });
}

function createExplorerMarkerIcon(isCountry = false) {
    const marker = document.createElement("span");
    marker.className = isCountry ? "geo-location-marker geo-location-marker-country" : "geo-location-marker";
    marker.setAttribute("aria-hidden", "true");
    return L.divIcon({ className: "", html: marker, iconSize: [18, 18], iconAnchor: [9, 9] });
}

function countryName(country) {
    return country?.name?.common || country?.name || "Unknown country";
}

function normalizePlaceName(value) {
    return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function setComboboxExpanded(input, expanded) {
    input.setAttribute("aria-expanded", String(expanded));
    if (!expanded) input.removeAttribute("aria-activedescendant");
}

function showSuggestionMessage(list, input, message, className = "") {
    list.replaceChildren();
    const item = document.createElement("div");
    item.className = `geo-suggestions-message ${className}`.trim();
    if (className.includes("is-loading")) item.append(createIcon("loader-circle"));
    const text = document.createElement("span");
    text.textContent = message;
    item.append(text);
    list.append(item);
    list.hidden = false;
    setComboboxExpanded(input, true);
}

function createSuggestionButton(list, input, index, title, metadata, onSelect, flag = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "geo-suggestion";
    button.id = `${list.id}-option-${index}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    if (flag) {
        const flagLabel = document.createElement("span");
        flagLabel.className = "geo-suggestion-flag";
        flagLabel.setAttribute("aria-hidden", "true");
        flagLabel.textContent = flag;
        button.append(flagLabel);
    }
    const copy = document.createElement("span");
    copy.className = "geo-suggestion-copy";
    const name = document.createElement("span");
    name.className = "geo-suggestion-name";
    name.textContent = title;
    copy.append(name);
    if (metadata) {
        const meta = document.createElement("span");
        meta.className = "geo-suggestion-meta";
        meta.textContent = metadata;
        copy.append(meta);
    }
    button.append(copy);
    button.addEventListener("click", () => {
        list.hidden = true;
        setComboboxExpanded(input, false);
        onSelect();
        input.focus();
    });
    list.append(button);
}

function enableComboboxKeyboard(input, list) {
    input.addEventListener("keydown", event => {
        const options = [...list.querySelectorAll('[role="option"]')];
        if (event.key === "Escape") {
            list.hidden = true;
            setComboboxExpanded(input, false);
            return;
        }
        if (!options.length || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
        const activeIndex = options.findIndex(option => option.id === input.getAttribute("aria-activedescendant"));
        if (event.key === "Enter") {
            if (activeIndex >= 0) {
                event.preventDefault();
                options[activeIndex].click();
            }
            return;
        }
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = activeIndex < 0
            ? (direction > 0 ? 0 : options.length - 1)
            : (activeIndex + direction + options.length) % options.length;
        options.forEach((option, index) => option.setAttribute("aria-selected", String(index === nextIndex)));
        input.setAttribute("aria-activedescendant", options[nextIndex].id);
        options[nextIndex].scrollIntoView({ block: "nearest" });
    });
}

async function loadCountryCatalog() {
    if (!countryCatalogPromise) {
        countryCatalogPromise = fetch(COUNTRY_DATA_URL, {
            mode: "cors",
            integrity: COUNTRY_DATA_INTEGRITY
        }).then(response => {
            if (!response.ok) throw new Error(`Country data request failed (${response.status}).`);
            return response.json();
        }).then(records => {
            if (!Array.isArray(records)) throw new Error("Country data had an unexpected format.");
            countryCatalog = records.filter(record => record?.cca2 && record?.name?.common)
                .sort((first, second) => countryName(first).localeCompare(countryName(second)));
            return countryCatalog;
        }).catch(error => {
            countryCatalogPromise = null;
            throw error;
        });
    }
    return countryCatalogPromise;
}

function countryByCode(code) {
    if (!code || !countryCatalog) return null;
    return countryCatalog.find(country => country.cca2 === code.toUpperCase()) || null;
}

function isPhoneLikeSearch(value) {
    const digits = String(value).replace(/\D/g, "");
    return digits.length >= 7 && /^[+\d\s().-]+$/.test(value.trim());
}

function abortableDelay(milliseconds, signal) {
    if (milliseconds <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(resolve, milliseconds);
        signal.addEventListener("abort", () => {
            window.clearTimeout(timer);
            reject(new DOMException("Search cancelled", "AbortError"));
        }, { once: true });
    });
}

async function searchPhoton(query, { countryCode = "", layers = [], extent = null } = {}) {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return [];
    if (isPhoneLikeSearch(cleanQuery)) throw new Error("Search for a place name, not a phone number.");

    photonAbortController?.abort();
    const controller = new AbortController();
    photonAbortController = controller;
    const params = new URLSearchParams({ q: cleanQuery, limit: "8", lang: "en" });
    if (countryCode) params.set("countrycode", countryCode.toUpperCase());
    layers.forEach(layer => params.append("layer", layer));
    if (extent?.length === 4 && extent.every(Number.isFinite)) {
        const [minLon, maxLat, maxLon, minLat] = extent;
        params.set("bbox", [minLon, minLat, maxLon, maxLat].join(","));
    }

    const requestUrl = `${PHOTON_ENDPOINT}?${params.toString()}`;
    const cacheKey = requestUrl;
    if (photonCache.has(cacheKey)) return photonCache.get(cacheKey);

    const wait = Math.max(0, 1100 - (Date.now() - lastPhotonRequestAt));
    await abortableDelay(wait, controller.signal);
    lastPhotonRequestAt = Date.now();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, 10000);
    try {
        const response = await fetch(requestUrl, {
            signal: controller.signal,
            headers: { Accept: "application/geo+json, application/json" }
        });
        if (response.status === 429) throw new Error("Place search is temporarily rate-limited. Wait a moment and try again.");
        if (!response.ok) throw new Error(`Place search failed (${response.status}).`);
        const result = await response.json();
        const features = Array.isArray(result.features) ? result.features : [];
        photonCache.set(cacheKey, features);
        if (photonCache.size > 60) photonCache.delete(photonCache.keys().next().value);
        return features;
    } catch (error) {
        if (error.name === "AbortError" && !timedOut) throw error;
        if (timedOut) throw new Error("Place search timed out. Check your connection and try again.");
        throw error;
    } finally {
        window.clearTimeout(timeout);
        if (photonAbortController === controller) photonAbortController = null;
    }
}

function photonCountryCode(properties) {
    return String(properties?.countrycode || properties?.["country code"] || "").toUpperCase();
}

function photonLevel(properties) {
    const type = String(properties?.type || properties?.osm_value || "place").toLowerCase();
    const levels = {
        country: "Country",
        state: "State / province / region",
        county: "County / second-level division",
        district: "District",
        city: "City / municipality",
        locality: "Locality",
        suburb: "Neighbourhood / suburb"
    };
    return levels[type] || (properties?.osm_key === "boundary" ? "Administrative area" : type.charAt(0).toUpperCase() + type.slice(1));
}

function photonLocation(feature) {
    const properties = feature?.properties || {};
    const coordinates = feature?.geometry?.type === "Point" ? feature.geometry.coordinates : null;
    const hasPoint = Array.isArray(coordinates) && coordinates.length >= 2 && coordinates.slice(0, 2).every(Number.isFinite);
    const extent = Array.isArray(properties.extent) && properties.extent.length === 4 && properties.extent.every(Number.isFinite)
        ? properties.extent
        : null;
    const parents = [properties.state, properties.county, properties.city, properties.district, properties.locality]
        .filter(value => value && normalizePlaceName(value) !== normalizePlaceName(properties.name));
    return {
        name: properties.name || "Unnamed place",
        level: photonLevel(properties),
        country: properties.country || "Not available",
        countryCode: photonCountryCode(properties),
        parent: [...new Set(parents)].join(", ") || "Not available",
        latitude: hasPoint ? coordinates[1] : null,
        longitude: hasPoint ? coordinates[0] : null,
        extent,
        osmType: properties.osm_type || "Not available",
        osmId: properties.osm_id || null,
        adminLevel: properties.extra?.admin_level || null,
        isAdministrativeBoundary: properties.osm_key === "boundary" && properties.osm_value === "administrative",
        source: "OpenStreetMap place data via Photon",
        quality: hasPoint ? "Approximate geocoded point; not a live/device location" : "Coordinates not available",
        geometry: hasPoint ? "Point only; no boundary geometry returned" : "No geometry returned",
        manual: true,
        feature
    };
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function initializeMap() {
    if (!window.L) {
        mapResult.textContent = "The map library did not load. Check your connection; phone format checks can still work.";
        return;
    }

    map = L.map("map", { scrollWheelZoom: false }).setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    map.getContainer().tabIndex = 0;
    map.getContainer().addEventListener("focusin", () => map.scrollWheelZoom.enable());
    map.getContainer().addEventListener("focusout", () => map.scrollWheelZoom.disable());
}

function setPhoneError(message) {
    phoneError.textContent = message;
    phoneInput.setAttribute("aria-invalid", message ? "true" : "false");
}

function countryNameFor(regionCode) {
    if (!regionCode) return "Country/region not resolved";
    try {
        return new Intl.DisplayNames(["en"], { type: "region" }).of(regionCode) || regionCode;
    } catch {
        return regionCode;
    }
}

function addResultField(label, value, copyValue) {
    const field = document.createElement("div");
    field.className = "result-field";
    const fieldLabel = document.createElement("span");
    fieldLabel.className = "result-field-label";
    fieldLabel.textContent = label;
    const valueRow = document.createElement("div");
    valueRow.className = "result-field-value";
    const valueText = document.createElement("span");
    valueText.textContent = value;
    valueRow.append(valueText);
    if (copyValue) {
        const copyButton = document.createElement("button");
        copyButton.className = "copy-button";
        copyButton.type = "button";
        copyButton.setAttribute("aria-label", `Copy ${label.toLowerCase()}`);
        copyButton.dataset.copy = copyValue;
        copyButton.append(createIcon("copy"));
        valueRow.append(copyButton);
    }
    field.append(fieldLabel, valueRow);
    return field;
}

function renderLookup(parsed) {
    const countryName = countryNameFor(parsed.country);
    const grid = document.createElement("div");
    grid.className = "result-grid";
    grid.append(
        addResultField("INTERNATIONAL FORMAT", parsed.formatInternational(), parsed.formatInternational()),
        addResultField("COUNTRY / REGION", countryName),
        addResultField("CALLING CODE", `+${parsed.countryCallingCode}`, `+${parsed.countryCallingCode}`)
    );
    const notice = document.createElement("p");
    notice.className = "result-notice";
    const noticeText = document.createElement("span");
    noticeText.textContent = "Valid format means it matches numbering-plan rules. It does not confirm an active service, owner, operator, registration address, or live location.";
    notice.append(createIcon("info"), noticeText);
    phoneResult.className = "result-panel";
    phoneResult.replaceChildren(grid, notice);
    refreshIcons();
    showCountryOnMap(parsed.country, countryName);
}

function showCountryOnMap(regionCode, countryName) {
    const view = MAP_CENTERS[regionCode];
    if (!view) {
        if (countryMarker && map) map.removeLayer(countryMarker);
        countryMarker = null;
        mapResult.textContent = `${countryName} was detected from the number metadata, but a country map view is not available for this region.`;
        return;
    }
    if (!map) {
        mapResult.textContent = `${countryName} was detected. The map is unavailable because its library did not load.`;
        return;
    }

    if (countryMarker) map.removeLayer(countryMarker);
    const [center, zoom] = view;
    countryMarker = L.marker(center, { icon: createMapMarkerIcon() }).addTo(map);
    const popup = document.createElement("span");
    popup.textContent = `${countryName} · approximate country-level view`;
    countryMarker.bindPopup(popup);
    map.flyTo(center, zoom, { duration: 1.1 });
    countryMarker.openPopup();
    mapResult.textContent = `Approximate country-level view: ${countryName}. This is not the phone's location.`;
}

function readHistory() {
    try {
        const saved = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(saved) ? saved.filter(item => typeof item === "string").slice(0, 5) : [];
    } catch {
        return [];
    }
}

function renderHistory() {
    const historyList = document.getElementById("historyList");
    const history = readHistory();
    historyList.replaceChildren();
    history.forEach(number => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-chip";
        button.textContent = number;
        button.title = `Check ${number} again`;
        button.addEventListener("click", () => {
            phoneInput.value = number;
            performLookup(number, false);
        });
        historyList.append(button);
    });
    document.getElementById("clearHistoryBtn").disabled = history.length === 0;
}

function saveHistory(number) {
    const history = [number, ...readHistory().filter(item => item !== number)].slice(0, 5);
    try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
        showToast("Browser storage is unavailable. This lookup was not saved.");
    }
    renderHistory();
}

function renderLookupError(message) {
    if (!gpsMarker && countryMarker && map) {
        map.removeLayer(countryMarker);
        countryMarker = null;
        map.flyTo(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom, { duration: .6 });
        mapResult.textContent = "No country is shown because this number could not be validated.";
    }
    phoneResult.className = "result-panel empty-state";
    const icon = document.createElement("span");
    icon.className = "empty-icon";
    icon.append(createIcon("circle-alert"));
    const content = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = "We couldn't validate that number";
    const detail = document.createElement("p");
    detail.textContent = message;
    content.append(heading, detail);
    phoneResult.replaceChildren(icon, content);
    refreshIcons();
}

function performLookup(rawNumber, shouldSave = true) {
    const cleanInput = rawNumber.trim();
    if (!cleanInput) {
        setPhoneError("Enter a number to continue.");
        phoneInput.focus();
        return;
    }
    if (!/^\+[\d\s().-]+$/.test(cleanInput)) {
        setPhoneError("Use international format with + and country code.");
        renderLookupError("For example, enter +880 followed by the subscriber number. Only digits, spaces, parentheses, dots, and hyphens are accepted.");
        return;
    }
    if (!window.libphonenumber || typeof window.libphonenumber.parsePhoneNumberFromString !== "function") {
        setPhoneError("Number metadata is unavailable.");
        renderLookupError("The numbering metadata library did not load. Check your connection and try again.");
        return;
    }

    setPhoneError("");
    searchButton.disabled = true;
    searchButton.classList.add("is-loading");
    searchButton.querySelector("span").textContent = "Checking";
    searchButton.querySelector("svg")?.setAttribute("data-lucide", "loader-circle");
    refreshIcons();

    window.setTimeout(() => {
        try {
            const parsed = window.libphonenumber.parsePhoneNumberFromString(cleanInput);
            if (!parsed || !parsed.isPossible()) {
                throw new Error("This number is incomplete or has an invalid length for its calling code.");
            }
            if (!parsed.isValid()) {
                throw new Error("The number length is plausible, but its digits do not match a valid numbering pattern.");
            }
            renderLookup(parsed);
            if (shouldSave) saveHistory(parsed.number);
            showToast("Number format validated.");
        } catch (error) {
            renderLookupError(error instanceof Error ? error.message : "Check the international format and try again.");
            setPhoneError("Check the number format.");
        } finally {
            searchButton.disabled = false;
            searchButton.classList.remove("is-loading");
            searchButton.querySelector("span").textContent = "Analyze";
            searchButton.querySelector("svg")?.setAttribute("data-lucide", "arrow-up-right");
            refreshIcons();
        }
    }, 180);
}

function resetMapView() {
    if (!map) {
        showToast("The map is not available.");
        return;
    }
    if (gpsMarker) {
        map.flyTo(gpsMarker.getLatLng(), 15, { duration: .8 });
        gpsMarker.openPopup();
    } else if (countryMarker) {
        const region = Object.entries(MAP_CENTERS).find(([, view]) => countryMarker.getLatLng().lat === view[0][0] && countryMarker.getLatLng().lng === view[0][1]);
        const view = region ? region[1] : [DEFAULT_VIEW.center, DEFAULT_VIEW.zoom];
        map.flyTo(view[0], view[1], { duration: .8 });
        countryMarker.openPopup();
    } else {
        map.flyTo(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom, { duration: .8 });
        mapResult.textContent = "Global map view reset. Search a number, choose a place, or share your location.";
    }
}

function setGeoStatus(message, loading = false) {
    const status = document.getElementById("geoStatus");
    status.classList.toggle("is-loading", loading);
    const text = document.createElement("span");
    text.textContent = message;
    status.replaceChildren(createIcon(loading ? "loader-circle" : "info"), text);
    refreshIcons();
}

function renderGeoPlaceholder(title, description) {
    const details = document.getElementById("geoDetails");
    details.className = "geo-details geo-details-empty";
    const icon = document.createElement("span");
    icon.className = "geo-details-icon";
    icon.append(createIcon("map-pin"));
    const copy = document.createElement("div");
    copy.className = "geo-details-copy";
    const label = document.createElement("span");
    label.className = "step-label";
    label.textContent = "LOCATION DETAILS";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const text = document.createElement("p");
    text.textContent = description;
    copy.append(label, heading, text);
    details.replaceChildren(icon, copy);
    document.getElementById("fitGeoLocationBtn").disabled = true;
}

function addGeoDetail(grid, label, value) {
    const item = document.createElement("div");
    item.className = "geo-detail";
    const itemLabel = document.createElement("span");
    itemLabel.className = "geo-detail-label";
    itemLabel.textContent = label;
    const itemValue = document.createElement("span");
    itemValue.className = "geo-detail-value";
    itemValue.textContent = value || "Not available";
    item.append(itemLabel, itemValue);
    grid.append(item);
}

function renderGeoLocation(location) {
    selectedExplorerLocation = location;
    const details = document.getElementById("geoDetails");
    details.className = "geo-details";
    const icon = document.createElement("span");
    icon.className = "geo-details-icon";
    icon.append(createIcon("map-pin"));
    const copy = document.createElement("div");
    copy.className = "geo-details-copy";
    const label = document.createElement("span");
    label.className = "step-label";
    label.textContent = "MANUALLY SELECTED LOCATION";
    const heading = document.createElement("h3");
    heading.textContent = location.name;
    const summary = document.createElement("p");
    summary.textContent = `${location.level} · manual selection, not inferred from a phone number or GPS`;
    const grid = document.createElement("div");
    grid.className = "geo-detail-grid";
    const coordinates = Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
        ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
        : "Not available";
    const boundary = location.isAdministrativeBoundary
        ? `OSM administrative record${location.adminLevel ? ` (admin level ${location.adminLevel})` : ""}; full boundary geometry not returned`
        : location.geometry || "No verified boundary geometry returned";
    addGeoDetail(grid, "COUNTRY", `${location.country}${location.countryCode ? ` (${location.countryCode})` : ""}`);
    addGeoDetail(grid, "ADMINISTRATIVE LEVEL", location.level);
    addGeoDetail(grid, "PARENT LOCATION", location.parent);
    addGeoDetail(grid, "COORDINATES", coordinates);
    addGeoDetail(grid, "COORDINATE QUALITY", location.quality);
    addGeoDetail(grid, "DATA SOURCE", location.source);
    addGeoDetail(grid, "BOUNDARY GEOMETRY", boundary);
    copy.append(label, heading, summary, grid);
    details.replaceChildren(icon, copy);
    displayExplorerLocationOnMap(location);
}

function displayExplorerLocationOnMap(location) {
    if (explorerMarker && map) map.removeLayer(explorerMarker);
    explorerMarker = null;
    const fitButton = document.getElementById("fitGeoLocationBtn");
    if (!map) {
        setGeoStatus("The map library is unavailable. Location details are still available.");
        fitButton.disabled = true;
        return;
    }
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        mapResult.textContent = `No coordinates are available for manually selected ${location.name}; no explorer marker was drawn.`;
        fitButton.disabled = true;
        return;
    }

    const point = [location.latitude, location.longitude];
    const isCountry = location.level === "Country";
    explorerMarker = L.marker(point, { icon: createExplorerMarkerIcon(isCountry) }).addTo(map);
    const popup = document.createElement("span");
    popup.textContent = `${location.name} · ${location.level} · approximate point`;
    explorerMarker.bindPopup(popup);
    if (location.extent) {
        const [minLon, maxLat, maxLon, minLat] = location.extent;
        map.flyToBounds([[minLat, minLon], [maxLat, maxLon]], { maxZoom: isCountry ? 6 : 11, padding: [28, 28], duration: 1 });
    } else {
        const zoom = isCountry ? 4 : location.level.includes("State") || location.level.includes("province") ? 6 : location.level.includes("City") ? 11 : 8;
        map.flyTo(point, zoom, { duration: 1 });
    }
    explorerMarker.openPopup();
    fitButton.disabled = false;
    mapResult.textContent = `${location.name}: approximate geocoder point for a manually selected ${location.level}. No official boundary polygon is displayed.`;
}

function fitExplorerLocation() {
    if (!map || !selectedExplorerLocation) return;
    const location = selectedExplorerLocation;
    if (location.extent) {
        const [minLon, maxLat, maxLon, minLat] = location.extent;
        map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { maxZoom: 15, padding: [28, 28] });
    } else if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
        map.flyTo([location.latitude, location.longitude], 13, { duration: .8 });
    } else {
        showToast("No coordinates are available for this selection.");
    }
}

function resetExplorerMap() {
    if (!map) return;
    map.flyTo([18, 0], 2, { duration: .8 });
    mapResult.textContent = "Global map view. Any selected location remains in the details panel.";
}

function renderCountrySuggestions(query) {
    const input = document.getElementById("countrySearch");
    const list = document.getElementById("countrySuggestions");
    const normalized = normalizePlaceName(query);
    if (!countryCatalog) return;
    if (!normalized) {
        showSuggestionMessage(list, input, "Type a country or territory name, or its ISO code.");
        return;
    }
    const matches = countryCatalog.filter(country => {
        const searchValue = `${countryName(country)} ${country.cca2} ${country.cca3} ${(country.altSpellings || []).join(" ")}`;
        return normalizePlaceName(searchValue).includes(normalized);
    }).slice(0, 12);
    if (!matches.length) {
        showSuggestionMessage(list, input, "No countries match that search.");
        return;
    }
    list.replaceChildren();
    matches.forEach((country, index) => createSuggestionButton(
        list,
        input,
        index,
        countryName(country),
        `${country.cca2} · ${country.region || "Region not available"}`,
        () => selectExplorerCountry(country),
        country.flag || ""
    ));
    list.hidden = false;
    setComboboxExpanded(input, true);
}

function setExplorerCountry(country, centerOnCountry) {
    selectedExplorerCountry = country;
    selectedExplorerAdmin1 = null;
    selectedExplorerAdmin2 = null;
    document.getElementById("countrySearch").value = countryName(country);
    document.getElementById("selectedCountryCode").textContent = country.cca2 || "";
    const admin1 = document.getElementById("admin1Search");
    const admin2 = document.getElementById("admin2Search");
    const admin3 = document.getElementById("admin3Search");
    admin1.disabled = false;
    admin1.value = "";
    admin1.placeholder = country.cca2 === "BD" ? "Search Bangladesh divisions" : "Search first-level divisions";
    admin2.disabled = true;
    admin2.value = "";
    admin2.placeholder = country.cca2 === "BD" ? "Choose a division" : "Choose a parent division";
    admin3.disabled = true;
    admin3.value = "";
    admin3.placeholder = "Choose a parent location";
    ["admin1Suggestions", "admin2Suggestions", "admin3Suggestions"].forEach(id => {
        const list = document.getElementById(id);
        list.hidden = true;
        list.replaceChildren();
    });
    [admin1, admin2, admin3].forEach(input => setComboboxExpanded(input, false));
    if (centerOnCountry) {
        const centerIsValid = Array.isArray(country.latlng)
            && country.latlng.length === 2
            && country.latlng.every(Number.isFinite)
            && !(country.latlng[0] === 0 && country.latlng[1] === 0);
        const center = centerIsValid ? country.latlng : null;
        renderGeoLocation({
            name: countryName(country),
            level: "Country",
            country: countryName(country),
            countryCode: country.cca2,
            parent: "Not applicable",
            latitude: center?.[0] ?? null,
            longitude: center?.[1] ?? null,
            extent: null,
            adminLevel: null,
            isAdministrativeBoundary: false,
            source: "world-countries 5.1.0 (ODbL)",
            quality: center ? "Approximate country center from country dataset" : "Coordinates not available",
            geometry: "Country center point only; no boundary geometry bundled",
            manual: true
        });
    }
}

function selectExplorerCountry(country) {
    setExplorerCountry(country, true);
    setGeoStatus("Country selected manually. Search its divisions, or use the global place search above.");
    document.getElementById("countrySuggestions").hidden = true;
}

function updateCountryFromLocation(location) {
    const code = location.countryCode;
    const country = countryByCode(code) || (code ? { name: { common: location.country }, cca2: code, flag: "", latlng: null } : null);
    if (!country) return;
    if (selectedExplorerCountry?.cca2 !== country.cca2) setExplorerCountry(country, false);
    document.getElementById("countrySearch").value = countryName(country);
    document.getElementById("selectedCountryCode").textContent = country.cca2;
}

function renderPhotonSuggestions(input, list, features, onSelect) {
    if (!features.length) {
        showSuggestionMessage(list, input, "No matching places were returned. Try a longer or country-qualified name.");
        return;
    }
    list.replaceChildren();
    features.forEach((feature, index) => {
        const location = photonLocation(feature);
        const country = countryByCode(location.countryCode);
        const meta = [location.level, location.country, location.parent !== "Not available" ? location.parent : ""]
            .filter(Boolean).join(" · ");
        createSuggestionButton(list, input, index, location.name, meta, () => onSelect(feature), country?.flag || "");
    });
    list.hidden = false;
    setComboboxExpanded(input, true);
}

function selectPhotonLocation(feature, hierarchyLevel = "global") {
    const location = photonLocation(feature);
    updateCountryFromLocation(location);
    if (hierarchyLevel === "admin1") {
        selectedExplorerAdmin1 = location;
        selectedExplorerAdmin2 = null;
        document.getElementById("admin2Search").disabled = false;
        document.getElementById("admin2Search").placeholder = "Search within this division";
        document.getElementById("admin2Search").value = "";
        document.getElementById("admin3Search").disabled = true;
        document.getElementById("admin3Search").value = "";
    } else if (hierarchyLevel === "admin2") {
        selectedExplorerAdmin2 = location;
        document.getElementById("admin3Search").disabled = false;
        document.getElementById("admin3Search").placeholder = "Search cities or localities here";
        document.getElementById("admin3Search").value = "";
    } else if (hierarchyLevel === "admin3") {
        selectedExplorerAdmin2 = selectedExplorerAdmin2 || selectedExplorerAdmin1;
    } else {
        selectedExplorerAdmin1 = null;
        selectedExplorerAdmin2 = null;
        document.getElementById("admin1Search").value = "";
        document.getElementById("admin2Search").value = "";
        document.getElementById("admin3Search").value = "";
        document.getElementById("admin1Search").disabled = !selectedExplorerCountry;
        document.getElementById("admin2Search").disabled = true;
        document.getElementById("admin3Search").disabled = true;
    }
    renderGeoLocation(location);
    setGeoStatus("Place selected manually from Photon / OpenStreetMap results. No phone or GPS location was used.");
}

function clearAdminBelow(level) {
    if (level <= 1) {
        selectedExplorerAdmin1 = null;
        selectedExplorerAdmin2 = null;
        document.getElementById("admin2Search").value = "";
        document.getElementById("admin2Search").disabled = true;
        document.getElementById("admin3Search").value = "";
        document.getElementById("admin3Search").disabled = true;
    } else if (level === 2) {
        selectedExplorerAdmin2 = null;
        document.getElementById("admin3Search").value = "";
        document.getElementById("admin3Search").disabled = true;
    }
}

function createLocalBangladeshLocation(name, level, parent) {
    return {
        name,
        level,
        country: "Bangladesh",
        countryCode: "BD",
        parent: parent || "Not available",
        latitude: null,
        longitude: null,
        extent: null,
        adminLevel: null,
        isAdministrativeBoundary: false,
        source: "Bundled Bangladesh division and district list",
        quality: "Coordinates not provided by the bundled directory",
        geometry: "No boundary geometry bundled",
        manual: true,
        local: true,
        localKey: level === "Division" ? name : parent.replace(/ Division$/i, "")
    };
}

async function enrichLocalBangladeshLocation(location) {
    setGeoStatus("Looking for an approximate OpenStreetMap point for this manually selected Bangladesh location…", true);
    renderGeoLocation(location);
    const layers = location.level === "Division" ? ["state", "county"] : ["county", "district"];
    const query = [location.name, location.parent, "Bangladesh"].filter(value => value && value !== "Not available").join(", ");
    try {
        const features = await searchPhoton(query, { countryCode: "BD", layers });
        if (selectedExplorerLocation !== location) return;
        const feature = features.find(item => {
            const result = photonLocation(item);
            const normalizedResult = normalizePlaceName(result.name);
            const normalizedName = normalizePlaceName(location.name);
            const suffixes = location.level === "Division"
                ? [" division", " region", " province", " state"]
                : [" district", " county"];
            const nameMatches = normalizedResult === normalizedName
                || suffixes.some(suffix => normalizedResult === `${normalizedName}${suffix}`);
            return nameMatches
                && (!result.countryCode || result.countryCode === "BD");
        });
        if (feature) {
            const resolved = photonLocation(feature);
            Object.assign(location, resolved, {
                level: location.level,
                parent: location.parent,
                source: "Bundled Bangladesh directory + OpenStreetMap via Photon",
                quality: "Approximate geocoded point; not a live/device location"
            });
            renderGeoLocation(location);
            setGeoStatus("Approximate OSM point found. This result is not a verified district boundary.");
        } else {
            renderGeoLocation(location);
            setGeoStatus("The selected place is in the bundled Bangladesh directory; Photon returned no exact-name map point.");
        }
    } catch (error) {
        if (error.name === "AbortError" || selectedExplorerLocation !== location) return;
        renderGeoLocation(location);
        setGeoStatus(`${error.message} The local Bangladesh selection is still available without map coordinates.`);
    }
}

function selectLocalBangladeshDivision(name) {
    const location = createLocalBangladeshLocation(name, "Division", "Bangladesh");
    selectedExplorerAdmin1 = location;
    selectedExplorerAdmin2 = null;
    document.getElementById("admin2Search").disabled = false;
    document.getElementById("admin2Search").placeholder = "Search districts in this division";
    document.getElementById("admin2Search").value = "";
    document.getElementById("admin3Search").disabled = true;
    document.getElementById("admin3Search").value = "";
    enrichLocalBangladeshLocation(location);
}

function selectLocalBangladeshDistrict(name) {
    const division = selectedExplorerAdmin1?.localKey || selectedExplorerAdmin1?.name.replace(/ Division$/i, "");
    const location = createLocalBangladeshLocation(name, "District", `${division} Division`);
    selectedExplorerAdmin2 = location;
    document.getElementById("admin3Search").disabled = false;
    document.getElementById("admin3Search").placeholder = `Search cities or localities in ${name}`;
    document.getElementById("admin3Search").value = "";
    enrichLocalBangladeshLocation(location);
}

function renderLocalOptions(input, list, values, level, onSelect) {
    const query = normalizePlaceName(input.value);
    const matches = values.filter(name => normalizePlaceName(name).includes(query)).slice(0, 12);
    if (!matches.length) {
        showSuggestionMessage(list, input, "No matching entries in the bundled Bangladesh directory.");
        return;
    }
    list.replaceChildren();
    matches.forEach((name, index) => createSuggestionButton(
        list,
        input,
        index,
        name,
        `${level} · Bangladesh${level === "District" && selectedExplorerAdmin1 ? ` · ${selectedExplorerAdmin1.localKey || selectedExplorerAdmin1.name.replace(/ Division$/i, "")} Division` : ""}`,
        () => onSelect(name),
        "🇧🇩"
    ));
    list.hidden = false;
    setComboboxExpanded(input, true);
}

function schedulePhotonSuggestions(input, list, layer, onSelect) {
    const query = input.value.trim();
    const country = selectedExplorerCountry;
    if (!country) {
        showSuggestionMessage(list, input, "Choose a country first.");
        return;
    }
    if (query.length < 2) {
        showSuggestionMessage(list, input, "Type at least two characters to search this administrative level.");
        return;
    }

    const parent = layer === "admin2" ? selectedExplorerAdmin1 : layer === "admin3" ? selectedExplorerAdmin2 || selectedExplorerAdmin1 : null;
    const context = [query, parent?.name, layer === "admin1" ? "" : countryName(country)].filter(Boolean).join(", ");
    const layers = layer === "admin1" ? ["state", "county"] : layer === "admin2" ? ["county", "district", "city"] : ["city", "district", "locality"];
    const extent = parent?.extent || (layer === "admin2" ? selectedExplorerAdmin1?.extent : null);
    const timerKey = `geo-${layer}`;
    window.clearTimeout(explorerDebounceTimers.get(timerKey));
    showSuggestionMessage(list, input, "Searching OpenStreetMap place data…", "is-loading");
    explorerDebounceTimers.set(timerKey, window.setTimeout(async () => {
        try {
            const features = await searchPhoton(context, { countryCode: country.cca2, layers, extent });
            if (input.value.trim() !== query || selectedExplorerCountry?.cca2 !== country.cca2) return;
            renderPhotonSuggestions(input, list, features, feature => onSelect(feature, layer));
            if (!features.length) setGeoStatus(`No ${layer === "admin1" ? "first-level divisions" : "matching child places"} found for ${countryName(country)}.`);
        } catch (error) {
            if (error.name === "AbortError") return;
            showSuggestionMessage(list, input, error.message || "Geographic search is unavailable.");
            setGeoStatus(error.message || "Geographic search is unavailable.");
        }
    }, 450));
}

function scheduleGlobalSuggestions(input, list, delay = 450) {
    const query = input.value.trim();
    const timerKey = "geo-global";
    window.clearTimeout(explorerDebounceTimers.get(timerKey));
    if (query.length < 2) {
        list.hidden = true;
        setComboboxExpanded(input, false);
        return;
    }
    showSuggestionMessage(list, input, "Searching places worldwide…", "is-loading");
    explorerDebounceTimers.set(timerKey, window.setTimeout(async () => {
        try {
            const features = await searchPhoton(query);
            if (input.value.trim() !== query) return;
            renderPhotonSuggestions(input, list, features, feature => selectPhotonLocation(feature));
            if (!features.length) setGeoStatus("No matches found. Try adding a country name to narrow the search.");
        } catch (error) {
            if (error.name === "AbortError") return;
            showSuggestionMessage(list, input, error.message || "Geographic search is unavailable.");
            setGeoStatus(error.message || "Geographic search is unavailable.");
        }
    }, delay));
}

function initializeGeoExplorer() {
    const countryInput = document.getElementById("countrySearch");
    const countrySuggestions = document.getElementById("countrySuggestions");
    const globalInput = document.getElementById("globalPlaceSearch");
    const globalSuggestions = document.getElementById("globalPlaceSuggestions");
    const admin1 = document.getElementById("admin1Search");
    const admin2 = document.getElementById("admin2Search");
    const admin3 = document.getElementById("admin3Search");
    const divisionNames = Object.keys(DISTRICTS).sort((first, second) => first.localeCompare(second));

    [
        [countryInput, countrySuggestions],
        [globalInput, globalSuggestions],
        [admin1, document.getElementById("admin1Suggestions")],
        [admin2, document.getElementById("admin2Suggestions")],
        [admin3, document.getElementById("admin3Suggestions")]
    ].forEach(([input, list]) => enableComboboxKeyboard(input, list));

    countryInput.addEventListener("focus", async () => {
        showSuggestionMessage(countrySuggestions, countryInput, "Loading country and territory names…", "is-loading");
        try {
            const countries = await loadCountryCatalog();
            document.getElementById("countryCountBadge").textContent = `${countries.length} COUNTRIES / TERRITORIES`;
            renderCountrySuggestions(countryInput.value);
        } catch {
            showSuggestionMessage(countrySuggestions, countryInput, "Country data could not load. Global place search is still available.");
            setGeoStatus("Country catalog unavailable; check your internet connection and try again.");
        }
    });
    countryInput.addEventListener("input", async () => {
        if (selectedExplorerCountry && normalizePlaceName(countryInput.value) !== normalizePlaceName(countryName(selectedExplorerCountry))) {
            selectedExplorerCountry = null;
            selectedExplorerAdmin1 = null;
            selectedExplorerAdmin2 = null;
            selectedExplorerLocation = null;
            if (explorerMarker && map) map.removeLayer(explorerMarker);
            explorerMarker = null;
            document.getElementById("selectedCountryCode").textContent = "";
            [admin1, admin2, admin3].forEach(input => {
                input.value = "";
                input.disabled = true;
            });
            renderGeoPlaceholder("Choose a country or place", "Country changes clear the previous administrative selections.");
        }
        try {
            await loadCountryCatalog();
            renderCountrySuggestions(countryInput.value);
        } catch {
            showSuggestionMessage(countrySuggestions, countryInput, "Country data could not load. Global place search remains available.");
        }
    });

    globalInput.addEventListener("input", () => scheduleGlobalSuggestions(globalInput, globalSuggestions));
    document.getElementById("globalPlaceForm").addEventListener("submit", event => {
        event.preventDefault();
        window.clearTimeout(explorerDebounceTimers.get("geo-global"));
        scheduleGlobalSuggestions(globalInput, globalSuggestions, 0);
        if (globalInput.value.trim().length < 2) setGeoStatus("Enter at least two characters to search places.");
    });

    admin1.addEventListener("input", () => {
        const list = document.getElementById("admin1Suggestions");
        clearAdminBelow(1);
        if (selectedExplorerCountry?.cca2 === "BD") {
            if (admin1.value.trim().length < 1) {
                showSuggestionMessage(list, admin1, "Search one of Bangladesh's 8 divisions.");
            } else {
                renderLocalOptions(admin1, list, divisionNames, "Division", selectLocalBangladeshDivision);
            }
            return;
        }
        schedulePhotonSuggestions(admin1, list, "admin1", selectPhotonLocation);
    });
    admin2.addEventListener("input", () => {
        const list = document.getElementById("admin2Suggestions");
        clearAdminBelow(2);
        if (selectedExplorerCountry?.cca2 === "BD" && selectedExplorerAdmin1?.local) {
            const names = DISTRICTS[selectedExplorerAdmin1.localKey] || [];
            if (admin2.value.trim().length < 1) {
                showSuggestionMessage(list, admin2, `Search districts in ${selectedExplorerAdmin1.name} Division.`);
            } else {
                renderLocalOptions(admin2, list, names, "District", selectLocalBangladeshDistrict);
            }
            return;
        }
        schedulePhotonSuggestions(admin2, list, "admin2", selectPhotonLocation);
    });
    admin3.addEventListener("input", () => schedulePhotonSuggestions(admin3, document.getElementById("admin3Suggestions"), "admin3", selectPhotonLocation));
    document.getElementById("fitGeoLocationBtn").addEventListener("click", fitExplorerLocation);
    document.getElementById("resetGeoMapBtn").addEventListener("click", resetExplorerMap);
}

function showGpsCoordinates(position) {
    const { latitude, longitude, accuracy } = position.coords;
    gpsResult.replaceChildren();
    const heading = document.createElement("p");
    heading.textContent = "This device shared:";
    const coordinates = document.createElement("p");
    coordinates.textContent = `Latitude ${latitude.toFixed(6)}, longitude ${longitude.toFixed(6)}`;
    const accuracyLine = document.createElement("p");
    accuracyLine.textContent = `Reported GPS accuracy: approximately ${Math.round(accuracy)} m`;
    const link = document.createElement("a");
    link.href = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=16/${latitude}/${longitude}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open coordinates in OpenStreetMap";
    gpsResult.append(heading, coordinates, accuracyLine, link);
}

function requestLocation() {
    if (!navigator.geolocation) {
        gpsResult.textContent = "This browser does not support device geolocation.";
        return;
    }

    if (!gpsMarker && map) {
        preGpsView = { center: map.getCenter(), zoom: map.getZoom() };
        preGpsMapMessage = mapResult.textContent;
    }
    shareLocationBtn.disabled = true;
    shareLocationBtn.classList.add("is-loading");
    shareLocationBtn.replaceChildren(createIcon("loader-circle"), document.createTextNode(" Waiting for permission"));
    refreshIcons();
    gpsResult.textContent = "Waiting for your browser's location permission...";

    navigator.geolocation.getCurrentPosition(position => {
        releaseLocationButton();
        showGpsCoordinates(position);
        clearLocationBtn.disabled = false;
        if (map && window.L) {
            const point = [position.coords.latitude, position.coords.longitude];
            if (gpsMarker) map.removeLayer(gpsMarker);
            gpsMarker = L.marker(point, { icon: createMapMarkerIcon(true) }).addTo(map);
            gpsMarker.bindPopup("Location shared by this device");
            map.flyTo(point, 15, { duration: 1.1 });
            gpsMarker.openPopup();
            mapResult.textContent = "Showing the location shared by this device. This coordinate is not connected to a phone number.";
        } else {
            gpsResult.append(document.createTextNode(" The map library is unavailable, but the coordinates were not uploaded."));
        }
        showToast("Your device location is shown on this map only.");
    }, error => {
        releaseLocationButton();
        const messages = {
            1: "Location permission was denied. You can change this in your browser's site settings.",
            2: "Your device could not determine a location. Try again where GPS or network positioning is available.",
            3: "The location request timed out. Check reception and try again."
        };
        gpsResult.textContent = messages[error.code] || "The device location is unavailable.";
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

function releaseLocationButton() {
    shareLocationBtn.disabled = false;
    shareLocationBtn.classList.remove("is-loading");
    shareLocationBtn.replaceChildren(createIcon("locate-fixed"), document.createTextNode(" Share my location"));
    refreshIcons();
}

function clearSharedLocation() {
    if (gpsMarker && map) map.removeLayer(gpsMarker);
    gpsMarker = null;
    clearLocationBtn.disabled = true;
    gpsResult.textContent = "Location cleared from this page. It was never saved or uploaded.";
    if (map && preGpsView) {
        map.flyTo(preGpsView.center, preGpsView.zoom, { duration: .8 });
        mapResult.textContent = preGpsMapMessage;
    }
    preGpsView = null;
}

function openPrivacyDialog(dialog, trigger) {
    if (dialog.open) return;

    privacyReturnFocus = trigger;
    document.body.classList.add("privacy-modal-open");
    dialog.showModal();
    document.getElementById("privacyDialogContent").scrollTop = 0;
    setCurrentPrivacyStep("privacy-step-1");
}

function closePrivacyDialog(dialog) {
    if (!dialog.open || dialog.classList.contains("is-closing")) return;

    dialog.classList.add("is-closing");
    privacyCloseTimer = window.setTimeout(() => {
        if (dialog.open) dialog.close();
    }, 170);
}

function setCurrentPrivacyStep(stepId) {
    document.querySelectorAll(".privacy-step-nav [data-step-target]").forEach(button => {
        if (button.dataset.stepTarget === stepId) {
            button.setAttribute("aria-current", "step");
        } else {
            button.removeAttribute("aria-current");
        }
    });
}

function initializePrivacyDialog() {
    const dialog = document.getElementById("privacyDialog");
    const trigger = document.getElementById("openPrivacyDialog");
    const closeButton = document.getElementById("closePrivacyDialog");
    const content = document.getElementById("privacyDialogContent");
    const stepButtons = [...dialog.querySelectorAll("[data-step-target]")];

    trigger.addEventListener("click", () => openPrivacyDialog(dialog, trigger));
    closeButton.addEventListener("click", () => closePrivacyDialog(dialog));
    dialog.querySelectorAll("[data-close-privacy]").forEach(button => {
        button.addEventListener("click", () => closePrivacyDialog(dialog));
    });

    dialog.addEventListener("cancel", event => {
        event.preventDefault();
        closePrivacyDialog(dialog);
    });
    dialog.addEventListener("click", event => {
        if (event.target === dialog) closePrivacyDialog(dialog);
    });
    dialog.addEventListener("close", () => {
        window.clearTimeout(privacyCloseTimer);
        dialog.classList.remove("is-closing");
        document.body.classList.remove("privacy-modal-open");
        if (privacyReturnFocus?.isConnected) privacyReturnFocus.focus();
        privacyReturnFocus = null;
    });
    dialog.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            event.preventDefault();
            closePrivacyDialog(dialog);
            return;
        }
        if (event.key !== "Tab") return;
        const focusable = [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
            .filter(element => element.getClientRects().length > 0);
        if (!focusable.length) {
            event.preventDefault();
            dialog.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    });

    stepButtons.forEach(button => {
        button.addEventListener("click", () => {
            const target = document.getElementById(button.dataset.stepTarget);
            if (!target) return;
            target.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                block: "start"
            });
            setCurrentPrivacyStep(target.id);
        });
    });

}

function initializeApp() {
    initializeMap();
    initializeGeoExplorer();
    renderHistory();
    refreshIcons();
    initializePrivacyDialog();

    phoneForm.addEventListener("submit", event => {
        event.preventDefault();
        performLookup(phoneInput.value);
    });
    phoneInput.addEventListener("input", () => {
        if (phoneError.textContent) setPhoneError("");
    });
    document.getElementById("clearSearchBtn").addEventListener("click", () => {
        phoneInput.value = "";
        setPhoneError("");
        phoneResult.className = "result-panel empty-state";
        const emptyIcon = document.createElement("span");
        emptyIcon.className = "empty-icon";
        emptyIcon.append(createIcon("scan"));
        const emptyCopy = document.createElement("div");
        const emptyHeading = document.createElement("h3");
        emptyHeading.textContent = "Ready when you are";
        const emptyDescription = document.createElement("p");
        emptyDescription.textContent = "Enter an international number above to see its validated format and numbering region.";
        emptyCopy.append(emptyHeading, emptyDescription);
        phoneResult.replaceChildren(emptyIcon, emptyCopy);
        if (!gpsMarker && countryMarker && map) {
            map.removeLayer(countryMarker);
            countryMarker = null;
            map.flyTo(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom, { duration: .6 });
            mapResult.textContent = "Search a number, choose a place, or share your location.";
        }
        refreshIcons();
        phoneInput.focus();
    });
    document.getElementById("clearHistoryBtn").addEventListener("click", () => {
        try { window.localStorage.removeItem(HISTORY_KEY); } catch { /* Storage may be blocked by the browser. */ }
        renderHistory();
        showToast("Recent checks cleared from this browser.");
    });
    document.getElementById("resetMapBtn").addEventListener("click", resetMapView);
    shareLocationBtn.addEventListener("click", requestLocation);
    clearLocationBtn.addEventListener("click", clearSharedLocation);
    phoneResult.addEventListener("click", async event => {
        const button = event.target.closest("[data-copy]");
        if (!button) return;
        try {
            await navigator.clipboard.writeText(button.dataset.copy);
            showToast("Copied to clipboard.");
        } catch {
            showToast("Clipboard access is unavailable in this browser.");
        }
    });

    const menuToggle = document.getElementById("menuToggle");
    const primaryNav = document.getElementById("primaryNav");
    menuToggle.addEventListener("click", () => {
        const open = primaryNav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        menuToggle.replaceChildren(createIcon(open ? "x" : "menu"));
        refreshIcons();
    });
    primaryNav.addEventListener("click", event => {
        if (event.target.closest("a")) {
            primaryNav.classList.remove("is-open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Open navigation");
            menuToggle.replaceChildren(createIcon("menu"));
            refreshIcons();
        }
    });

    document.addEventListener("contextmenu", event => {
        if (event.target instanceof Element && event.target.closest(".brand-mark, .eyebrow, .step-label, .hero-rule, .heading-icon, .count-badge")) {
            event.preventDefault();
        }
    });
}

document.addEventListener("DOMContentLoaded", initializeApp);
