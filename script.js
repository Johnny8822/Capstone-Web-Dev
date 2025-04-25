document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANT: Replace with your actual VM IP address
    const API_BASE_URL = 'http://192.168.100.246:8000'; // CHANGE THIS
  
    // Get the pathname and check if it's the root or specific routes
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
          // This log helps confirm if the function is called on the right page
          console.log("updateTemperatures called, but tbody not found.");
          return;
      }
      console.log("updateTemperatures called. Fetching data..."); // Log when fetching starts
  
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
              console.log("Data received:", data); // Log the received data
              tbody.innerHTML = ''; // Clear previous data
              if (data.temperatures && data.temperatures.length > 0) {
                   console.log(`Populating table with ${data.temperatures.length} readings.`); // Log data count
                  data.temperatures.forEach(reading => {
                      console.log("Processing reading:", reading); // Log each reading
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
                           console.log("Row added successfully."); // Log success for each row
                      } catch (e) {
                           console.error("Error populating row for reading:", reading, e); // Log error if row fails
                           // Optionally add a placeholder row indicating the error
                           const errorRow = tbody.insertRow();
                           errorRow.innerHTML = `<td colspan="6" class="error">Error displaying data for one reading. See console.</td>`;
                      }
                  });
              } else {
                   console.log("No temperature data available in the response."); // Log if array is empty
                  tbody.innerHTML = '<tr><td colspan="6">No temperature data available.</td></tr>'; // Message if no data
              }
              document.getElementById('temperature-data').classList.remove('loading');
               console.log("Temperature data population finished."); // Log finish
          })
          .catch(error => {
              console.error('Error fetching temperature data:', error);
              // Clear tbody and show error message in the table
              tbody.innerHTML = `<tr><td colspan="6" class="error">Error loading data: ${error.message}</td></tr>`;
              document.getElementById('temperature-data').classList.add('error');
          });
  }
  
    function updateSettings() {
        const settingsDiv = document.getElementById('settings-data');
        if (!settingsDiv) return; // Only run on settings.html
        console.log("updateSettings called. Fetching data..."); // Log when fetching starts
  
  
        fetch(`${API_BASE_URL}/settings`) // Use dedicated settings endpoint
            .then(response => {
                 console.log("Settings fetch response received.", response); // Log response
                 if (!response.ok) {
                     console.error(`HTTP error! Status: ${response.status}`, response); // Log error response
                     throw new Error(`HTTP error! Status: ${response.status}`);
                 }
                 return response.json();
                 })
            .then(settings => {
                 console.log("Settings data received:", settings); // Log the received data
                 if (settings) {
                    document.getElementById('setpoint').textContent = settings.temperature_setpoint != null ? settings.temperature_setpoint.toFixed(1) : 'N/A';
                     // Handle potential null for time objects explicitly if needed, though direct assignment might work
                    document.getElementById('timer-on').textContent = settings.ac_timer_on || 'N/A';
                    document.getElementById('timer-off').textContent = settings.ac_timer_off || 'N/A';
                    document.getElementById('fan1-speed').textContent = settings.fan_1_speed_percent != null ? settings.fan_1_speed_percent : 'N/A';
                    document.getElementById('fan2-speed').textContent = settings.fan_2_speed_percent != null ? settings.fan_2_speed_percent : 'N/A';
                    document.getElementById('settings-updated').textContent = formatTimestamp(settings.updated_at);
                 } else {
                     throw new Error("Settings data is missing or empty.");
                 }
                 settingsDiv.classList.remove('loading');
                 console.log("Settings data population finished."); // Log finish
            })
            .catch(error => {
                 console.error('Error fetching settings data:', error);
                 settingsDiv.innerHTML = `<p class="error">Error loading settings: ${error.message}</p>`;
                 settingsDiv.classList.add('error');
            });
    }
  
     function updatePvInfo() {
        const pvDiv = document.getElementById('pv-data');
        if (!pvDiv) return; // Only run on pv_info.html
        console.log("updatePvInfo called. Fetching data..."); // Log when fetching starts
  
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
                const pvData = data.solar_data; // Get the nested solar_data object
                 if (pvData) {
                     // Use != null check
                     document.getElementById('pv-panel-v').textContent = pvData.panel_voltage != null ? pvData.panel_voltage.toFixed(2) : 'N/A';
                     document.getElementById('pv-panel-c').textContent = pvData.panel_current != null ? pvData.panel_current.toFixed(3) : 'N/A';
                     document.getElementById('pv-load-v').textContent = pvData.load_voltage != null ? pvData.load_voltage.toFixed(2) : 'N/A';
                     document.getElementById('pv-load-c').textContent = pvData.load_current != null ? pvData.load_current.toFixed(3) : 'N/A';
                     document.getElementById('pv-load-p').textContent = pvData.load_power != null ? pvData.load_power.toFixed(2) : 'N/A';
                     document.getElementById('pv-batt-v').textContent = pvData.battery_voltage != null ? pvData.battery_voltage.toFixed(2) : 'N/A';
                     document.getElementById('pv-batt-c').textContent = pvData.battery_current != null ? pvData.battery_current.toFixed(3) : 'N/A';
                     document.getElementById('pv-sun').textContent = pvData.sunlight_intensity != null ? pvData.sunlight_intensity.toFixed(1) : 'N/A';
                     document.getElementById('pv-timestamp').textContent = formatTimestamp(pvData.timestamp);
                 } else {
                    pvDiv.innerHTML = '<p>No PV data available.</p>';
                    console.warn("No solar_data found in /status response."); // Log if no PV data
                 }
                 pvDiv.classList.remove('loading');
                 console.log("PV data population finished."); // Log finish
            })
            .catch(error => {
                 console.error('Error fetching PV data:', error);
                 pvDiv.innerHTML = `<p class="error">Error loading PV data: ${error.message}</p>`;
                 pvDiv.classList.add('error');
            });
    }
  
  
    // --- Initial data load based on the current page ---
    // Check the full pathname, not just the last part after split('/')
    if (pathname === '/temperatures') {
        console.log("On temperatures page. Initializing."); // Log page identification
        updateTemperatures();
        setInterval(updateTemperatures, 15000); // Auto-refresh every 15 seconds
    } else if (pathname === '/settings') {
        console.log("On settings page. Initializing."); // Log page identification
        updateSettings();
        setInterval(updateSettings, 30000); // Auto-refresh every 30 seconds
    } else if (pathname === '/pv_info') {
        console.log("On PV Info page. Initializing."); // Log page identification
        updatePvInfo();
        setInterval(updatePvInfo, 15000); // Auto-refresh every 15 seconds
    }
    // Example for index page summary (loads on root path '/')
    else if (pathname === '/') {
         console.log("On Home page. Initializing summary."); // Log page identification
         const summaryDiv = document.getElementById('status-summary');
         if (summaryDiv) {
             // Home page summary only needs /status endpoint
             fetch(`${API_BASE_URL}/status`)
                .then(response => response.ok ? response.json() : Promise.reject(`Status fetch failed: ${response.status}`))
                .then(data => {
                     console.log("Summary data received:", data); // Log summary data
                     let tempSummary = data.temperatures && data.temperatures.length > 0 ? `${data.temperatures.length} temp readings.` : 'No temp readings.';
                     let solarSummary = data.solar_data ? 'Latest PV data available.' : 'No PV data.';
                     let settingsSummary = data.current_settings ? `Current setpoint: ${data.current_settings.temperature_setpoint}°C` : 'Settings unavailable.';
                     summaryDiv.innerHTML = `<p>${tempSummary}</p><p>${solarSummary}</p><p>${settingsSummary}</p>`;
                })
                .catch(error => {
                     console.error('Error fetching summary data:', error); // Log summary fetch error
                    summaryDiv.innerHTML = `<p class="error">Could not load summary: ${error}</p>`;
                });
         }
    }
     // Add an else block for debugging if none match
     else {
          console.log("Unknown page path:", pathname, ". No specific data functions initialized.");
     }
  
  
  });