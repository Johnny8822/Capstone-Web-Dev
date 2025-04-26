// script.js

document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Replace with your actual VM IP address
    const API_BASE_URL = 'http://192.168.100.246:8000'; // CHANGE THIS to your VM's IP and port
  
    // Get the pathname to identify the current page
    const pathname = document.location.pathname; // Get the whole pathname
  
    // Function to format timestamp (adjust format as needed)
    function formatTimestamp(isoString) {
        if (!isoString) return 'N/A';
        try {
            const date = new Date(isoString);
             // Example: Apr 14, 2025, 12:35:10 AM (adjust to local timezone display)
            return date.toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    }
  
    // --- Functions to update specific page content ---
  
    function updateTemperatures() {
      const tbody = document.getElementById('temp-table-body');
      if (!tbody) {
          // This log helps confirm if the function is called on the right page if tbody is not found
          console.log("updateTemperatures called, but tbody element not found.");
          return;
      }
      console.log("updateTemperatures called. Fetching data from /status..."); // Log when fetching starts
  
      // This fetches temperature, solar, and settings data in one call
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
              if (data.temperatures && data.temperatures.length > 0) {
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
  
                           // New battery level cell - more robust check and formatting
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
                           const errorRow = tbody.insertRow();
                           errorRow.innerHTML = `<td colspan="6" class="error">Error displaying data for one reading. See console.</td>`;
                      }
                  });
              } else {
                   console.log("No temperature data available in the /status response."); // Log if array is empty
                  tbody.innerHTML = '<tr><td colspan="6">No temperature data available.</td></tr>'; // Message if no data
              }
              document.getElementById('temperature-data').classList.remove('loading');
               console.log("Temperature table population finished."); // Log finish
  
               // --- Note: If PV or Settings data were also displayed on this page, you would update them here ---
               // This function fetches all status data, but currently only updates the temp table
  
          })
          .catch(error => {
              console.error('Error fetching temperature data:', error);
              const temperatureDataDiv = document.getElementById('temperature-data');
              if (temperatureDataDiv) {
                   temperatureDataDiv.classList.remove('loading');
                   // Also update the tbody with an error message
                   tbody.innerHTML = `<tr><td colspan="6" class="error">Error loading data: ${error.message}</td></tr>`;
                   temperatureDataDiv.classList.add('error');
              } else {
                   console.error("Temperature data div not found to update error state.");
              }
  
          });
    }
  
    // --- Function to update Settings page content (Populate Form) ---
    function updateSettings() {
        const settingsEditorDiv = document.getElementById('settings-editor');
        const settingsFormDiv = document.getElementById('settings-form');
        const loadingErrorMessage = document.getElementById('loading-error-message');
        const settingsUpdatedSpan = document.getElementById('settings-updated');
        const loadingMessage = settingsEditorDiv ? settingsEditorDiv.querySelector('p') : null; // Get the initial loading message element
  
  
        if (!settingsEditorDiv || !settingsFormDiv) {
            console.log("updateSettings called, but required elements not found (settings-editor or settings-form).");
            return; // Only run on settings.html
        }
  
        console.log("updateSettings called. Fetching data from /api/settings...");
        if(loadingErrorMessage) loadingErrorMessage.textContent = ''; // Clear previous errors
        if(loadingMessage) loadingMessage.style.display = 'block'; // Show "Loading settings data..."
        settingsEditorDiv.classList.add('loading'); // Add loading class for potential CSS styling
        settingsFormDiv.style.display = 'none'; // Hide form while loading
  
  
        // Use the correct API path for fetching settings
        fetch(`${API_BASE_URL}/api/settings`)
            .then(response => {
                 console.log("Settings fetch response received.", response);
                 if (!response.ok) {
                     console.error(`HTTP error! Status: ${response.status}`, response);
                     throw new Error(`HTTP error! Status: ${response.status}`);
                 }
                 return response.json();
                 })
            .then(settings => {
                 console.log("Settings data received:", settings);
                 if (settings) {
                     // Populate input fields with current settings data
                     document.getElementById('setpoint-input').value = settings.temperature_setpoint != null ? settings.temperature_setpoint : '';
                     // For time inputs, the value should be in "HH:MM" or "HH:MM:SS" format
                     document.getElementById('timer-on-input').value = settings.ac_timer_on || ''; // ac_timer_on will be a string like "07:00:00"
                     document.getElementById('timer-off-input').value = settings.ac_timer_off || '';
  
                     document.getElementById('fan1-speed-input').value = settings.fan_1_speed_percent != null ? settings.fan_1_speed_percent : '';
                     document.getElementById('fan2-speed-input').value = settings.fan_2_speed_percent != null ? settings.fan_2_speed_percent : '';
  
                     settingsUpdatedSpan.textContent = formatTimestamp(settings.updated_at);
  
                 } else {
                     // This case might happen if the settings row was deleted somehow
                     console.warn("Settings data is missing or empty in the response.");
                     // Optionally, keep inputs blank or set defaults and show a message
                     if(loadingErrorMessage) loadingErrorMessage.textContent = "No settings found. Default values may be applied on save.";
                 }
                 settingsEditorDiv.classList.remove('loading');
                 if(loadingMessage) loadingMessage.style.display = 'none'; // Hide "Loading settings data..."
                 settingsFormDiv.style.display = 'block'; // Show form after loading
                 console.log("Settings data loaded and form populated.");
            })
            .catch(error => {
                 console.error('Error fetching settings data:', error);
                 settingsEditorDiv.classList.remove('loading');
                 if(loadingMessage) loadingMessage.style.display = 'none'; // Hide "Loading settings data..."
                 if(loadingErrorMessage) {
                     loadingErrorMessage.textContent = `Error loading settings: ${error.message}`;
                     loadingErrorMessage.classList.add('error');
                 }
                 settingsFormDiv.style.display = 'none'; // Ensure form stays hidden on error
                 console.log("Settings data loading failed.");
            });
    }
  
    // --- Function to save settings ---
    function saveSettings() {
        console.log("Save settings button clicked. Initiating save process.");
        const saveButton = document.getElementById('save-settings-button');
        const saveStatusMessage = document.getElementById('save-status-message');
        const settingsUpdatedSpan = document.getElementById('settings-updated');
  
        // Read values from input fields
        // Use .trim() to remove leading/trailing whitespace from time inputs
        const temperature_setpoint_str = document.getElementById('setpoint-input').value.trim();
        const ac_timer_on = document.getElementById('timer-on-input').value.trim(); // Value is HH:MM or HH:MM:SS string
        const ac_timer_off = document.getElementById('timer-off-input').value.trim();
        const fan_1_speed_percent_str = document.getElementById('fan1-speed-input').value.trim();
        const fan_2_speed_percent_str = document.getElementById('fan2-speed-input').value.trim();
  
  
        // Convert to numbers, checking for empty strings or invalid input
        const temperature_setpoint = temperature_setpoint_str === '' ? null : parseFloat(temperature_setpoint_str);
        const fan_1_speed_percent = fan_1_speed_percent_str === '' ? null : parseInt(fan_1_speed_percent_str, 10);
        const fan_2_speed_percent = fan_2_speed_percent_str === '' ? null : parseInt(fan_2_speed_percent_str, 10);
  
  
        // Basic client-side validation (optional but recommended, backend validates too)
        saveStatusMessage.textContent = ''; // Clear previous status messages
  
        if (temperature_setpoint !== null && (isNaN(temperature_setpoint) || temperature_setpoint < -50 || temperature_setpoint > 150)) { // Adjusted range based on potential sensor types
            saveStatusMessage.textContent = "Please enter a valid temperature setpoint (-50 to 150)."; // Broader range for flexibility
            saveStatusMessage.style.color = 'red';
            console.warn("Client-side validation failed: Invalid temperature setpoint.");
            return;
        }
         if (fan_1_speed_percent !== null && (isNaN(fan_1_speed_percent) || fan_1_speed_percent < 0 || fan_1_speed_percent > 100)) {
             saveStatusMessage.textContent = "Please enter a valid Fan 1 speed (0-100%).";
             saveStatusMessage.style.color = 'red';
             console.warn("Client-side validation failed: Invalid Fan 1 speed.");
             return;
         }
         if (fan_2_speed_percent !== null && (isNaN(fan_2_speed_percent) || fan_2_speed_percent < 0 || fan_2_speed_percent > 100)) {
             saveStatusMessage.textContent = "Please enter a valid Fan 2 speed (0-100%).";
             saveStatusMessage.style.color = 'red';
             console.warn("Client-side validation failed: Invalid Fan 2 speed.");
             return;
         }
         // Timer validation could be added here (e.g., regex for HH:MM:SS format)
  
  
        // Construct the data object to send (only include fields that are not null, matching SettingsUpdate schema)
        // Use != null to send null if input was empty, matching Optional in schema
        const updatedSettings = {};
        if (temperature_setpoint != null) updatedSettings.temperature_setpoint = temperature_setpoint;
        // Send empty string or null if timers are optional and input is empty
        // FastAPI/Pydantic should handle "" or null for time fields mapped to Optional[time]
        if (ac_timer_on !== '') updatedSettings.ac_timer_on = ac_timer_on; // Send "" or the time string
        if (ac_timer_off !== '') updatedSettings.ac_timer_off = ac_timer_off; // Send "" or the time string
        if (fan_1_speed_percent != null) updatedSettings.fan_1_speed_percent = fan_1_speed_percent;
        if (fan_2_speed_percent != null) updatedSettings.fan_2_speed_percent = fan_2_speed_percent;
        // updated_at is set by the backend
  
  
        // If no fields were changed/entered, maybe don't send the request
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
                               const errorMessage = err.detail && Array.isArray(err.detail) && err.detail.length > 0
                                  ? err.detail.map(item => `${item.loc.join(' -> ')}: ${item.msg}`).join(', ')
                                  : JSON.stringify(err);
                               throw new Error(`Validation Error: ${errorMessage}`);
                           });
                     }
                    console.error(`HTTP error! Status: ${response.status}`, response);
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json(); // Backend PATCH returns the updated settings object
            })
            .then(savedSettings => {
                console.log("Settings saved successfully.", savedSettings);
                saveStatusMessage.textContent = 'Settings saved successfully!';
                saveStatusMessage.style.color = 'green';
  
                // Optionally update the "Last Updated" timestamp from the response
                if (savedSettings && savedSettings.updated_at) {
                     settingsUpdatedSpan.textContent = formatTimestamp(savedSettings.updated_at);
                } else {
                     settingsUpdatedSpan.textContent = 'Just now'; // Or some indicator
                }
  
                // Re-enable the button after a delay
                setTimeout(() => {
                     saveButton.disabled = false;
                }, 1000); // Re-enable after 1 second
            })
            .catch(error => {
                console.error('Error saving settings:', error);
                saveStatusMessage.textContent = `Error saving settings: ${error.message}`;
                saveStatusMessage.style.color = 'red';
                saveButton.disabled = false; // Re-enable button on error
            });
    }
  
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
  
        // This fetches temperature, solar, and settings data in one call
        // Assuming /status endpoint is NOT under /api based on previous code
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
                    // Display 'N/A' or loading message if no data is present
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
                    // pvDiv.innerHTML = '<p>No PV data available.</p>';
                 }
                 // Remove loading class regardless of whether data was found
                 pvDiv.classList.remove('loading'); // Assuming you have a .loading class in CSS
                 console.log("PV data population finished."); // Log finish
            })
            .catch(error => {
                 console.error('Error fetching PV data:', error);
                 // Update the PV data div with an error message
                 pvDiv.innerHTML = `<p class="error">Error loading PV data: ${error.message}</p>`;
                 pvDiv.classList.remove('loading');
                 pvDiv.classList.add('error'); // Add error class for potential CSS styling
            });
    }
  
  // ... (rest of the script inside DOMContentLoaded) ...
  
    // --- Initial data load based on the current page ---
    
    // --- Initial data load based on the current page ---

    if (pathname === '/temperatures') {
        console.log("On temperatures page. Initializing.");
        updateTemperatures();
        // Auto-refresh every 15 seconds. You might want to adjust this interval.
        setInterval(updateTemperatures, 15000);
    } else if (pathname === '/settings') {
        console.log("On settings page. Initializing.");
        updateSettings(); // Initial load of settings to populate the form
        // No auto-refresh for the settings editing page to avoid disrupting user input
        // Add event listener for the save button *after* the DOM is fully loaded
        // Using event delegation on the document for robustness
        document.addEventListener('click', function(event) {
             // Check if the clicked element or its parent is the save button
             if (event.target && event.target.id === 'save-settings-button') {
                  saveSettings(); // Call save function when button is clicked
             }
        });
  
    } else if (pathname === '/pv_info') {
        console.log("On PV Info page. Initializing.");
        updatePvInfo();
        // Auto-refresh every 15 seconds. You might want to adjust this interval.
        setInterval(updatePvInfo, 15000);
    }
    // Code for the homepage summary (loads on root path '/')
    else if (pathname === '/') {
         console.log("On Home page. Initializing summary.");
         const summaryDiv = document.getElementById('status-summary');
         if (summaryDiv) {
             // Home page summary only needs /status endpoint data
             // Assumes /status endpoint is NOT under /api based on previous code, adjust if moved
             fetch(`${API_BASE_URL}/status`)
                .then(response => response.ok ? response.json() : Promise.reject(`Status fetch failed: ${response.status}`))
                .then(data => {
                     console.log("Summary data received:", data);
                     // Check if the temperatures array exists and has items
                     let tempSummary = data.temperatures && data.temperatures.length > 0 ? `${data.temperatures.length} temp readings.` : 'No temp readings.';
                     // Check if solar_data object exists
                     let solarSummary = data.solar_data ? 'Latest PV data available.' : 'No PV data.';
                     // Check if current_settings object exists and has setpoint
                     let settingsSummary = data.current_settings ? `Current setpoint: ${data.current_settings.temperature_setpoint}°C` : 'Settings unavailable.';
                     summaryDiv.innerHTML = `<p>${tempSummary}</p><p>${solarSummary}</p><p>${settingsSummary}</p>`;
                })
                .catch(error => {
                     console.error('Error fetching summary data:', error); // Log summary fetch error
                    summaryDiv.innerHTML = `<p class="error">Could not load summary: ${error}</p>`;
                });
         }
    }
     // Add an else block for debugging if none match a known path
     else {
          console.log("Unknown page path:", pathname, ". No specific data functions initialized.");
     }
  });