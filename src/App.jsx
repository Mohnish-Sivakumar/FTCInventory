import "./styles.css";

import { useState, useEffect } from "react";

export default function App() {
  const [itemsList, setItemsList] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Show loading animation and continuously fetch data until loaded
  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const fetchData = async () => {
      try {
        const response = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vRp1ofRPSUy_hqqM91nqjBTXto3wnm4QdpTO-WHTuGHOtnu588M_WlUUzLAR-aLMAidaS1ltP2HgzWn/pub?gid=1483661551&single=true&output=csv");
        if (response.ok) {
          const text = await response.text();
          if (text && text.trim().length > 0 && isMounted) {
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }

      // If we get here, either the fetch failed or the data wasn't valid
      if (isMounted) {
        timeoutId = setTimeout(fetchData, 2000); // Retry every 2 seconds
      }
    };

    // Initial fetch
    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Fetch Parts list from Google Sheet CSV with auto-refresh
  useEffect(() => {
    const fetchItemsList = () => {
      const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRp1ofRPSUy_hqqM91nqjBTXto3wnm4QdpTO-WHTuGHOtnu588M_WlUUzLAR-aLMAidaS1ltP2HgzWn/pub?gid=1483661551&single=true&output=csv";
      fetch(csvUrl)
        .then((res) => res.text())
        .then((text) => {
          const lines = text.trim().split(/\r?\n/);
          const names = lines.slice(1) // skip header
            .map((row) => row.split(",")[0].replace(/\"/g, '').trim())
            .filter((s) => s);
          setItemsList(names);
        })
        .catch((err) => console.error("Failed to load items list", err));
    };

    // Initial fetch
    fetchItemsList();
    
    // Set up interval to refresh data every 30 seconds
    const intervalId = setInterval(fetchItemsList, 30000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const [search, setSearch] = useState("");
  const [summaryMap, setSummaryMap] = useState({}); // {part: {type,max,locs{loc:qty}}}

  // Fetch inventory summary data with auto-refresh
  useEffect(() => {
    const fetchInventoryData = () => {
      console.log('Fetching inventory data...');
      const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRp1ofRPSUy_hqqM91nqjBTXto3wnm4QdpTO-WHTuGHOtnu588M_WlUUzLAR-aLMAidaS1ltP2HgzWn/pub?gid=1483661551&single=true&output=csv";
      fetch(csvUrl)
        .then((res) => res.text())
        .then((text) => {
        // Parse CSV properly, handling quoted values with commas
        const lines = [];
        let currentLine = [];
        let inQuotes = false;
        let currentField = '';
        
        // Process each character to handle quoted fields properly
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
            // Only add the quote if it's escaped (double quote inside quotes)
            if (text[i + 1] === '"' && inQuotes) {
              currentField += '"';
              i++; // Skip the next quote
            }
          } else if (char === ',' && !inQuotes) {
            currentLine.push(currentField.trim());
            currentField = '';
          } else if (char === '\n' || char === '\r') {
            if (char === '\n' || (char === '\r' && text[i + 1] !== '\n')) {
              if (currentField || currentLine.length > 0) {
                currentLine.push(currentField.trim());
                lines.push(currentLine);
                currentLine = [];
                currentField = '';
              }
            }
          } else {
            currentField += char;
          }
        }
        
        // Add the last line if it exists
        if (currentField.trim() || currentLine.length > 0) {
          currentLine.push(currentField.trim());
          lines.push(currentLine);
        }
        
        const headers = lines[0].map(h => h.toLowerCase().trim());
        const map = {};
        
        console.log('Fetched Inventory Summary Data:', { lines });
        
        // First pass: collect all parts data
        const partsData = [];
        lines.slice(1).forEach((values) => {
          if (values.length < 1) return;
          const partName = values[0].trim();
          if (!partName) return;
          
          const type = ((values[1] || '').trim()).toLowerCase();
          const locationStr = (values[2] || '').trim();
          const maxQty = parseInt((values[3] || '').trim(), 10) || 0;
          
          // Parse locations (format: "Location1 (Qty1), Location2 (Qty2)")
          const locMap = {};
          
          // First, split by comma and process each segment
          const segments = locationStr.split(',').map(s => s.trim()).filter(Boolean);
          
          segments.forEach(segment => {
            // Try different patterns to match location and quantity
            const patterns = [
              /^(.+?)\s*\((\d+)\)$/,          // Matches "Location (123)"
              /^(.+?)\s+(\d+)$/,               // Matches "Location 123"
              /^(.+?)\s*-\s*(\d+)$/            // Matches "Location - 123"
            ];
            
            for (const pattern of patterns) {
              const match = segment.match(pattern);
              if (match) {
                const loc = match[1].trim();
                const qty = parseInt(match[2], 10);
                if (loc && !isNaN(qty)) {
                  locMap[loc] = qty;
                }
                break; // Stop trying patterns once one matches
              }
            }
          });
          
          // Store the part data
          partsData.push({
            name: partName,
            type,
            max: maxQty,
            locs: locMap,
            rawData: values
          });
        });
        
        // Create the final map and log the location quantities
        const finalMap = {};
        partsData.forEach(part => {
          finalMap[part.name] = {
            type: part.type,
            max: part.max,
            locs: part.locs
          };
          
          // Log the location quantities for this part
          console.log(`Part: ${part.name}`);
          console.log('Locations:', part.locs);
          console.log('---');
        });
        
        setSummaryMap(finalMap);
        console.log('Inventory data updated');
      })
      .catch((err) => console.error("Failed to load inventory data", err));
    };

    // Initial fetch
    fetchInventoryData();
    
    // Set up interval to refresh data every 30 seconds
    const intervalId = setInterval(fetchInventoryData, 30000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const [errors, setErrors] = useState([]);
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [selected, setSelected] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [view, setView] = useState("inventory");
  const [resources, setResources] = useState([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Function to fetch resources
  const fetchResources = async (isAutoRefresh = false) => {
    // Skip if already loading and this is an auto-refresh to prevent queueing requests
    if (isLoadingResources && isAutoRefresh) return;
    
    // Only set loading state for non-auto-refresh requests to prevent UI flicker
    if (!isAutoRefresh) {
      setIsLoadingResources(true);
      setResourcesError(null);
    }
    
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`https://docs.google.com/spreadsheets/d/e/2PACX-1vSbA07FaTJr0xdLp7fvm9oWxWramclzqnCeP-Tn2-yLS-qDwsNvXU2MRj_tKYXsp5bRsi1v_L5CvuHX/pub?output=csv&_=${timestamp}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text.trim()) {
        throw new Error('Empty response from server');
      }
      
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error('Not enough data in response');
      }
      
      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const resourcesData = [];
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const resource = {};
        
        // Handle cases where values might contain commas
        for (let j = 0; j < headers.length; j++) {
          resource[headers[j].toLowerCase()] = values[j] ? values[j].trim() : '';
        }
        
        resourcesData.push(resource);
      }
      
      setResources(resourcesData);
      console.log(`Resources updated at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('Error fetching resources:', error);
      if (!isAutoRefresh) {
        setResourcesError(error.message);
      }
    } finally {
      if (!isAutoRefresh) {
        setIsLoadingResources(false);
      }
    }
  };
  
  // Poll for resources when in resources view
  useEffect(() => {
    if (view === 'strikes') {
      // Fetch immediately
      fetchResources();
      
      // Then set up polling every 30 seconds
      const intervalId = setInterval(fetchResources, 30000);
      
      // Cleanup interval on component unmount or view change
      return () => clearInterval(intervalId);
    }
  }, [view]);

  // Live validation when selected items or quantities change
  useEffect(() => {
    const isSchoolToSchool = fromLoc === 'School' && toLoc === 'School';
    const newErrors = [];
    
    console.log("Running validation with current state:", {
      fromLoc,
      toLoc,
      selected,
      summaryMap: Object.keys(summaryMap).length > 0 ? "(summaryMap loaded)" : "(summaryMap empty)",
      isSchoolToSchool
    });
    
    if (!fromLoc || !toLoc) {
      console.log("Skipping validation: missing location selection");
      setErrors([]);
      return;
    }
    
    if (Object.keys(selected).length === 0) {
      console.log("No items selected for validation");
      setErrors([]);
      return;
    }
    
    if (isSchoolToSchool) {
      console.log("School to School transfer - skipping all validations");
      setErrors([]);
      return;
    }
    
    Object.entries(selected).forEach(([item, qty]) => {
      const info = summaryMap[item];
      if (!info) return;

      const available = info.locs[fromLoc] || 0;
      if (available === 0) {
        const errorMsg = `${item}: '${fromLoc}' currently has 0 in stock.`;
        console.error(errorMsg);
        newErrors.push(errorMsg);
      } else if (available < qty) {
        const errorMsg = `${item}: only ${available} available at '${fromLoc}', cannot move ${qty}.`;
        console.error(errorMsg);
        newErrors.push(errorMsg);
      }
    });
    
    setErrors(newErrors);
  }, [selected, fromLoc, toLoc, summaryMap]);

  const filteredItems = itemsList.filter((it) => it.toLowerCase().includes(search.toLowerCase()));

  function toggleItem(item) {
    setSelected((prev) => {
      const copy = { ...prev };
      if (Object.prototype.hasOwnProperty.call(copy, item)) {
        delete copy[item];
      } else {
        copy[item] = ""; // empty quantity initially
      }
      return copy;
    });
  }

  function changeQty(item, val) {
    let n = parseInt(val, 10);
    if (!Number.isFinite(n) || n < 1) {
      // treat 0 or invalid as removal
      setSelected((prev) => {
        const copy = { ...prev };
        delete copy[item];
        return copy;
      });
      return;
    }
    if (n > 100) n = 100;
    setSelected((prev) => ({ ...prev, [item]: n }));
  }

  function Submit(e) {
    e.preventDefault();
    
    // Clear any existing messages
    setErrors([]);
    setSuccessMessage("");
    
    // Show processing message
    setSuccessMessage("Processing your submission...");
    setIsSubmitting(true);
    
    try {
      // Get form values
      const fromLoc = document.querySelector('select[name="From"]').value;
      const toLoc = document.querySelector('select[name="To"]').value;
      const memberName = document.querySelector('input[name="Member"]').value || 'Anonymous';
      const submissionErrors = [];
      
      // Basic validation
      if (!fromLoc || !toLoc) {
        throw new Error("Please select both From and To locations");
      }

      if (fromLoc === toLoc && fromLoc !== "School") {
        throw new Error("Can only transfer from School to School (for adding new items)");
      }

      // Check if any items are selected
      if (Object.keys(selected).length === 0) {
        throw new Error("Please select at least one item");
      }
      
      // Validate quantities and check stock
      const selectedItems = Object.keys(selected);
      const isSchoolToSchool = fromLoc === "School" && toLoc === "School";
      
      selectedItems.forEach((item) => {
        const qty = parseInt(selected[item], 10);
        
        // Check quantity is valid
        if (!Number.isFinite(qty) || qty < 1) {
          submissionErrors.push(`${item}: quantity must be at least 1`);
          return;
        }
        
        // Skip stock validation for School to School transfers
        if (!isSchoolToSchool) {
          const info = summaryMap[item];
          if (info) {
            const available = info.locs[fromLoc] || 0;
            if (available < qty) {
              submissionErrors.push(`${item}: only ${available} available at '${fromLoc}', cannot move ${qty}.`);
            }
          }
        }
      });
      
      // If there are validation errors, throw them
      if (submissionErrors.length > 0) {
        throw new Error(submissionErrors.join('\n'));
      }
      
      // Create a form element
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://script.google.com/macros/s/AKfycbxBdIQ8FsvhEOVwNiV1PJZACFWfSWAK3E6H1y-Z-UeJo677_G1HPDYmcm_ZPav3WbF0NA/exec';
      
      // Add form fields
      const addField = (name, value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };
      
      // Format timestamp as "Month Day, Time" (e.g., "Jul 10, 2:30 PM")
      const now = new Date();
      const options = { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      const formattedTimestamp = now.toLocaleString('en-US', options);
      
      // Add all form data
      addField('Timestamp', formattedTimestamp);
      addField('From', fromLoc);
      addField('To', toLoc);
      addField('Member', memberName);
      
      // Add items and quantities as comma-separated strings
      const items = [];
      const quantities = [];
      
      Object.entries(selected).forEach(([item, qty]) => {
        items.push(item);
        quantities.push(qty);
      });
      
      addField('Items', items.join(', '));
      addField('Quantity', quantities.join(', '));
      
      // Create a temporary iframe for form submission
      const tempIframe = document.createElement('iframe');
      tempIframe.name = 'form-submit-iframe';
      tempIframe.style.display = 'none';
      document.body.appendChild(tempIframe);
      
      // Set form target to the iframe
      form.target = 'form-submit-iframe';
      document.body.appendChild(form);
      
      // Handle iframe load event to know when submission is complete
      tempIframe.onload = function() {
        // Show success message
        setSuccessMessage("Submission successful!");
        setIsSubmitting(false);
        
        // Clean up
        if (document.body.contains(form)) {
          document.body.removeChild(form);
        }
        if (document.body.contains(tempIframe)) {
          document.body.removeChild(tempIframe);
        }
        
        // Refresh the data
        fetchData();
      };
      
      // Submit the form
      form.submit();
      
    } catch (error) {
      console.error("Submission error:", error);
      const errorMessage = error.message || 'An error occurred while submitting the form';
      setErrors([errorMessage]);
      setSuccessMessage("");
      setIsSubmitting(false);
    }
  }

  // Loading animation component
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <h2>Loading Inventory Form...</h2>
      </div>
    );
  }

  // Thank you message after submission
  if (successMessage && !isSubmitting) {
    return (
      <div className="thank-you-container">
        <div className="thank-you-message">
          <h2>Thank you for submitting the form! 🎉</h2>
          <p>Your inventory update has been recorded successfully.</p>
          <button 
            className="submit-button"
            onClick={() => {
              setSuccessMessage("");
              setSelected({});
              setFromLoc("");
              setToLoc("");
              setErrors([]);
              // Refresh the data
              fetchData();
            }}
          >
            Submit Another Entry
          </button>
        </div>
      </div>
    );
  }

  // Calendar view showing all sheet tabs
  if (view === 'calendar') {
    // Modified URL to show all sheet tabs
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScpFhL6WUsG3y4xHCHzfmWrT1mx2wnJaK5DmwkRqp7AoOOOYFxnFFrIU_Ijx3f5otZOTPuAbaGIL3L/pubhtml?widget=true&chrome=false';

    return (
      <div className="app">
        <div className="top-bar">
          <button className="nav-button left" onClick={() => setView('inventory')}>
            Back to Inventory
          </button>
          <h1 style={{ textAlign: 'center', flex: 1, margin: 0 }}>FTC Calendar</h1>
          <div style={{ width: '100px' }}></div> {/* Maintains layout balance */}
        </div>
        
        <div className="main-content" style={{ 
          padding: '20px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ 
            width: '100%', 
            height: '600px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            maxWidth: '100%',
            margin: '0 auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <iframe 
              src={sheetUrl}
              title="FTC Calendar"
              width="100%"
              height="100%"
              style={{
                border: 'none',
                backgroundColor: 'white',
                display: 'block' // Removes extra space below iframe
              }}
            ></iframe>
          </div>
        </div>
      </div>
    );
  }

  // Resources view
  if (view === 'resources') {
    // Filter resources based on search term
    const filteredResources = resources.filter(resource => {
      if (!searchTerm.trim()) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        (resource.name && resource.name.toLowerCase().includes(searchLower)) ||
        (resource.title && resource.title.toLowerCase().includes(searchLower)) ||
        (resource.description && resource.description.toLowerCase().includes(searchLower))
      );
    });

    return (
      <div className="app">
        <div className="top-bar">
          <h1>FTC Resources</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="nav-button right" 
              onClick={() => setView('inventory')}
              style={{ marginLeft: 'auto' }}
            >
              Back to Inventory
            </button>
          </div>
        </div>
        
        <div className="yellow-line"></div>
        
        <div className="resources-container">
          {/* Search Bar */}
          <div style={{ margin: '12px 0 12px 0', width: '100%', maxWidth: '640px', margin: '0 auto' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isLoadingResources ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading resources...</p>
            </div>
          ) : resourcesError ? (
            <div className="error-message">
              <p>Error loading resources: {resourcesError}</p>
              <button 
                className="retry-button"
                onClick={() => fetchResources()}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="resources-grid">
              {filteredResources.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                  {searchTerm ? `No resources found matching "${searchTerm}"` : 'No resources available'}
                </div>
              ) : (
                filteredResources.map((resource, index) => {
                // Extract domain from URL for display
                let domain = '';
                if (resource.link) {
                  try {
                    const url = new URL(resource.link);
                    domain = url.hostname.replace('www.', '');
                  } catch (e) {
                    domain = 'View Resource';
                  }
                }
                
                return (
                  <div key={index} className="resource-card">
                    <div className="resource-header">
                      {resource.link ? (
                        <a 
                          href={resource.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="resource-title-link"
                        >
                          <h3>{resource.name || 'Untitled Resource'}</h3>
                        </a>
                      ) : (
                        <h3>{resource.name || 'Untitled Resource'}</h3>
                      )}
                      {resource.link && (
                        <a 
                          href={resource.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="resource-domain"
                        >
                          {domain}
                        </a>
                      )}
                    </div>
                    
                    {(resource.description || resource.note) && (
                      <div className="resource-content">
                        {resource.description && <p className="resource-description">{resource.description}</p>}
                        {resource.note && <p className="resource-note">Note: {resource.note}</p>}
                      </div>
                    )}
                    
                    {resource.link && (
                      <a 
                        href={resource.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        <span>Open Resource</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 6H6V18H18V14H20V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V5C4 4.44772 4.44772 4 5 4H10V6ZM21 3V11H19V6.413L11.207 14.207L9.793 12.793L17.585 5H13V3H21Z" fill="currentColor"/>
                        </svg>
                      </a>
                    )}
                  </div>
                );
              }))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main form view
  return (
    <div className="app">
      <div className="top-bar">
        <button 
          className="nav-button left" 
          onClick={() => {
            console.log('Resources button clicked');
            setView('resources');
            fetchResources();
          }}
        >
          {isLoadingResources ? 'Loading...' : 'Resources'}
        </button>
        <h1>FTC Dashboard</h1>
        <button className="nav-button right" onClick={() => setView('calendar')}>Calendar</button>
      </div>
      
      <div className="yellow-line"></div>
      <div className="inventory-section">
        <h2>FTC Inventory</h2>
        <main className="main">
          <section className="form-card">
            <form className="form" onSubmit={(e) => Submit(e)}>
              {/* Section 1: name + location */}
              <div className="form-section">
                <label>Name:</label>
                <input placeholder="Your Name" name="Member" type="text" />
                <label>From:</label>
                <select
                  name="From"
                  value={fromLoc}
                  onChange={(e) => setFromLoc(e.target.value)}
                  required
                >
                  <option value="">-- Select From --</option>
                  <option value="School">School</option>
                  <option value="Mohnish's House">Mohnish's House</option>
                  <option value="Akshita's House">Akshita's House</option>
                  <option value="Mohana's House">Mohana's House</option>
                  <option value="Diya's House">Diya's House</option>
                  <option value="Niranjan's House">Niranjan's House</option>
                  <option value="Millan's House">Millan's House</option>
                  <option value="Bryan's House">Bryan's House</option>
                  <option value="Joseph's House">Joseph's House</option>
                  <option value="Jonathan's House">Jonathan's House</option>
                  <option value="Christopher's House">Christopher's House</option>
                  <option value="Mathew's House">Mathew's House</option>

                </select>
                <label>To:</label>
                <select 
                  name="To" 
                  value={toLoc} 
                  onChange={(e) => setToLoc(e.target.value)}
                  required
                >
                  <option value="">-- Select To --</option>
                  <option value="School">School</option>
                  <option value="Mohnish's House">Mohnish's House</option>
                  <option value="Akshita's House">Akshita's House</option>
                  <option value="Mohana's House">Mohana's House</option>
                  <option value="Diya's House">Diya's House</option>
                  <option value="Niranjan's House">Niranjan's House</option>
                  <option value="Millan's House">Millan's House</option>
                  <option value="Bryan's House">Bryan's House</option>
                  <option value="Joseph's House">Joseph's House</option>
                  <option value="Jonathan's House">Jonathan's House</option>
                  <option value="Christopher's House">Christopher's House</option>
                  <option value="Mathew's House">Mathew's House</option>

                </select>
              </div>

              {/* Section 2: checklist + quantity */}
              <div className="form-section">
                <label>Select all Items you have:</label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="checklist">
                  {filteredItems.map((item) => (
                    <div className="item-row" key={item}>
                      <label className="chk-label">
                        <input
                          type="checkbox"
                          checked={selected[item] !== undefined}
                          onChange={() => toggleItem(item)}
                        /> {item}
                      </label>
                      {selected[item] !== undefined && (
                        <input
                          type="number"
                          className="qty-input"
                          placeholder="Qty"
                          value={selected[item]}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                            if (val === '' || (!isNaN(val) && val >= 0)) {
                              setSelected((s) => ({ ...s, [item]: val === '' ? '' : val }));
                              
                              // Clear errors when user starts typing
                              if (errors.length > 0) {
                                setErrors([]);
                              }
                              
                              // Immediate validation on quantity change
                              const info = summaryMap[item];
                              if (!info) return;
                              
                              // Skip all validations for School to School transfers
                              const isSchoolToSchool = fromLoc === "School" && toLoc === "School";
                              if (!isSchoolToSchool && val > 0) {
                                const available = info.locs[fromLoc] || 0; // Empty locations are treated as 0
                                if (available < val) {
                                  console.error(`${item}: only ${available} available at '${fromLoc}', cannot move ${val}.`);
                                }
                              }
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages display */}
              {(errors.length > 0 || successMessage) && (
                <div className="message-container">
                  {errors.length > 0 && (
                    <div className="error-message">
                      {errors.map((error, index) => (
                        <div key={index} className="error-item">{error}</div>
                      ))}
                    </div>
                  )}
                  {successMessage && (
                    <div className="success-message">
                      <p>{successMessage}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Submit button */}
              <div className="form-section">
                <button 
                  type="submit" 
                  className="submit-button"
                  disabled={isSubmitting || errors.length > 0}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Transfer'}
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
