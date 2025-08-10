// Enhanced parameter inputs with dynamic datalists for Swagger UI
(function() {
  let apiCache = {};
  const API_BASE = window.location.origin;
  
  // Fetch API parameters with caching
  async function fetchApiParameters(endpoint) {
    if (apiCache[endpoint]) {
      return apiCache[endpoint];
    }
    
    try {
      const response = await fetch(`${API_BASE}/parameters/${endpoint}`);
      const data = await response.json();
      apiCache[endpoint] = data;
      return data;
    } catch (error) {
      console.warn(`Failed to fetch ${endpoint} parameters:`, error);
      return null;
    }
  }
  
  // Create enhanced input with suggestions using datalist (non-intrusive)
  function createEnhancedInput(input, suggestions, paramType) {
    // Skip if already enhanced
    if (input.hasAttribute('data-enhanced')) return;
    
    // Create a unique ID for the datalist
    const datalistId = 'datalist-' + paramType + '-' + Math.random().toString(36).substr(2, 9);
    
    // Create datalist element
    const datalist = document.createElement('datalist');
    datalist.id = datalistId;
    
    // Populate datalist with suggestions
    suggestions.forEach(suggestion => {
      const option = document.createElement('option');
      option.value = suggestion;
      datalist.appendChild(option);
    });
    
    // Add datalist to document
    document.body.appendChild(datalist);
    
    // Connect input to datalist
    input.setAttribute('list', datalistId);
    
    // Add placeholder text based on parameter type
    const placeholders = {
      'origins': 'Ej: la_favorita, brou, cambio_minas...',
      'currencies': 'Ej: USD, EUR, ARS, BRL...',
      'types': 'Ej: BILLETE, CABLE, INTERBANCARIO...',
      'locations': 'Ej: Montevideo, Canelones, Maldonado...'
    };
    
    if (placeholders[paramType] && !input.placeholder) {
      input.placeholder = placeholders[paramType];
    }
    
    // Mark as enhanced
    input.setAttribute('data-enhanced', 'true');
    input.setAttribute('data-datalist-id', datalistId);
    
    // Clean up datalist when input is removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === input || (node.contains && node.contains(input))) {
            const datalistElement = document.getElementById(datalistId);
            if (datalistElement) {
              datalistElement.remove();
            }
            observer.disconnect();
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Process parameter inputs
  async function enhanceParameterInputs() {
    const parameterMappings = [
      { 
        selector: 'input[placeholder*="origin"], input[data-param*="origin"]',
        endpoint: 'origins',
        arrayKey: 'origins'
      },
      { 
        selector: 'input[placeholder*="code"], input[data-param*="currency"]',
        endpoint: 'currencies', 
        arrayKey: 'currencies'
      },
      { 
        selector: 'input[placeholder*="type"], input[data-param*="type"]',
        endpoint: 'types',
        arrayKey: 'types'
      },
      { 
        selector: 'input[placeholder*="location"], input[data-param*="location"]',
        endpoint: 'locations',
        arrayKey: 'locations'
      }
    ];
    
    for (const mapping of parameterMappings) {
      const data = await fetchApiParameters(mapping.endpoint);
      if (data && data[mapping.arrayKey] && data[mapping.arrayKey].length > 0) {
        const inputs = document.querySelectorAll(mapping.selector);
        inputs.forEach(input => {
          if (!input.hasAttribute('data-enhanced')) {
            createEnhancedInput(input, data[mapping.arrayKey], mapping.endpoint);
          }
        });
      }
    }
  }
  
  // Enhanced parameter detection based on Swagger UI structure
  function enhanceParameterInputsAdvanced() {
    // Look for parameter inputs in Swagger UI
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check for parameter inputs more specifically
            const paramInputs = node.querySelectorAll ? 
              node.querySelectorAll('input[type="text"]:not([data-enhanced]), input:not([type]):not([data-enhanced])') : [];
            
            paramInputs.forEach(async (input) => {
              // Skip inputs that are not part of Swagger UI parameters
              if (input.hasAttribute('data-enhanced') || 
                  input.closest('.auth-wrapper') || 
                  input.closest('.download-contents') ||
                  !input.closest('.parameters')) {
                return;
              }
              
              // Get context from Swagger UI structure
              const parameterRow = input.closest('tr, .parameter__name, .parameters-col_description');
              const parameterLabel = parameterRow?.querySelector('td:first-child, .parameter__name')?.textContent?.toLowerCase() || '';
              const placeholder = input.placeholder?.toLowerCase() || '';
              const name = input.name?.toLowerCase() || '';
              
              let paramType = null;
              let endpoint = null;
              let arrayKey = null;
              
              // Enhanced detection logic with more specific patterns
              if (parameterLabel.includes('origin') || name.includes('origin') || placeholder.includes('origin')) {
                paramType = 'origins';
                endpoint = 'origins';
                arrayKey = 'origins';
              } else if (parameterLabel.includes('code') || name.includes('code') || placeholder.includes('code') || 
                         parameterLabel.includes('currency') || name.includes('currency') || placeholder.includes('currency')) {
                paramType = 'currencies';
                endpoint = 'currencies';
                arrayKey = 'currencies';
              } else if (parameterLabel.includes('type') && !parameterLabel.includes('content-type') || 
                         (name.includes('type') && !name.includes('content-type')) || 
                         (placeholder.includes('type') && !placeholder.includes('content-type'))) {
                paramType = 'types';
                endpoint = 'types';
                arrayKey = 'types';
              } else if (parameterLabel.includes('location') || name.includes('location') || placeholder.includes('location')) {
                paramType = 'locations';
                endpoint = 'locations';
                arrayKey = 'locations';
              }
              
              if (paramType) {
                const data = await fetchApiParameters(endpoint);
                if (data && data[arrayKey] && data[arrayKey].length > 0) {
                  createEnhancedInput(input, data[arrayKey], paramType);
                }
              }
            });
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Debounced enhancement function
  let enhancementTimeout;
  function scheduleEnhancement() {
    clearTimeout(enhancementTimeout);
    enhancementTimeout = setTimeout(() => {
      enhanceParameterInputs();
    }, 500);
  }
  
  // Initialize when DOM is ready
  function initialize() {
    console.log('🚀 Swagger parameter enhancements initialized');
    
    // Start the observer for dynamic content
    enhanceParameterInputsAdvanced();
    
    // Initial enhancement after Swagger UI loads
    setTimeout(enhanceParameterInputs, 2000);
    
    // Enhance when Swagger operations are expanded
    document.addEventListener('click', (e) => {
      if (e.target.closest('.opblock-summary, .try-out__btn, .btn.execute')) {
        setTimeout(scheduleEnhancement, 1000);
      }
    });
    
    // Also enhance when tabs are switched or operations are expanded
    document.addEventListener('click', (e) => {
      if (e.target.closest('.opblock')) {
        setTimeout(scheduleEnhancement, 500);
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
})();
