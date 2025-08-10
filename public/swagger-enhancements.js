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
  
  // Create enhanced input with suggestions
  function createEnhancedInput(input, suggestions, paramType) {
    // Skip if already enhanced
    if (input.hasAttribute('data-enhanced')) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'parameter-input-wrapper';
    
    // Replace input with wrapper
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    
    // Create suggestions container
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'parameter-suggestions';
    wrapper.appendChild(suggestionsContainer);
    
    // Add placeholder text based on parameter type
    const placeholders = {
      'origins': 'Ej: la_favorita, brou, cambio_minas...',
      'currencies': 'Ej: USD, EUR, ARS, BRL...',
      'types': 'Ej: BILLETE, CABLE, INTERBANCARIO...',
      'locations': 'Ej: Montevideo, Canelones, Maldonado...'
    };
    
    if (placeholders[paramType]) {
      input.placeholder = placeholders[paramType];
    }
    
    // Show suggestions on focus/input
    function showSuggestions() {
      const value = input.value.toLowerCase();
      const filtered = suggestions.filter(item => 
        item.toLowerCase().includes(value)
      ).slice(0, 10); // Limit to 10 suggestions
      
      suggestionsContainer.innerHTML = '';
      
      if (filtered.length > 0 && (value !== '' || document.activeElement === input)) {
        filtered.forEach(suggestion => {
          const item = document.createElement('div');
          item.className = 'parameter-suggestion-item';
          item.textContent = suggestion;
          item.onclick = () => {
            input.value = suggestion;
            hideSuggestions();
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          };
          suggestionsContainer.appendChild(item);
        });
        suggestionsContainer.style.display = 'block';
      } else {
        hideSuggestions();
      }
    }
    
    function hideSuggestions() {
      suggestionsContainer.style.display = 'none';
    }
    
    // Event listeners
    input.addEventListener('input', showSuggestions);
    input.addEventListener('focus', () => {
      if (suggestions.length > 0) {
        showSuggestions();
      }
    });
    input.addEventListener('blur', () => {
      // Delay hiding to allow clicking on suggestions
      setTimeout(hideSuggestions, 200);
    });
    
    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      const items = suggestionsContainer.querySelectorAll('.parameter-suggestion-item');
      let currentIndex = -1;
      
      // Find currently highlighted item
      items.forEach((item, index) => {
        if (item.classList.contains('highlighted')) {
          currentIndex = index;
        }
      });
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        highlightItem(items, nextIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        highlightItem(items, prevIndex);
      } else if (e.key === 'Enter' && currentIndex >= 0) {
        e.preventDefault();
        items[currentIndex].click();
      } else if (e.key === 'Escape') {
        hideSuggestions();
      }
    });
    
    function highlightItem(items, index) {
      items.forEach(item => {
        item.classList.remove('highlighted');
        item.style.backgroundColor = '';
      });
      if (items[index]) {
        items[index].classList.add('highlighted');
        items[index].style.backgroundColor = '#e3f2fd';
      }
    }
    
    // Mark as enhanced
    input.setAttribute('data-enhanced', 'true');
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
            // Check for parameter inputs
            const paramInputs = node.querySelectorAll ? 
              node.querySelectorAll('input[type="text"], input:not([type])') : [];
            
            paramInputs.forEach(async (input) => {
              if (input.hasAttribute('data-enhanced')) return;
              
              // Get context from Swagger UI structure
              const parameterRow = input.closest('.parameter__name, .parameters-col_description, tr');
              const placeholder = input.placeholder?.toLowerCase() || '';
              const name = input.name?.toLowerCase() || '';
              const parameterName = parameterRow?.textContent?.toLowerCase() || '';
              
              let paramType = null;
              let endpoint = null;
              let arrayKey = null;
              
              // Enhanced detection logic
              if (placeholder.includes('origin') || name.includes('origin') || parameterName.includes('origin')) {
                paramType = 'origins';
                endpoint = 'origins';
                arrayKey = 'origins';
              } else if (placeholder.includes('code') || name.includes('code') || parameterName.includes('code') || parameterName.includes('currency')) {
                paramType = 'currencies';
                endpoint = 'currencies';
                arrayKey = 'currencies';
              } else if (placeholder.includes('type') || name.includes('type') || (parameterName.includes('type') && !parameterName.includes('content-type'))) {
                paramType = 'types';
                endpoint = 'types';
                arrayKey = 'types';
              } else if (placeholder.includes('location') || name.includes('location') || parameterName.includes('location')) {
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
    
    // Start the observer
    enhanceParameterInputsAdvanced();
    
    // Initial enhancement
    setTimeout(enhanceParameterInputs, 1000);
    
    // Periodic enhancement for dynamically loaded content
    setInterval(scheduleEnhancement, 3000);
    
    // Enhance when Swagger operations are expanded
    document.addEventListener('click', (e) => {
      if (e.target.closest('.opblock-summary, .try-out__btn')) {
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
