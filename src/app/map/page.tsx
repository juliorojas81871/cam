'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { 
  Box, 
  Paper, 
  Typography, 
  Alert, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  SelectChangeEvent,
  Snackbar,
} from '@mui/material';
import { useData } from '@/contexts/DataContext';

interface CombinedProperty {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  address: string;
  type: 'Owned' | 'Leased';
  status: string;
  constructionDate?: string;
  leaseNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
}

interface MapComponentProps {
  properties: CombinedProperty[];
  center: google.maps.LatLngLiteral;
  zoom: number;
}

// Custom marker class factory function to avoid "google is not defined" error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCustomMapMarkerClass() {
  if (typeof window === 'undefined' || !(window as any).google) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class CustomMapMarker extends (window as any).google.maps.OverlayView {
    position: google.maps.LatLngLiteral;
    property: CombinedProperty;
    div: HTMLDivElement | null = null;
    openStreetViewCallback: (position: google.maps.LatLngLiteral, property: CombinedProperty) => void;
    infoWindow: google.maps.InfoWindow | null;
    map: google.maps.Map;

    constructor(
      position: google.maps.LatLngLiteral,
      map: google.maps.Map,
      property: CombinedProperty,
      openStreetViewCallback: (position: google.maps.LatLngLiteral, property: CombinedProperty) => void,
      infoWindow: google.maps.InfoWindow | null
    ) {
      super();
      this.position = position;
      this.property = property;
      this.openStreetViewCallback = openStreetViewCallback;
      this.infoWindow = infoWindow;
      this.map = map;
      this.setMap(map);
    }

    onAdd() {
      this.div = document.createElement('div');
      this.div.style.position = 'absolute';
      this.div.style.cursor = 'pointer';

      const markerColor = this.property.type === 'Owned' ? '#1976d2' : '#ff9800';
      this.div.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: ${markerColor};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          position: relative;
          transition: transform 0.2s ease;
        ">
          <div style="
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 10px solid ${markerColor};
          "></div>
        </div>
      `;

      this.div.addEventListener('click', () => {
        this.openStreetViewCallback(this.position, this.property);
      });

      this.div.addEventListener('mouseover', () => {
        if (this.div) {
          this.div.style.transform = 'scale(1.2)';
        }

        if (this.infoWindow) {
          this.infoWindow.setContent(`
            <div style="padding: 12px; max-width: 280px;">
              <h4 style="margin: 0 0 8px 0; color: #333;">${this.property.name}</h4>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Type:</strong>
                <span style="color: ${this.property.type === 'Owned' ? '#1976d2' : '#ff9800'}; font-weight: bold;">${this.property.type}</span>
              </p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> ${this.property.status}</p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Address:</strong> ${this.property.address}</p>
              ${this.property.constructionDate ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Built:</strong> ${this.property.constructionDate}</p>` : ''}
              <div style="margin-top: 8px; padding: 4px 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; color: #666;">
                Click marker to view in Street View
              </div>
            </div>
          `);
          this.infoWindow.setPosition(this.position);
          this.infoWindow.open(this.map);
        }
      });

      this.div.addEventListener('mouseout', () => {
        if (this.div) {
          this.div.style.transform = 'scale(1)';
        }
        if (this.infoWindow) {
          this.infoWindow.close();
        }
      });

      const panes = this.getPanes()!;
      panes.overlayMouseTarget.appendChild(this.div);
    }

    draw() {
      const overlayProjection = this.getProjection();
      const pos = overlayProjection.fromLatLngToDivPixel(this.position);

      if (pos && this.div) {
        this.div.style.left = (pos.x - 15) + 'px';
        this.div.style.top = (pos.y - 37) + 'px';
      }
    }

    onRemove() {
      if (this.div && this.div.parentNode) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    }
  }

  return CustomMapMarker;
}

