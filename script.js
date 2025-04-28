// script.js

document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Replace with your actual VM IP address
    const API_BASE_URL = 'http://192.168.100.246:8000'; // CHANGE THIS to your VM's IP and port

    // Get the pathname to identify the current page
    const pathname = document.location.pathname; // <-- Keep this declaration

    // Variable to hold the Chart.js instance (used on the graphs page)
    let temperatureChartInstance = null;

    // Function to format timestamp for display (reused across pages)
    function formatTimestamp(isoString) {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
            // Example: Apr 14, 2025, 12:35:10 AM (adjust to local timezone display)
            return date.toLocaleString();
        } catch (e) {
            console.error("Error formatting timestamp:", isoString, e);
            return 'Invalid Date';
        }
    }

    // Function to convert ISO string to Date object (useful for Chart.js time scale)
    function parseISOTimestamp(isoString) {
        if (!isoString) return null;
        try {
            return new Date(isoString);
        } catch (e) {
            console.error("Failed to parse timestamp:", isoString, e);
            return null;
        }
    }


    // --- Functions for Temperature Readings Page (/temperatures) ---

    function updateTemperatures() {
        const tbody = document.getElementById('temp-table-body');
        const temperatureDataDiv = document.getElementById('temperature-data'); // Get parent div for loading class
        if (!tbody || !temperatureDataDiv) {
            console.log("updateTemperatures called, but required elements not found.");
            return; // Only run on temperatures.html if the div and tbody are present
        }
        console.log("updateTemperatures called. Fetching data from /status..."); // Log when fetching starts

        // Show loading indicator
        temperatureDataDiv.classList.add('loading');

        // This fetches temperature, solar, and settings data in one call
        // Assumes /status endpoint is NOT under /api based on previous code
        fetch(`${API_BASE_URL}/status`)
            .then(response => {
                console.log("Fetch response received.", response); // Log response
                if (!response.ok) {
                    console.error(`HTTP error! Status: ${response.status}`, response); // Log error response
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Data received from /status:", data); // Log the received data

                // --- Update Temperature Table ---
                tbody.innerHTML = ''; // Clear previous data
                if (data.temperatures && Array.isArray(data.temperatures) && data.temperatures.length > 0) {
                    console.log(`Populating temperature table with ${data.temperatures.length} readings.`); // Log data count
                    data.temperatures.forEach(reading => {
                        // console.log("Processing reading:", reading); // Optional: Log each reading
                        const row = tbody.insertRow();
                        try { // Add a try-catch around row population to catch errors per row
                            row.insertCell().textContent = reading.sensor_id || 'N/A';
                            row.insertCell().textContent = reading.sensor_name || 'N/A';
                            // Use != null check which covers both null and undefined
                            row.insertCell().textContent = reading.temperature != null ?
                                reading.temperature.toFixed(2) + '°C' : 'N/A';
                            row.insertCell().textContent = reading.sensor_type || 'N/A';

                            // Battery level cell - more robust check and formatting
                            const batteryCell = row.insertCell();
                            if (reading.battery_level != null && typeof reading.battery_level === 'number') {
                                batteryCell.textContent = `${(reading.battery_level * 100).toFixed(1)}%`; // Convert to percentage
                            } else {
                                batteryCell.textContent = 'N/A';
                            }

                            row.insertCell().textContent = formatTimestamp(reading.timestamp);
                            // console.log("Temperature row added successfully."); // Optional: Log success for each row
                        } catch (e) {
                            console.error("Error populating row for reading:", reading, e); // Log error if row fails
                            // Optionally add a placeholder row indicating the error
                            const errorRow = tbody.insertCell(); // Use insertCell for a single cell spanning columns
                            errorRow.colSpan = 6; // Span across all columns
                            errorRow.classList.add('error');
                            errorRow.textContent = 'Error displaying data for one reading. See console.';

                        }
                    });
                } else {
                    console.log("No temperature data available in the /status response or data format is unexpected."); // Log if array is empty or not array
                    tbody.innerHTML = '<tr><td colspan="6">No temperature data available.</td></tr>'; // Message if no data
                }
            })
            .catch(error => {
                console.error('Error fetching temperature data:', error);
                // Also update the tbody with an error message
                tbody.innerHTML = `<tr><td colspan="6" class="error">Error loading data: ${error.message}</td></tr>`;
                temperatureDataDiv.classList.add('error'); // Add error class for potential CSS styling
            })
             .finally(() => {
                 temperatureDataDiv.classList.remove('loading'); // Hide loading indicator regardless of success/failure
                 console.log("Temperature data population finished."); // Log finish
             });
    }


    // --- Functions for Settings Page (/settings) ---

    // Helper function to update status indicator color/class
    function updateStatusIndicator(elementId, statusValue) {
        const indicator = document.getElementById(elementId);
        if (indicator) {
            indicator.classList.remove('on', 'off', 'unknown'); // Remove all states first
             if (statusValue === true) {
                 indicator.classList.add('on');
                 // Update title on hover, keeping the original label part
                 const originalTitle = indicator.title.split(':')[0]; // Get text before first colon
                 indicator.title = originalTitle + ': ON';
             } else if (statusValue === false) {
                 indicator.classList.add('off');
                 const originalTitle = indicator.title.split(':')[0];
                  indicator.title = originalTitle + ': OFF';
             } else {
                 indicator.classList.add('unknown'); // Handle null or undefined status
                 const originalTitle = indicator.title.split(':')[0];
                  indicator.title = originalTitle + ': Unknown';
             }
        } else {
            console.warn(`Status indicator element not found: ${elementId}`);
        }
    }

     // Helper function to update speed display span
     function updateSpeedDisplay(elementId, speedValue) {
         const speedSpan = document.getElementById(elementId);
         if (speedSpan) {
             speedSpan.textContent = speedValue != null ? speedValue : 'N/A';
         } else {
             console.warn(`Speed display element not found: ${elementId}`);
         }
     }


    // Function to fetch and update ONLY status indicators and non-controllable speeds on the settings page
    // This is separate from fetching/populating the editable form data
    async function updateSettingsStatusIndicators() {
        console.log("Fetching ONLY status and non-controllable speed data from /status...");
        // Assumes /status endpoint is NOT under /api based on previous code
        try {
            const statusResponse = await fetch(`${API_BASE_URL}/status`);
             if (!statusResponse.ok) {
                 console.error(`HTTP error fetching status! Status: ${statusResponse.status}`, statusResponse);
                 // Don't throw here, just log error and let indicators stay as they are
                 return; // Stop execution if fetch fails
            }
            const statusData = await statusResponse.json();
            console.log("Live status data received from /status:", statusData);

            // --- Populate Status Indicators and Non-Controllable Speeds ---
             if (statusData && statusData.current_settings) {
                  const currentSettingsWithStatus = statusData.current_settings; // This object includes status and all speeds

                  // Block 1
                  updateSpeedDisplay('fan1-speed-display', currentSettingsWithStatus.fan_1_speed_percent);
                  updateStatusIndicator('block1-fan1-status', currentSettingsWithStatus.fan_1_status);
                  updateStatusIndicator('block1-fan4-status', currentSettingsWithStatus.fan_4_status); // Status for controllable Fan 4
                  updateStatusIndicator('block1-pump1-status', currentSettingsWithStatus.pump_1_status);
                  updateStatusIndicator('block1-peltier1-status', currentSettingsWithStatus.peltier_1_status);

                  // Block 2
                  updateSpeedDisplay('fan3-speed-display', currentSettingsWithStatus.fan_3_speed_percent);
                  updateStatusIndicator('block2-fan3-status', currentSettingsWithStatus.fan_3_status);
                  updateStatusIndicator('block2-fan2-status', currentSettingsWithStatus.fan_2_status); // Status for controllable Fan 2
                  updateStatusIndicator('block2-pump2-status', currentSettingsWithStatus.pump_2_status);
                  updateStatusIndicator('block2-peltier2-status', currentSettingsWithStatus.peltier_2_status);

                  // Note: Controllable fan speeds (Fan 4, Fan 2) and other editable fields
                  // are only populated on initial load from /api/settings
                  // and updated on PATCH success. They are NOT updated by this status-only fetch.

             } else {
                  console.warn("Status data (current_settings) is missing or empty in the /status response.");
                  // Set all indicators to unknown if status data is missing
                   updateStatusIndicator('block1-fan1-status', null); updateStatusIndicator('block1-fan4-status', null);
                   updateStatusIndicator('block1-pump1-status', null); updateStatusIndicator('block1-peltier1-status', null);
                   updateStatusIndicator('block2-fan3-status', null); updateStatusIndicator('block2-fan2-status', null);
                   updateStatusIndicator('block2-pump2-status', null); updateStatusIndicator('block2-peltier2-status', null);

                   // Set non-controllable speeds to N/A
                   updateSpeedDisplay('fan1-speed-display', null);
                   updateSpeedDisplay('fan3-speed-display', null);

             }

        } catch (error) {
             console.error('Error in updateSettingsStatusIndicators:', error);
             // Indicators and speeds will remain in their previous state or 'N/A'/'unknown' if initial load failed
        }
    }


    // Function to fetch and update ALL settings page content (form and status) - called on initial load
    async function initializeSettingsPage() {
        const settingsEditorDiv = document.getElementById('settings-editor'); // Main container
        const settingsFormDiv = document.getElementById('settings-form'); // Div containing the form elements
        const loadingMessage = document.getElementById('loading-message'); // Initial loading message element
        const loadingErrorMessage = document.getElementById('loading-error-message'); // Area for initial loading errors
        const settingsUpdatedSpan = document.getElementById('settings-updated'); // Last updated timestamp display


        // Check if required elements exist on this page
        if (!settingsEditorDiv || !settingsFormDiv || !loadingMessage || !loadingErrorMessage || !settingsUpdatedSpan) {
            console.log("initializeSettingsPage called, but required elements for settings page not found.");
            return; // If the page structure is not as expected, just return
        }

        console.log("initializeSettingsPage called. Fetching data...");
        loadingErrorMessage.textContent = ''; // Clear previous errors
        loadingMessage.style.display = 'block'; // Show "Loading settings data..."
        settingsEditorDiv.classList.add('loading'); // Add loading class for potential CSS styling
        settingsFormDiv.style.display = 'none'; // Hide form while loading

        try {
            // --- Fetch Editable Settings (and all other settings fields including reporting speeds and status) ---
            // Fetching from /api/settings gives us the full Settings object from the DB
            console.log("Fetching full settings object from /api/settings for initial form and status population...");
            const settingsResponse = await fetch(`${API_BASE_URL}/api/settings`);
            if (!settingsResponse.ok) {
                console.error(`HTTP error fetching settings! Status: ${settingsResponse.status}`, settingsResponse);
                throw new Error(`HTTP error fetching settings: ${settingsResponse.status}`);
            }
            // This `settings` object contains ALL fields from the Settings schema, including status and reporting speeds
            const settings = await settingsResponse.json();
            console.log("Full settings object received from /api/settings:", settings);


            // --- Populate Form Fields (editable) and Display Fields (reporting speeds) ---
            if (settings) {
                 // Populate editable inputs
                 document.getElementById('setpoint-input').value = settings.temperature_setpoint != null ? settings.temperature_setpoint : '';
                 document.getElementById('timer-on-input').value = settings.ac_timer_on || ''; // ac_timer_on will be a string like "07:00:00"
                 document.getElementById('timer-off-input').value = settings.ac_timer_off || '';

                 // Populate controllable speed sliders and update their value displays
                 const fan4Slider = document.getElementById('fan4-speed-input');
                 const fan4ValueSpan = document.getElementById('fan4-speed-value');
                 if (fan4Slider) {
                      fan4Slider.value = settings.fan_4_speed_percent != null ? settings.fan_4_speed_percent : 50; // Default to 50 if null
                      if(fan4ValueSpan) fan4ValueSpan.textContent = fan4Slider.value; // Update span text
                 } else { console.warn("Fan 4 slider not found."); }


                 const fan2Slider = document.getElementById('fan2-speed-input');
                 const fan2ValueSpan = document.getElementById('fan2-speed-value');
                 if (fan2Slider) {
                     fan2Slider.value = settings.fan_2_speed_percent != null ? settings.fan_2_speed_percent : 50; // Default to 50 if null
                     if(fan2ValueSpan) fan2ValueSpan.textContent = fan2Slider.value; // Update span text
                 } else { console.warn("Fan 2 slider not found."); }


                 // Populate non-controllable speed displays
                 updateSpeedDisplay('fan1-speed-display', settings.fan_1_speed_percent);
                 updateSpeedDisplay('fan3-speed-display', settings.fan_3_speed_percent);


                 settingsUpdatedSpan.textContent = formatTimestamp(settings.updated_at);


                 // --- Populate Status Indicators (from the status fields in the settings object) ---
                 // The /api/settings endpoint returns the full Settings object which includes status now
                 updateStatusIndicator('block1-fan1-status', settings.fan_1_status);
                 updateStatusIndicator('block1-fan4-status', settings.fan_4_status);
                 updateStatusIndicator('block1-pump1-status', settings.pump_1_status);
                 updateStatusIndicator('block1-peltier1-status', settings.peltier_1_status);

                 updateStatusIndicator('block2-fan3-status', settings.fan_3_status);
                 updateStatusIndicator('block2-fan2-status', settings.fan_2_status);
                 updateStatusIndicator('block2-pump2-status', settings.pump_2_status);
                 updateStatusIndicator('block2-peltier2-status', settings.peltier_2_status);


             } else {
                 console.warn("Settings data is missing or empty from /api/settings response for initialization.");
                 loadingErrorMessage.textContent = "No settings found. Default values may be applied on save.";
                 // Set all indicators to unknown and speeds to N/A if settings data is missing
                  updateStatusIndicator('block1-fan1-status', null); updateStatusIndicator('block1-fan4-status', null);
                  updateStatusIndicator('block1-pump1-status', null); updateStatusIndicator('block1-peltier1-status', null);
                  updateStatusIndicator('block2-fan3-status', null); updateStatusIndicator('block2-fan2-status', null);
                  updateStatusIndicator('block2-pump2-status', null); updateStatusIndicator('block2-peltier2-status', null);
                  updateSpeedDisplay('fan1-speed-display', null); updateSpeedDisplay('fan3-speed-display', null);

                  // Set controllable sliders to default and N/A display
                   const fan4Slider = document.getElementById('fan4-speed-input');
                   const fan4ValueSpan = document.getElementById('fan4-speed-value');
                   if(fan4Slider) fan4Slider.value = 50;
                   if(fan4ValueSpan) fan4ValueSpan.textContent = 'N/A';

                   const fan2Slider = document.getElementById('fan2-speed-input');
                   const fan2ValueSpan = document.getElementById('fan2-speed-value');
                    if(fan2Slider) fan2Slider.value = 50;
                    if(fan2ValueSpan) fan2ValueSpan.textContent = 'N/A';
             }


         } catch (error) {
             console.error('Error initializing settings page data:', error);
             loadingErrorMessage.textContent = `Error loading data: ${error.message}`;
             loadingErrorMessage.classList.add('error');
             settingsFormDiv.style.display = 'none'; // Ensure form stays hidden on error

             // Ensure form elements are hidden and loading message is removed on error
              loadingMessage.style.display = 'none';
               settingsEditorDiv.classList.remove('loading');

         } finally {
             settingsEditorDiv.classList.remove('loading'); // Hide loading indicator regardless of success/failure
             loadingMessage.style.display = 'none'; // Hide initial loading message
             // Show form even if only settings loaded but status failed, or vice versa (unless an error occurred)
             if (loadingErrorMessage.textContent === '') { // Only show form if no major loading error
                 settingsFormDiv.style.display = 'block';
             }
             console.log("Settings page initialization finished."); // Log finish
         }
    }

    // --- Function to save settings ---
     function saveSettings() {
        console.log("Save settings button clicked. Initiating save process.");
        const saveButton = document.getElementById('save-settings-button');
        const saveStatusMessage = document.getElementById('save-status-message');
        const settingsUpdatedSpan = document.getElementById('settings-updated');

        // Check if required elements exist
        if (!saveButton || !saveStatusMessage || !settingsUpdatedSpan) {
             console.error("Save settings called, but required button or message elements not found.");
             return;
        }


        // Read values from input fields
        // Use .trim() to remove leading/trailing whitespace from string inputs like time
        const temperature_setpoint_str = document.getElementById('setpoint-input').value.trim();
        const ac_timer_on = document.getElementById('timer-on-input').value.trim(); // Value is HH:MM or HH:MM:SS string
        const ac_timer_off = document.getElementById('timer-off-input').value.trim();
        // Read values from slider inputs - value is a string
        const fan_4_speed_percent_str = document.getElementById('fan4-speed-input').value; // No need to trim range input value
        const fan_2_speed_percent_str = document.getElementById('fan2-speed-input').value;
        // Assume Fan 3 speed is also controlled by a slider if it exists - BUT USER SAID ONLY 4 & 2
        // const fan_3_speed_percent_str = document.getElementById('fan3-speed-input').value;


        // Convert to numbers, checking for empty strings or invalid input
        // If input is empty string, parseFloat/parseInt returns NaN. We want null if schema allows.
        const temperature_setpoint = temperature_setpoint_str === '' ? null : parseFloat(temperature_setpoint_str);
        // Slider values are strings, convert to int
        const fan_4_speed_percent = parseInt(fan_4_speed_percent_str, 10);
        const fan_2_speed_percent = parseInt(fan_2_speed_percent_str, 10);
        // const fan_3_speed_percent = parseInt(fan_3_speed_percent_str, 10);


        // Basic client-side validation (optional but recommended, backend validates too)
        saveStatusMessage.textContent = ''; // Clear previous status messages
        let validationErrors = [];

        if (temperature_setpoint !== null && (isNaN(temperature_setpoint) || temperature_setpoint < -50 || temperature_setpoint > 150)) { // Adjusted range based on potential sensor types
            validationErrors.push("Valid temperature setpoint (-50 to 150).");
        }
        // Validate slider values (should be numbers between 0 and 100 from input type="range")
        // parseInt on range input value should always be a number unless something is very wrong
        // Also check if the corresponding input element exists
        const fan4Input = document.getElementById('fan4-speed-input');
        if (fan4Input) { // Only validate if the input exists on the page
             if (isNaN(fan_4_speed_percent) || fan_4_speed_percent < 0 || fan_4_speed_percent > 100) {
                validationErrors.push("Valid Fan 4 speed (0-100%).");
             }
        }
        const fan2Input = document.getElementById('fan2-speed-input');
         if (fan2Input) { // Only validate if the input exists on the page
            if (isNaN(fan_2_speed_percent) || fan_2_speed_percent < 0 || fan_2_speed_percent > 100) {
               validationErrors.push("Valid Fan 2 speed (0-100%).");
            }
         }
        // Validate Fan 3 if added as controllable
        // const fan3Input = document.getElementById('fan3-speed-input');
        // if (fan3Input) {
        //     if (isNaN(fan_3_speed_percent) || fan_3_speed_percent < 0 || fan_3_speed_percent > 100) {
        //        validationErrors.push("Valid Fan 3 speed (0-100%).");
        //     }
        // }
        // Timer format validation could be added here (e.g., regex for HH:MM:SS format)


        if (validationErrors.length > 0) {
            saveStatusMessage.textContent = "Please fix the following: " + validationErrors.join(', ');
            saveStatusMessage.style.color = 'red';
            console.warn("Client-side validation failed:", validationErrors);
            return;
        }


        // Construct the data object to send (only include fields that were touched/are not empty strings if applicable, matching SettingsUpdate schema)
        const updatedSettings = {};
        // Only include fields if their input value is not an empty string, so backend's exclude_unset works
        if (temperature_setpoint_str !== '') updatedSettings.temperature_setpoint = temperature_setpoint; // Send null if empty string, number if valid
        // Send empty string or null if timers are optional and input is empty
        // FastAPI/Pydantic should handle "" or null for time fields mapped to Optional[time]
        if (ac_timer_on !== '') updatedSettings.ac_timer_on = ac_timer_on; // Send "" or the time string
        if (ac_timer_off !== '') updatedSettings.ac_timer_off = ac_timer_off; // Send "" or the time string

        // Include controllable fan speeds if their input elements exist
        if (fan4Input) updatedSettings.fan_4_speed_percent = parseInt(fan4Input.value, 10);
        if (fan2Input) updatedSettings.fan_2_speed_percent = parseInt(fan2Input.value, 10);
        // if (fan3Input) updatedSettings.fan_3_speed_percent = parseInt(fan3Input.value, 10);


        // If no fields were included (e.g., only non-editable fields were present or inputs were empty strings)
         if (Object.keys(updatedSettings).length === 0) {
             saveStatusMessage.textContent = "No changes to save.";
             saveStatusMessage.style.color = 'orange';
             console.log("No updated settings data to send.");
             return;
         }


        console.log("Sending updated settings:", updatedSettings);
        saveStatusMessage.textContent = 'Saving...';
        saveStatusMessage.style.color = 'black'; // Or a saving color
        saveButton.disabled = true; // Disable button while saving


        // Send PATCH request to the backend API
        // Use the correct API path for patching settings
        fetch(`${API_BASE_URL}/api/settings`, {
            method: 'PATCH', // Use PATCH method for partial updates
            headers: {
                'Content-Type': 'application/json',
                // Include CORS headers if necessary, but your app.py already has middleware
            },
            body: JSON.stringify(updatedSettings) // Send data as JSON string
        })
            .then(response => {
                console.log("Save settings response received.", response);
                if (!response.ok) {
                    // Check for specific status codes like 400 (Bad Request) from FastAPI validation errors
                    if (response.status === 400) {
                        return response.json().then(err => {
                            const errorMessage = err.detail && Array.isArray(err.detail) && err.detail.length > 0 ?
                                err.detail.map(item => `${item.loc.join(' -> ')}: ${item.msg}`).join(', ') :
                                JSON.stringify(err);
                            throw new Error(`Validation Error: ${errorMessage}`);
                        });
                    }
                    console.error(`HTTP error! Status: ${response.status}`, response);
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                // Assuming backend PATCH returns the updated settings object on success
                return response.json();
            })
            .then(savedSettings => {
                console.log("Settings saved successfully.", savedSettings);
                saveStatusMessage.textContent = 'Settings saved successfully!';
                saveStatusMessage.style.color = 'green';

                // Update the "Last Updated" timestamp from the response
                if (savedSettings && savedSettings.updated_at) {
                    settingsUpdatedSpan.textContent = formatTimestamp(savedSettings.updated_at);
                } else {
                    settingsUpdatedSpan.textContent = 'Just now'; // Or some indicator
                }

                // Re-enable the button after a delay
                setTimeout(() => {
                    saveButton.disabled = false;
                }, 1000); // Re-enable after 1 second

                 // After a successful save, the status indicators might be updated by the ESP32.
                 // The interval `updateSettingsStatusIndicators` will pick up the latest status.
                 // No need to explicitly call it here unless the status updates immediately on save.
            })
            .catch(error => {
                console.error('Error saving settings:', error);
                saveStatusMessage.textContent = `Error saving settings: ${error.message}`;
                saveStatusMessage.style.color = 'red';
                saveButton.disabled = false; // Re-enable button on error
            });
    }


    // --- Functions for Solar PV Info Page (/pv_info) ---
    function updatePvInfo() {
        const pvDiv = document.getElementById('pv-data');
        // Find the specific span elements within pvDiv
        const pvPanelVSpan = document.getElementById('pv-panel-v');
        const pvPanelCSpan = document.getElementById('pv-panel-c');
        const pvLoadVSpan = document.getElementById('pv-load-v');
        const pvLoadCSpan = document.getElementById('pv-load-c');
        const pvLoadPSpan = document.getElementById('pv-load-p');
        const pvBattVSpan = document.getElementById('pv-batt-v');
        const pvBattCSpan = document.getElementById('pv-batt-c');
        const pvSunSpan = document.getElementById('pv-sun');
        const pvTimestampSpan = document.getElementById('pv-timestamp');


        if (!pvDiv || !pvPanelVSpan) { // Check if the main div and at least one span exist
            console.log("updatePvInfo called, but required elements not found (pv-data or pv-panel-v).");
            return; // Only run on pv_info.html if the div is present
        }
        console.log("updatePvInfo called. Fetching data from /status..."); // Log when fetching starts

        pvDiv.classList.add('loading'); // Show loading indicator

        // This fetches temperature, solar, and settings data in one call
        // Assumes /status endpoint is NOT under /api based on previous code
        fetch(`${API_BASE_URL}/status`)
            .then(response => {
                console.log("PV fetch response received.", response); // Log response
                if (!response.ok) {
                    console.error(`HTTP error! Status: ${response.status}`, response); // Log error response
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("PV data received from /status:", data); // Log received data

                // The PV data is nested under the 'solar_data' key in the /status response
                const pvData = data.solar_data;
                if (pvData) {
                    console.log("Solar data found in response. Populating fields.");
                    // Use != null check which covers both null and undefined
                    pvPanelVSpan.textContent = pvData.panel_voltage != null ? pvData.panel_voltage.toFixed(2) : 'N/A';
                    pvPanelCSpan.textContent = pvData.panel_current != null ? pvData.panel_current.toFixed(3) : 'N/A';
                    pvLoadVSpan.textContent = pvData.load_voltage != null ? pvData.load_voltage.toFixed(2) : 'N/A';
                    pvLoadCSpan.textContent = pvData.load_current != null ? pvData.load_current.toFixed(3) : 'N/A';
                    pvLoadPSpan.textContent = pvData.load_power != null ? pvData.load_power.toFixed(2) : 'N/A';
                    pvBattVSpan.textContent = pvData.battery_voltage != null ? pvData.battery_voltage.toFixed(2) : 'N/A';
                    pvBattCSpan.textContent = pvData.battery_current != null ? pvData.battery_current.toFixed(3) : 'N/A';
                    pvSunSpan.textContent = pvData.sunlight_intensity != null ? pvData.sunlight_intensity.toFixed(1) : 'N/A';
                    pvTimestampSpan.textContent = formatTimestamp(pvData.timestamp);

                } else {
                    console.warn("No solar_data found in /status response."); // Log if no PV data
                    // Display 'N/A' for all fields if no data is present
                    pvPanelVSpan.textContent = 'N/A';
                    pvPanelCSpan.textContent = 'N/A';
                    pvLoadVSpan.textContent = 'N/A';
                    pvLoadCSpan.textContent = 'N/A';
                    pvLoadPSpan.textContent = 'N/A';
                    pvBattVSpan.textContent = 'N/A';
                    pvBattCSpan.textContent = 'N/A';
                    pvSunSpan.textContent = 'N/A';
                    pvTimestampSpan.textContent = 'N/A';
                    // You could also show a specific message if preferred
                    pvDiv.innerHTML = '<p>No PV data available.</p>'; // Overwrite with message
                }
            })
            .catch(error => {
                console.error('Error fetching PV data:', error);
                // Update the PV data div with an error message
                pvDiv.innerHTML = `<p class="error">Error loading PV data: ${error.message}</p>`;
                pvDiv.classList.add('error'); // Add error class for potential CSS styling
            })
             .finally(() => {
                 pvDiv.classList.remove('loading'); // Hide loading indicator regardless of success/failure
                 console.log("PV data population finished."); // Log finish
             });
    }


    // --- Functions for Temperature Graphs Page (/temperature_graphs) ---

    // Function to fetch unique sensor names and populate the select dropdown
    // Note: A dedicated backend endpoint for unique sensor names is ideal.
    // This implementation fetches recent data and extracts names from that subset.
    async function populateSensorSelect() {
        const sensorSelect = document.getElementById('sensor-select');
        if (!sensorSelect) {
             console.log("populateSensorSelect called, but sensor-select dropdown not found.");
             return;
        }

        console.log("Populating sensor select dropdown...");
        // Fetch a reasonable number of recent readings to get a list of active sensor names
        // Ideally, you'd have an API endpoint that just returns unique sensor names
        // Assumes /api/temperature_history exists
        const fetchUrl = `${API_BASE_URL}/api/temperature_history?limit=1000`; // Fetch up to 1000 recent readings

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const readings = await response.json();
            console.log(`Workspaceed ${readings.length} readings to find unique sensors.`);

            const uniqueSensorNames = new Set();
            if (readings && Array.isArray(readings) && readings.length > 0) {
                readings.forEach(reading => {
                    if (reading.sensor_name) {
                        uniqueSensorNames.add(reading.sensor_name);
                    }
                });
            }

            // Clear existing options except "All Sensors"
            sensorSelect.innerHTML = '<option value="">All Sensors</option>';

            // Add unique sensor names to the dropdown
            uniqueSensorNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                sensorSelect.appendChild(option);
            });
            console.log(`Populated sensor select with ${uniqueSensorNames.size} unique sensors.`);

        } catch (error) {
            console.error('Error fetching sensor names:', error);
            // Optionally add an error message to the dropdown or page
            sensorSelect.innerHTML = '<option value="">Error loading sensors</option>';
        }
    }


    // Function to fetch temperature data based on selected filters
    async function fetchTemperatureGraphData() {
        const sensorSelect = document.getElementById('sensor-select');
        const timeRangeSelect = document.getElementById('time-range-select');
        const graphStatusMessage = document.getElementById('graph-status-message');
        const graphCanvas = document.getElementById('temperatureChart');
         const graphContainer = document.getElementById('graph-container'); // Get container for loading class


        if (!sensorSelect || !timeRangeSelect || !graphStatusMessage || !graphCanvas || !graphContainer) {
             console.log("Fetch graph data called, but required elements not found.");
             return null; // Ensure elements exist
        }

        const selectedSensorName = sensorSelect.value;
        const selectedTimeRange = timeRangeSelect.value;

        console.log(`Workspaceing graph data for Sensor: ${selectedSensorName || 'All'}, Time Range: ${selectedTimeRange}`);
        graphStatusMessage.textContent = 'Loading graph data...';
        graphStatusMessage.style.color = 'black';
        graphContainer.classList.add('loading'); // Show loading indicator

        let fetchUrl = `${API_BASE_URL}/api/temperature_history?limit=1000`; // Default limit for recent data


        if (selectedSensorName) {
            fetchUrl += `&sensor_name=${encodeURIComponent(selectedSensorName)}`;
        }

        const now = new Date();
        let startTime = null;

        // Calculate start time based on selected range
        switch (selectedTimeRange) {
            case '1h':
                startTime = new Date(now.getTime() - 60 * 60 * 1000); // Last hour
                fetchUrl += `&limit=500`; // Maybe fetch more data points for shorter range if needed
                break;
            case '6h':
                startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000); // Last 6 hours
                 fetchUrl += `&limit=1000`;
                break;
            case '1d':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
                 fetchUrl += `&limit=2000`;
                break;
            case '7d':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
                 fetchUrl += `&limit=5000`;
                break;
            case 'all':
                startTime = null; // Fetch all data (within limit)
                 fetchUrl = `${API_BASE_URL}/api/temperature_history?limit=10000`; // Increase limit for 'all'
                 if (selectedSensorName) {
                    fetchUrl += `&sensor_name=${encodeURIComponent(selectedSensorName)}`;
                 }
                break;
             // Add more cases for specific date ranges if needed
        }

        if (startTime) {
            // Format start time as ISO 8601 string for the backend API
             fetchUrl += `&start_time=${startTime.toISOString()}`;
        }
         // Optionally add end_time if needed, but fetching up to 'now' is typical


        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                 graphStatusMessage.textContent = `HTTP error! Status: ${response.status}`;
                 graphStatusMessage.style.color = 'red';
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const readings = await response.json();
            console.log(`Workspaceed ${readings.length} temperature readings for graph.`);

            graphStatusMessage.textContent = ''; // Clear loading message


            // Process data and draw the graph
            drawTemperatureGraph(readings, graphCanvas, selectedSensorName);

            return readings; // Return fetched data

        } catch (error) {
            console.error('Error fetching graph data:', error);
            graphStatusMessage.textContent = `Error loading graph data: ${error.message}`;
            graphStatusMessage.style.color = 'red';
            // Clear the previous graph if any
            if (temperatureChartInstance) {
                 temperatureChartInstance.destroy();
                 temperatureChartInstance = null;
            }
            return null; // Indicate fetch failed
        } finally {
             graphContainer.classList.remove('loading'); // Hide loading indicator
        }
    }


    // Function to draw/update the Chart.js graph
    function drawTemperatureGraph(readings, canvasElement, filterSensorName = null) {
        console.log("Drawing temperature graph...");

        if (!canvasElement) {
             console.error("Canvas element not found for drawing graph.");
             return;
        }

        // Destroy previous chart instance if it exists to prevent duplicates
        if (temperatureChartInstance) {
            temperatureChartInstance.destroy();
        }

        // --- Data Processing for Chart.js ---
        // We need to group data by sensor name for Chart.js datasets
        const dataBySensor = {};
        if (readings && Array.isArray(readings)) {
             readings.forEach(reading => {
                 const sensor = reading.sensor_name || 'Unknown Sensor';
                 if (!dataBySensor[sensor]) {
                     dataBySensor[sensor] = [];
                 }
                 // Store timestamp as Date object for Chart.js time scale
                 const timestampDate = parseISOTimestamp(reading.timestamp);
                 if (timestampDate && reading.temperature != null) { // Ensure timestamp is valid and temperature is not null
                     dataBySensor[sensor].push({
                         x: timestampDate,
                         y: reading.temperature
                     });
                 }
             });
        }


        // Sort data points by timestamp for each sensor
        Object.values(dataBySensor).forEach(dataPoints => {
            dataPoints.sort((a, b) => a.x.getTime() - b.x.getTime());
        });

        // Create Chart.js datasets
        const datasets = Object.keys(dataBySensor).map((sensorName, index) => {
            // Assign a color based on index (you can use a color palette)
            const colors = [
                 'rgb(255, 99, 132)', // red
                 'rgb(54, 162, 235)', // blue
                 'rgb(255, 205, 86)', // yellow
                 'rgb(75, 192, 192)', // green
                 'rgb(153, 102, 255)', // purple
                 'rgb(255, 159, 64)', // orange
                 'rgb(201, 203, 207)' // grey
                 // Add more colors if you have more sensors
            ];
             const color = colors[index % colors.length]; // Cycle through colors

            return {
                label: sensorName, // Dataset label is the sensor name
                data: dataBySensor[sensorName], // Array of {x: Date, y: number} objects
                borderColor: color,
                backgroundColor: color + '40', // Add transparency for fill area (optional)
                tension: 0.1, // Smooth the lines (optional)
                fill: false, // Don't fill area under the line (optional)
                 pointRadius: 3, // Size of data points (optional)
                 pointHoverRadius: 5 // Size of data points on hover (optional)
            };
        });

        // --- Chart.js Configuration ---
        const ctx = canvasElement.getContext('2d');
        temperatureChartInstance = new Chart(ctx, {
            type: 'line', // Use a line chart for time series data
            data: {
                datasets: datasets // Use the prepared datasets
            },
            options: {
                 responsive: true, // Make the chart responsive
                 maintainAspectRatio: false, // Allow controlling aspect ratio via CSS
                 aspectRatio: 4, // You can set an aspect ratio, or control size via CSS
                 scales: {
                    x: { // X-axis is for time
                        type: 'time', // Use 'time' scale for timestamps
                         time: {
                             parser: false, // Data is already Date objects
                             unit: 'hour', // Start with hour unit, Chart.js will auto-adjust
                             displayFormats: { // How to display time labels
                                 hour: 'MMM d, h:mm a',
                                 minute: 'h:mm a',
                                 day: 'MMM d',
                                 week: 'MMM d',
                                 month: 'MMM yyyy',
                                 year: 'yyyy'
                             },
                             tooltipFormat: 'MMM d, yyyy h:mm:ss a' // Format for tooltips
                         },
                         title: {
                            display: true,
                            text: 'Time'
                         },
                         adapters: { // Tell Chart.js to use built-in Date adapter (or specify one like date-fns)
                             date: {}
                         }
                    },
                    y: { // Y-axis is for temperature
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        },
                        // Optional: set a reasonable min/max based on expected temps
                        // suggestedMin: 0,
                        // suggestedMax: 50
                    }
                },
                plugins: {
                     tooltip: {
                         mode: 'index', // Show tooltips for all points at a given X value
                         intersect: false, // Show tooltip even if mouse is not directly over a point
                     },
                     title: {
                        display: true,
                        text: (filterSensorName && filterSensorName !== '') ? `Temperature Readings for ${filterSensorName}` : 'Temperature Readings by Sensor' // Chart title changes based on filter
                     },
                     legend: { // Display dataset labels (sensor names)
                        display: true
                     }
                 }
            }
        });
        console.log("Temperature graph drawn.");
    }

    // --- Event Listeners for Graph Controls ---
    function setupGraphEventListeners() {
         const sensorSelect = document.getElementById('sensor-select');
         const timeRangeSelect = document.getElementById('time-range-select');
         const refreshGraphButton = document.getElementById('refresh-graph-button');

         if (sensorSelect) {
             // Fetch and redraw graph when sensor selection changes
             sensorSelect.addEventListener('change', () => {
                 fetchTemperatureGraphData();
             });
         } else { console.warn("Sensor select dropdown not found for event listener setup."); }


         if (timeRangeSelect) {
             // Fetch and redraw graph when time range changes
             timeRangeSelect.addEventListener('change', () => {
                 fetchTemperatureGraphData();
             });
         } else { console.warn("Time range select dropdown not found for event listener setup."); }


         if (refreshGraphButton) {
             // Fetch and redraw graph when refresh button is clicked
             refreshGraphButton.addEventListener('click', () => {
                 fetchTemperatureGraphData();
             });
         } else { console.warn("Refresh graph button not found for event listener setup."); }

         console.log("Graph event listeners setup attempted.");
    }


    // --- Homepage Summary Function ---
     function updateHomepageSummary() {
        console.log("On Home page. Initializing summary.");
        const summaryDiv = document.getElementById('status-summary');
        if (summaryDiv) {
             summaryDiv.textContent = 'Loading status...'; // Reset text while fetching
            // Assumes /status endpoint is NOT under /api based on previous code, adjust if moved
            fetch(`${API_BASE_URL}/status`)
                .then(response => response.ok ? response.json() : Promise.reject(`Status fetch failed: ${response.status}`))
                .then(data => {
                    console.log("Summary data received:", data);
                    // Check if the temperatures array exists and has items
                    let tempSummary = data.temperatures && Array.isArray(data.temperatures) && data.temperatures.length > 0 ? `${data.temperatures.length} temp readings.` : 'No temp readings.';
                    // Check if solar_data object exists
                    let solarSummary = data.solar_data ? 'Latest PV data available.' : 'No PV data.';
                    // Check if current_settings object exists and has setpoint
                    let settingsSummary = data.current_settings && data.current_settings.temperature_setpoint != null ? `Current setpoint: ${data.current_settings.temperature_setpoint}°C` : 'Settings unavailable.';
                    summaryDiv.innerHTML = `<p>${tempSummary}</p><p>${solarSummary}</p><p>${settingsSummary}</p>`;
                })
                .catch(error => {
                    console.error('Error fetching summary data:', error); // Log summary fetch error
                    summaryDiv.innerHTML = `<p class="error">Could not load summary: ${error}</p>`;
                });
        } else { console.warn("Summary div not found on homepage."); }
     }


    // --- Initial data load based on the current page ---
    // REMOVED: const pathname = document.location.pathname; // This line is REMOVED to fix redeclaration error


    if (pathname === '/temperatures') {
        console.log("On temperatures page. Initializing.");
        updateTemperatures();
        // Set auto-refresh interval for temperatures page
        setInterval(updateTemperatures, 3000); // 3 seconds
    } else if (pathname === '/settings') {
        console.log("On settings page. Initializing.");
        initializeSettingsPage(); // Initial load of settings and status

        // Set auto-refresh interval for settings page to update status indicators periodically
        // This calls the separate status update function
        setInterval(updateSettingsStatusIndicators, 3000); // 3 seconds (only fetches status)

        // Add event listener for the save button *after* the DOM is fully loaded
        // Using event delegation on the document for robustness
        document.addEventListener('click', function(event) {
             if (event.target && event.target.id === 'save-settings-button') {
                  console.log("Save button clicked on settings page.");
                  saveSettings(); // Call save function when button is clicked
             }
        });

        // Add event listeners to update slider value display as slider moves
        const fan4Slider = document.getElementById('fan4-speed-input');
        const fan4ValueSpan = document.getElementById('fan4-speed-value');
         if(fan4Slider && fan4ValueSpan) {
             fan4Slider.addEventListener('input', () => {
                 fan4ValueSpan.textContent = fan4Slider.value;
             });
         } else { console.warn("Fan 4 slider or value span not found for event listener."); }

        const fan2Slider = document.getElementById('fan2-speed-input');
        const fan2ValueSpan = document.getElementById('fan2-speed-value');
         if(fan2Slider && fan2ValueSpan) {
             fan2Slider.addEventListener('input', () => {
                 fan2ValueSpan.textContent = fan2Slider.value;
             });
         } else { console.warn("Fan 2 slider or value span not found for event listener."); }

         // Add Fan 3 slider listener if applicable (assuming Fan 3 speed is controllable)
         // const fan3Slider = document.getElementById('fan3-speed-input');
         // const fan3ValueSpan = document.getElementById('fan3-speed-value');
         //  if(fan3Slider && fan3ValueSpan) {
         //      fan3Slider.addEventListener('input', () => {
         //          fan3ValueSpan.textContent = fan3Slider.value;
         //      });
         //  } else { console.warn("Fan 3 slider or value span not found for event listener."); }


    } else if (pathname === '/pv_info') {
        console.log("On PV Info page. Initializing.");
        updatePvInfo();
        // Set auto-refresh interval for PV info page
        setInterval(updatePvInfo, 3000); // 3 seconds
    }
    // Code for the homepage summary (loads on root path '/')
    else if (pathname === '/') {
        console.log("On Home page. Initializing summary.");
        updateHomepageSummary(); // Initial load of summary
        // Set auto-refresh interval for homepage summary
        setInterval(updateHomepageSummary, 3000); // 3 seconds

    }
    // --- Logic for Temperature Graphs Page (/temperature_graphs) ---
    else if (pathname === '/temperature_graphs') {
         console.log("On Temperature Graphs page. Initializing.");
         // Populate the sensor dropdown first
         populateSensorSelect().then(() => {
             // Then fetch data and draw the graph based on initial selections
             // This call will be auto-refreshed by the interval below
              fetchTemperatureGraphData();

             // Add event listeners to controls after elements are available
              setupGraphEventListeners();

             // Set auto-refresh interval for the graph data
             // Note: Auto-refreshing a graph frequently might be resource-intensive
             // Consider the performance impact, especially with large datasets
             setInterval(fetchTemperatureGraphData, 3000); // 3 seconds

         });

    }
    // Add an else block for debugging if none match a known path
    else {
        console.log("Unknown page path:", pathname, ". No specific data functions initialized.");
    }
});