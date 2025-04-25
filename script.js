document.addEventListener('DOMContentLoaded', () => {
  // IMPORTANT: Replace with your actual VM IP address
  const API_BASE_URL = 'http://192.168.100.246:8000'; // CHANGE THIS

  const page = document.location.pathname.split('/').pop(); // Get current HTML file name

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
    if (!tbody) return;

    fetch(`${API_BASE_URL}/status`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            tbody.innerHTML = ''; // Clear previous data
            if (data.temperatures && data.temperatures.length > 0) {
                data.temperatures.forEach(reading => {
                    const row = tbody.insertRow();
                    // Existing cells
                    row.insertCell().textContent = reading.sensor_id || 'N/A';
                    row.insertCell().textContent = reading.sensor_name || 'N/A';
                    row.insertCell().textContent = reading.temperature !== null ? 
                        reading.temperature.toFixed(2) + '°C' : 'N/A';
                    row.insertCell().textContent = reading.sensor_type || 'N/A';
                    
                    // New battery level cell
                    const batteryCell = row.insertCell();
                    if (reading.battery_level !== null && reading.battery_level !== undefined) {
                        batteryCell.textContent = `${(reading.battery_level * 100).toFixed(1)}%`; // Convert to percentage
                    } else {
                        batteryCell.textContent = 'N/A';
                    }
                    
                    // Timestamp cell
                    row.insertCell().textContent = formatTimestamp(reading.timestamp);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6">No temperature data available.</td></tr>';
            }
            document.getElementById('temperature-data').classList.remove('loading');
        })
        .catch(error => {
            console.error('Error fetching temperature data:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="error">Error loading data: ${error.message}</td></tr>`;
            document.getElementById('temperature-data').classList.add('error');
        });
}

  function updateSettings() {
      const settingsDiv = document.getElementById('settings-data');
      if (!settingsDiv) return; // Only run on settings.html

      fetch(`${API_BASE_URL}/settings`) // Use dedicated settings endpoint
          .then(response => {
               if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
              }
              return response.json();
              })
          .then(settings => {
               if (settings) {
                  document.getElementById('setpoint').textContent = settings.temperature_setpoint !== null ? settings.temperature_setpoint.toFixed(1) : 'N/A';
                  document.getElementById('timer-on').textContent = settings.ac_timer_on || 'N/A';
                  document.getElementById('timer-off').textContent = settings.ac_timer_off || 'N/A';
                  document.getElementById('fan1-speed').textContent = settings.fan_1_speed_percent !== null ? settings.fan_1_speed_percent : 'N/A';
                  document.getElementById('fan2-speed').textContent = settings.fan_2_speed_percent !== null ? settings.fan_2_speed_percent : 'N/A';
                  document.getElementById('settings-updated').textContent = formatTimestamp(settings.updated_at);
               } else {
                   throw new Error("Settings data is missing or empty.");
               }
               settingsDiv.classList.remove('loading');
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

      fetch(`${API_BASE_URL}/status`)
          .then(response => {
               if (!response.ok) {
                  throw new Error(`HTTP error! Status: ${response.status}`);
              }
              return response.json();
          })
          .then(data => {
              const pvData = data.solar_data;
               if (pvData) {
                   document.getElementById('pv-panel-v').textContent = pvData.panel_voltage !== null ? pvData.panel_voltage.toFixed(2) : 'N/A';
                   document.getElementById('pv-panel-c').textContent = pvData.panel_current !== null ? pvData.panel_current.toFixed(3) : 'N/A';
                   document.getElementById('pv-load-v').textContent = pvData.load_voltage !== null ? pvData.load_voltage.toFixed(2) : 'N/A';
                   document.getElementById('pv-load-c').textContent = pvData.load_current !== null ? pvData.load_current.toFixed(3) : 'N/A';
                   document.getElementById('pv-load-p').textContent = pvData.load_power !== null ? pvData.load_power.toFixed(2) : 'N/A';
                   document.getElementById('pv-batt-v').textContent = pvData.battery_voltage !== null ? pvData.battery_voltage.toFixed(2) : 'N/A';
                   document.getElementById('pv-batt-c').textContent = pvData.battery_current !== null ? pvData.battery_current.toFixed(3) : 'N/A';
                   document.getElementById('pv-sun').textContent = pvData.sunlight_intensity !== null ? pvData.sunlight_intensity.toFixed(1) : 'N/A';
                   document.getElementById('pv-timestamp').textContent = formatTimestamp(pvData.timestamp);
               } else {
                  pvDiv.innerHTML = '<p>No PV data available.</p>';
               }
               pvDiv.classList.remove('loading');
          })
          .catch(error => {
               console.error('Error fetching PV data:', error);
               pvDiv.innerHTML = `<p class="error">Error loading PV data: ${error.message}</p>`;
               pvDiv.classList.add('error');
          });
  }


  // --- Initial data load based on the current page ---
  if (page === 'temperatures.html' || page === '') { // Also load temps for index potentially
      updateTemperatures();
      setInterval(updateTemperatures, 15000); // Auto-refresh every 15 seconds
  }
  if (page === 'settings.html' || page === '') {
      updateSettings();
      setInterval(updateSettings, 30000); // Auto-refresh every 30 seconds
  }
   if (page === 'pv_info.html' || page === '') {
      updatePvInfo();
      setInterval(updatePvInfo, 15000); // Auto-refresh every 15 seconds
  }

  // Example for index page summary (if needed)
  if (page === 'index.html' || page === '') {
       const summaryDiv = document.getElementById('status-summary');
       if (summaryDiv) {
          fetch(`${API_BASE_URL}/status`)
              .then(response => response.ok ? response.json() : Promise.reject(`Status fetch failed: ${response.status}`))
              .then(data => {
                  let tempSummary = data.temperatures && data.temperatures.length > 0 ? `${data.temperatures.length} temp readings.` : 'No temp readings.';
                  let solarSummary = data.solar_data ? 'Latest PV data available.' : 'No PV data.';
                  let settingsSummary = data.current_settings ? `Current setpoint: ${data.current_settings.temperature_setpoint}°C` : 'Settings unavailable.';
                  summaryDiv.innerHTML = `<p>${tempSummary}</p><p>${solarSummary}</p><p>${settingsSummary}</p>`;
              })
              .catch(error => {
                  summaryDiv.innerHTML = `<p class="error">Could not load summary: ${error}</p>`;
              });
       }
  }

});