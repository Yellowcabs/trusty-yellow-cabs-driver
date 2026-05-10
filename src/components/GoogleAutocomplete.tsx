/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface GoogleAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function GoogleAutocomplete({ 
  onPlaceSelect, 
  placeholder = "Search location...", 
  defaultValue = "",
  className = "",
  icon
}: GoogleAutocompleteProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Track if we are currently manually typing or selecting to avoid defaultValue overrides
  const [isFocused, setIsFocused] = useState(false);
  const lastDefaultValue = useRef(defaultValue);

  useEffect(() => {
    // Only update if defaultValue changed from the OUTSIDE
    if (defaultValue !== lastDefaultValue.current) {
      setInputValue(defaultValue);
      lastDefaultValue.current = defaultValue;
    }
  }, [defaultValue]);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['address_components', 'geometry', 'formatted_address', 'name'],
      // Remove country restriction to allow all locations as requested
      // componentRestrictions: { country: 'in' }, 
      
      // Bias results to Coimbatore first preference
      locationBias: {
        center: { lat: 11.0168, lng: 76.9558 },
        radius: 50000 // 50km radius
      }
    };

    autocompleteRef.current = new places.Autocomplete(inputRef.current, options);

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place && place.geometry) {
        const address = place.formatted_address || place.name || '';
        setInputValue(address);
        lastDefaultValue.current = address; // Mark as processed locally
        onPlaceSelect(place);
      }
    });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [places, onPlaceSelect]);

  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          {icon}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          // Sync back to default if they didn't pick anything but defaultValue is set
          if (!inputValue && defaultValue) {
            setInputValue(defaultValue);
          }
        }}
        onChange={(e) => {
          setInputValue(e.target.value);
        }}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
