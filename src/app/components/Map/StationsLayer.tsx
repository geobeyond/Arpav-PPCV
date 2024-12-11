import L from 'leaflet';
import { Circle, CircleMarker, Popup, Pane, useMap } from 'react-leaflet';
import { useSelector } from 'react-redux';
import { useLeafletContext, withPane } from '@react-leaflet/core';
import React, { useEffect, useRef, useState } from 'react';
import 'leaflet.vectorgrid';
import { VECTORTILES_URL } from '../../../utils/constants';

import { Button, Paper, Box, IconButton, Typography } from '@mui/material';
import { MapPopup } from '../MapSearch';

import { PopupStyle } from './styles';

export const StationsLayer = (props: any) => {
  const { selected_map } = useSelector((state: any) => state.map);
  const { selectCallback, selectedPoint, openCharts, zIndex } = props;
  const map = useMap();
  const context = useLeafletContext();
  // console.log(context.map.latLngToLayerPoint(selectedPoint.latlng))
  // const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    let selected = false;
    // let hovered = false;
    const container = context.layerContainer || context.map;
    // const url = 'https://arpav.geobeyond.dev/vector-tiles/stations/{z}/{x}/{y}';
    const url = process.env.REACT_APP_BACKEND_PUBLIC_URL + '/vector-tiles/stations/{z}/{x}/{y}';

    context.map.createPane('stations');
    // @ts-ignore
    context.map.getPane('stations').style.zIndex = zIndex;

    // @ts-ignore
    let vectorLayer = L.vectorGrid.protobuf(url, {
      interactive: true,
      pane: 'stations',
      vectorTileLayerStyles: {
        stations: (properties, zoom, geometryDimension) => {
          let opacity = 0.9;
          let color = '#528ed2';
          // console.log(zoom, color, opacity)
          return {
            color: color,
            weight: 1,
            radius: 3,
            fill: true,
            fillOpacity: 0.7,
            opacity: opacity,
          };
        },
      },
    });

    context.map.addLayer(vectorLayer);
    vectorLayer.bringToFront();

    return () => {
      // console.log('RETURN')
      try {
        // @ts-ignore
        if (vectorLayer) container.removeLayer(vectorLayer);
      } catch (e) {
        console.log('error REMOVING', e);
      }
    };
  }, [
    selected_map,
    map,
    selectedPoint,
    context.layerContainer,
    context.map,
    selectCallback,
  ]);

  return (
    selectedPoint && (
      <Pane name="custom" style={{ zIndex: 1000 }}>
        <CircleMarker
          center={[selectedPoint.latlng.lat, selectedPoint.latlng.lng]}
          radius={2}
          pathOptions={{ color: '#164d36' }}
        >
          <Popup>
            <Box sx={PopupStyle}></Box>
          </Popup>
        </CircleMarker>
      </Pane>
    )
  );
};