const MapComponent: React.FC<MapComponentProps> = ({ properties, center, zoom }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [streetView, setStreetView] = useState<google.maps.StreetViewPanorama | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'info' | 'success' | 'error'>('info');
  const [showToast, setShowToast] = useState(false);
  const [isLoadingStreetView, setIsLoadingStreetView] = useState(false);
  const markersRef = useRef<any[]>([]);
  const streetViewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null && !map) {
      const newMap = new window.google.maps.Map(node, {
        center,
        zoom,
        mapTypeId: 'roadmap',
        streetViewControl: true,
        fullscreenControl: true,
        mapTypeControl: true,
        zoomControl: true,
      });
      setMap(newMap);

      // Inject styles to improve InfoWindow positioning
      const style = document.createElement('style');
      style.innerHTML = `
        .gm-style-iw-c {
          padding: 0 !important;
        }
        .gm-style-iw-d {
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(style);

      const newInfoWindow = new window.google.maps.InfoWindow({
        pixelOffset: new window.google.maps.Size(0, -45)
      });
      setInfoWindow(newInfoWindow);
    }
  }, [map, center, zoom]);

  const openStreetView = useCallback((position: google.maps.LatLngLiteral, property: CombinedProperty) => {
    if (!map || isLoadingStreetView) return;

    setIsLoadingStreetView(true);

    if (streetViewTimeoutRef.current) {
      clearTimeout(streetViewTimeoutRef.current);
    }

    const streetViewService = new window.google.maps.StreetViewService();

    setToastMessage('Loading Street View...');
    setToastSeverity('info');
    setShowToast(true);

    streetViewService.getPanorama({
      location: position,
      radius: 100,
      source: window.google.maps.StreetViewSource.OUTDOOR
    }, (data, status) => {
      if (status === 'OK') {
        if (infoWindow) {
          infoWindow.close();
        }

        const streetViewDiv = document.getElementById('street-view');
        if (streetViewDiv) {
          streetViewDiv.style.height = '600px';
          streetViewDiv.style.overflow = 'visible';
        }

        if (!streetView && streetViewDiv) {
          const panorama = new window.google.maps.StreetViewPanorama(streetViewDiv, {
            position: position,
            pov: { heading: 165, pitch: 0 },
            zoom: 1,
            visible: true,
            addressControl: true,
            enableCloseButton: true,
            panControl: true,
            zoomControl: true,
          });
          setStreetView(panorama);

          panorama.addListener('closeclick', () => {
            if (streetViewDiv) {
              streetViewDiv.style.height = '0px';
              streetViewDiv.style.overflow = 'hidden';
            }
            setToastMessage('Street View closed');
            setToastSeverity('info');
            setShowToast(true);
            setIsLoadingStreetView(false);
          });

        } else if (streetView) {
          streetViewTimeoutRef.current = setTimeout(() => {
            streetView.setPosition(position);
            streetView.setVisible(true);
          }, 300);
        }

        setToastMessage(`Street View opened for ${property.name}`);
        setToastSeverity('success');
        setShowToast(true);

        setTimeout(() => {
          setIsLoadingStreetView(false);
        }, 1000);

      } else {
        setToastMessage(`Street View not available for ${property.name}`);
        setToastSeverity('error');
        setShowToast(true);
        setIsLoadingStreetView(false);
      }
    });
  }, [map, streetView, isLoadingStreetView, infoWindow]);

  useEffect(() => {
    if (map) {
      markersRef.current.forEach(marker => {
        if (marker.setMap) {
          marker.setMap(null);
        } else if (marker.map) {
          marker.map = null;
        } else if (marker.onRemove) {
          marker.onRemove();
        }
      });
      markersRef.current = [];

      if (properties.length === 0) {
        return;
      }
      const newMarkers = properties.map(property => {
        if (!property.latitude || !property.longitude) return null;

        const position: google.maps.LatLngLiteral = {
          lat: parseFloat(property.latitude),
          lng: parseFloat(property.longitude)
        };

        if ((window.google as any)?.maps?.marker?.AdvancedMarkerElement) {
          try {
            const markerColor = property.type === 'Owned' ? '#1976d2' : '#ff9800';
            const markerContent = document.createElement('div');
            markerContent.className = 'custom-marker';
            markerContent.innerHTML = `
              <div style="
                width: 24px;
                height: 24px;
                background: ${markerColor};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                cursor: pointer;
                position: relative;
                transition: transform 0.2s ease;
              " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
                <div style="
                  position: absolute;
                  bottom: 100%;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 0;
                  height: 0;
                  border-left: 8px solid transparent;
                  border-right: 8px solid transparent;
                  border-top: 10px solid ${markerColor};
                "></div>
              </div>
            `;

            const marker = new (window.google as any).maps.marker.AdvancedMarkerElement({
              position,
              map,
              title: property.name,
              content: markerContent,
            });

            markerContent.addEventListener('click', () => {
              openStreetView(position, property);
            });

            markerContent.addEventListener('mouseover', () => {
              if (infoWindow) {
                infoWindow.setContent(`
                  <div style="padding: 12px; max-width: 280px;">
                    <h4 style="margin: 0 0 8px 0; color: #333;">${property.name}</h4>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Type:</strong>
                      <span style="color: ${property.type === 'Owned' ? '#1976d2' : '#ff9800'}; font-weight: bold;">${property.type}</span>
                    </p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> ${property.status}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Address:</strong> ${property.address}</p>
                    ${property.constructionDate ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Built:</strong> ${property.constructionDate}</p>` : ''}
                    <div style="margin-top: 8px; padding: 4px 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; color: #666;">
                      Click marker to view in Street View
                    </div>
                  </div>
                `);
                infoWindow.open({
                  anchor: marker,
                  map
                });
              }
            });

            markerContent.addEventListener('mouseout', () => {
              if (infoWindow) {
                infoWindow.close();
              }
            });

            return marker;
          } catch (error) {
            console.warn('AdvancedMarkerElement failed:', error);
          }
        }

        // Fallback to custom overlay marker
        const CustomMapMarkerClass = createCustomMapMarkerClass();
        if (CustomMapMarkerClass) {
          return new CustomMapMarkerClass(position, map, property, openStreetView, infoWindow);
        }
        return null;
      }).filter(Boolean);

      markersRef.current = newMarkers;
    }
  }, [map, properties, infoWindow, openStreetView]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => {
        if (marker.map) {
          marker.map = null;
        } else if (marker.setMap) {
          marker.setMap(null);
        }
      });

      if (streetViewTimeoutRef.current) {
        clearTimeout(streetViewTimeoutRef.current);
      }
    };
  }, []);

  const handleCloseToast = () => {
    setShowToast(false);
  };

  return (
    <Box>
      <div ref={mapRef} style={{ width: '100%', height: '600px', borderRadius: '8px' }} />
      <div id="street-view" style={{
        width: '100%',
        height: '0px',
        overflow: 'hidden',
        borderRadius: '8px',
        marginTop: '16px',
        transition: 'height 0.3s ease'
      }} />

      <Snackbar
        open={showToast}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toastSeverity}
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default function MapPage() {
  const { owned, leases, loading, error } = useData();
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');

  const allProperties = useMemo<CombinedProperty[]>(() => {
    if (!owned || !leases) {
      return [];
    }

    const ownedArray = Array.isArray(owned) ? owned : [];
    const leasesArray = Array.isArray(leases) ? leases : [];

    const ownedProperties: CombinedProperty[] = ownedArray.map(building => ({
      id: `owned-${building.id}`,
      name: (building.cleanedBuildingName || building.realPropertyAssetName || 'Unknown Building') as string,
      latitude: building.latitude as string,
      longitude: building.longitude as string,
      address: `${building.streetAddress || ''}, ${building.city || ''}, ${building.state || ''} ${building.zipCode || ''}`.replace(/^,\s*/, ''),
      type: 'Owned' as const,
      status: (building.buildingStatus || 'Active') as string,
      constructionDate: building.constructionDate as string | undefined,
    }));

    const leasedProperties: CombinedProperty[] = leasesArray.map(lease => ({
      id: `leased-${lease.id}`,
      name: (lease.cleanedBuildingName || lease.realPropertyAssetName || 'Unknown Building') as string,
      latitude: lease.latitude as string,
      longitude: lease.longitude as string,
      address: `${lease.streetAddress || ''}, ${lease.city || ''}, ${lease.state || ''} ${lease.zipCode || ''}`.replace(/^,\s*/, ''),
      type: 'Leased' as const,
      status: 'Active',
      leaseNumber: lease.leaseNumber as string | undefined,
      effectiveDate: lease.leaseEffectiveDate as string | undefined,
      expirationDate: lease.leaseExpirationDate as string | undefined,
    }));

    return [...ownedProperties, ...leasedProperties].filter(property =>
      property.latitude &&
      property.longitude &&
      !isNaN(parseFloat(property.latitude)) &&
      !isNaN(parseFloat(property.longitude)) &&
      parseFloat(property.latitude) >= 24.396308 &&
      parseFloat(property.latitude) <= 49.384358 &&
      parseFloat(property.longitude) >= -125.0 &&
      parseFloat(property.longitude) <= -66.93457
    );
  }, [owned, leases]);

  const filteredProperties = useMemo(() => {
    return allProperties.filter(property => {
      if (propertyTypeFilter !== 'all' && property.type !== propertyTypeFilter) {
        return false;
      }
      return true;
    });
  }, [allProperties, propertyTypeFilter]);

  const handlePropertyTypeFilterChange = (event: SelectChangeEvent) => {
    setPropertyTypeFilter(event.target.value);
  };

  const center = useMemo(() => {
    return { lat: 39.8283, lng: -98.5795 };
  }, []);

  const zoom = useMemo(() => {
    return 4;
  }, []);

  const render = (status: Status) => {
    if (status === Status.LOADING) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="600px">
          <Typography>Loading map...</Typography>
        </Box>
      );
    }

    if (status === Status.FAILURE) {
      return (
        <Alert severity="error">
          Failed to load Google Maps. Please check your API key configuration.
        </Alert>
      );
    }

    return <MapComponent properties={filteredProperties} center={center} zoom={zoom} />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Property Locations Map
      </Typography>

      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Interactive map showing all property locations with Street View integration
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Property Type</InputLabel>
          <Select
            value={propertyTypeFilter}
            label="Property Type"
            onChange={handlePropertyTypeFilterChange}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="Owned">Owned</MenuItem>
            <MenuItem value="Leased">Leased</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary">
          Showing {filteredProperties.length} of {allProperties.length} properties
        </Typography>
      </Box>

      {/* Legend */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 20,
            height: 20,
            backgroundColor: '#1976d2',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }} />
          <Typography variant="body2">Owned Properties</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 20,
            height: 20,
            backgroundColor: '#ff9800',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }} />
          <Typography variant="body2">Leased Properties</Typography>
        </Box>
      </Box>

      {/* Map */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Interactive Property Map
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click on any marker to view the property in Google Street View. Hover for property details.
        </Typography>
        <Wrapper
          apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
          render={render}
        />
      </Paper>
    </Box>
  );
}
