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

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['address_components', 'geometry', 'formatted_address', 'name'],
    };

    autocompleteRef.current = new places.Autocomplete(inputRef.current, options);

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place) {
        setInputValue(place.formatted_address || place.name || '');
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
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
