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

export const VectorWrapperLayer = (props: any) => {
  const currentTimeSerie = props.currentTimeserie;
  const zIndex = props.zIndex;
  const [refReady, setRefReady] = useState(false);
  let popupRef: any = useRef();

  const { selected_map } = useSelector((state: any) => state.map);
  const { selectCallback, selectedPoint, openCharts, unit, precision } = props;
  const map = useMap();
  const context = useLeafletContext();

  let selected = false;

  const url = `${VECTORTILES_URL}/public.places_cities.geometry/{z}/{x}/{y}.pbf`;

  useEffect(() => {
    context.map.createPane('municipalities');
    // @ts-ignore
    context.map.getPane('municipalities').style.zIndex = zIndex;
    // @ts-ignore
    const _vectorLayer = L.vectorGrid
      .protobuf(url, {
        interactive: true,
        pane: 'municipalities',
        vectorTileLayerStyles: {
          'public.places_cities.geometry': {
            color: '#b6b6b6',
            weight: 1,
            radius: 1,
            fill: true,
            fillOpacity: 0,
            opacity: 0.2,
          },
        },

        getFeatureId: function (f) {
          return f.properties.name;
        },
      })
      .on('click', function (e) {
        _vectorLayer.resetFeatureStyle(selected);
        selected = e.layer.properties.name;
        _vectorLayer.setFeatureStyle(e.layer.properties.name, {
          color: '#164d36',
          weight: 2,
          radius: 1,
          fill: true,
          fillOpacity: 0,
          opacity: 1,
        });
        _vectorLayer.bringToFront();
        if (selected && e.layer) {
          const payload = {
            ...e.layer.properties,
            latlng: e.latlng,
            label: e.layer.properties.name,
          };
          // console.log(payload)
          selectCallback(payload);
          setTimeout(() => {
            try {
              popupRef.current.openPopup();
            } catch (ex) {
              console.log(ex);
            }
          }, 250);
        }
      });
    map.addLayer(_vectorLayer);
  }, []);

  // console.log(context.map.latLngToLayerPoint(selectedPoint.latlng))
  // const [selected, setSelected] = useState<any>(null);

  return (
    selectedPoint && (
      <Pane name="custom" style={{ zIndex: 1000 }}>
        <CircleMarker
          ref={popupRef}
          center={[selectedPoint.latlng.lat, selectedPoint.latlng.lng]}
          radius={2}
          pathOptions={{ color: '#164d36' }}
        >
          <Popup>
            <Box sx={PopupStyle}>
              <MapPopup
                openCharts={openCharts}
                value={selectedPoint}
                currentTimeserie={currentTimeSerie}
                unit={unit}
                precision={precision}
              ></MapPopup>
            </Box>
          </Popup>
        </CircleMarker>
      </Pane>
    )
  );
};
