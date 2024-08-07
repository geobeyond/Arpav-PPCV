import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, useMediaQuery } from '@mui/material';
import sensorPositions from './data';
import L from 'leaflet';

import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  ZoomControl,
  LayersControl,
  Circle,
  CircleMarker,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet';
import { Map as LMap } from 'leaflet';
import {
  MousePositionComponent,
  MousePositionComponentProps,
  MousePositionControlProps,
} from '../MousePosition';
import { MapSearch } from '../MapSearch';
import { DummyControlComponent } from '../DummyMapControl';
import { useSelector } from 'react-redux';
import { ThreddsWrapperLayer } from './ThreddsWrapperLayer';
import CustomControlMap from './CustomControlMap';
import { LegendBar } from './LegendBar';
import { VectorWrapperLayer } from './VectorWrapperLayer';
import { roundTo4 } from '../../../utils/json_manipulations';
import { iCityItem } from '../../pages/MapPage/slice/types';
import {
  MapContainerStyle,
  MobileSpaceDisplayStyle,
  MousePositionDisplayStyle,
} from './styles';
import { OpacityComponent } from './OpacityComponent';
import { Tooltip, UncontrolledTooltip, Button } from 'design-react-kit';
import InfoIcon from '@mui/icons-material/Info';
import { TWLSample } from './TWLSample';

// import {BaseLayerControl} from "./BaseLayerControl";

const MobileSpaceDisplay = () => {
  return (
    <div
      className={'custom-panel leaflet-bar leaflet-control'}
      style={MobileSpaceDisplayStyle}
    // style={{visibility: 'hidden'}}
    ></div>
  );
};

const MousePositionDisplay = (props: MousePositionControlProps) => {
  //{props.latlng.lat}
  //{props.latlng.lng}
  return (
    <Box
      className={
        'custom-panel leaflet-bar leaflet-control leaflet-control-coordinates'
      }
      sx={MousePositionDisplayStyle}
    >
      <div>
        {`Lat 
      ${roundTo4(props.latlng.lat)}`}
        <span style={{ visibility: 'hidden' }}>__</span>
        {`Long 
      ${roundTo4(props.latlng.lng)}`}
      </div>
    </Box>
  );
};

const MobileMousePositionDisplay = (props: MousePositionControlProps) => {
  return <></>;
};

interface MapProps {
  onReady?: (map: LMap) => void;
  openCharts?: (iCityItem) => void;
  setPoint?: Function;
  selectedPoint?: iCityItem | null;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

const Map = (props: MapProps) => {
  const {
    setPoint = () => { },
    openCharts = () => { },
    onReady = () => { },
    selectedPoint = null,
    defaultCenter = [45.9, 12.45],
    defaultZoom = 8,
  } = props;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('def'));

  const timeDimensionOptions = {
    // requestTimeFromCapabilities: true,
    // updateTimeDimension: true,
  };

  const [click, setClick] = React.useState();

  const vectorWrapperRef = useRef();
  const ref5 = useRef(null);

  const [timeStatus, setTimeStatus] = React.useState('none');

  return (
    <MapContainer
      style={MapContainerStyle}
      className="main-map"
      // @ts-ignore
      center={defaultCenter}
      zoom={defaultZoom}
      maxZoom={19}
      zoomControl={false}
      // @ts-ignore
      timeDimensionControl={true}
      timeDimensionextendedControl={true}
      timeDimension={true}
      timeDimensionOptions={timeDimensionOptions}
      timeDimensionControlOptions={{
        speedSlider: false,
        backwardButton: true,
        forwardButton: true,
        playButton: false,
      }}
      //@ts-ignore
      whenReady={obj => onReady(obj.target)}
    >
      <ZoomControl position={'topright'} />
      {isMobile && (
        <DummyControlComponent
          position={'topright'}
          customComponent={MobileSpaceDisplay}
        />
      )}
      <CustomControlMap position={'topright'}>
        <Box
          className="leaflet-bar"
          style={{ backgroundColor: 'white', padding: '2px' }}
        >
          <OpacityComponent></OpacityComponent>
        </Box>
        <LegendBar
          className={'leaflet-control-legend leaflet-control leaflet-bar'}
          isMobile={isMobile}
        />
      </CustomControlMap>
      <MousePositionComponent
        position={'bottomright'}
        customComponent={
          isMobile ? MobileMousePositionDisplay : MousePositionDisplay
        }
      // onClick={onMapClick}
      />
      <CustomControlMap position={'topleft'}>
        <MapSearch
          className={'leaflet-control-search'}
          value={selectedPoint}
          setPoint={setPoint}
          openCharts={openCharts}
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          vectorLayer={vectorWrapperRef}
          customClick={setClick}
        />
      </CustomControlMap>
      {/*<BaseLayerControl/>*/}
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a target="_blank" rel="noopener" href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Sentinel 2">
          <TileLayer
            url="https://s2maps-tiles.eu/wmts?layer=s2cloudless-2021_3857&style=default&tilematrixset=GoogleMapsCompatible&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image%2Fjpeg&TileMatrix={z}&TileCol={x}&TileRow={y}"
            attribution='&copy; <a target="_blank" rel="noopener" href="https://s2maps.eu/">Sentinel-2 cloudless</a> by EOX'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenTopoMap">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='map data: © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
          />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay checked name="Limiti Comunali">
          <VectorWrapperLayer
            ref={vectorWrapperRef}
            selectCallback={point => setPoint(point)}
            selectedPoint={selectedPoint}
            openCharts={openCharts}
            onCustom={click}
          />
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Sensori">
          <GeoJSON
            data={sensorPositions}
            pointToLayer={(feature, latlng) => {
              return L.circleMarker(latlng, {
                radius: 2,
                weight: 2,
              });
            }}
            interactive={false}
            onEachFeature={(feature: any, layer: any) => {
              layer.options.interactive = false;
            }}
          ></GeoJSON>
        </LayersControl.Overlay>
        <LayersControl.Overlay name="Indicatore">
          <ThreddsWrapperLayer useTime="setTimestatus" useUncertainty={false} />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="Indicatore (Con incertezza)">
          <ThreddsWrapperLayer useTime="setTimestatus" useUncertainty={true} />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="HARDCODED - tas_30yr_anomaly_seasonal_agree_model_ensemble">
          <TWLSample
            layer="tas_30yr_anomaly_seasonal_agree_model_ensemble-30yr-model_ensemble-tas-anomaly-rcp85-tw1-DJF"
            show="tas"
            stl="uncert-stippled/seq-YlOrRd"
            useTime="setTimestatus"
            useUncertainty={true}
          />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="HARDCODED - fd_annual_absolute_model_ensemble">
          <TWLSample
            layer="fd_annual_absolute_model_ensemble-annual-model_ensemble-fd-absolute-rcp26-year"
            show="fd"
            stl="default/seq-Blues-inv"
            useTime="setTimestatus"
            useUncertainty={true}
          />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="HARDCODED - pr_30yr_anomaly_seasonal_agree_model_ensemble-30yr-model_ensemble-pr-anomaly-rcp85-tw2-MAM">
          <TWLSample
            layer="pr_30yr_anomaly_seasonal_agree_model_ensemble-30yr-model_ensemble-pr-anomaly-rcp85-tw2-MAM"
            show="pr-uncertainty_group"
            stl="uncert-stippled/div-BrBG"
            useTime="setTimestatus"
            useUncertainty={true}
          />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="HARDCODED - su30_30yr_anomaly_annual_agree_model_ensemble-30yr-model_ensemble-su30-anomaly-rcp85-tw1-year)">
          <TWLSample
            layer="su30_30yr_anomaly_annual_agree_model_ensemble-30yr-model_ensemble-su30-anomaly-rcp85-tw1-year"
            show="su30-uncertainty_group"
            stl="uncert-stippled/seq-YlOrRd"
            useTime="setTimestatus"
            useUncertainty={true}
          />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="HARCODED - tr_30yr_anomaly_annual_agree_model_ensemble-30yr-model_ensemble-tr-anomaly-rcp85-tw2-year">
          <TWLSample
            layer="tr_30yr_anomaly_annual_agree_model_ensemble-30yr-model_ensemble-tr-anomaly-rcp85-tw2-year"
            show="tr-uncertainty_group"
            stl="uncert-stippled/seq-YlOrRd"
            useTime="setTimestatus"
            useUncertainty={true}
          />
        </LayersControl.Overlay>
        <LayersControl.Overlay name="Indicatore (Con incertezza)">
          <TWLSample
            layer="tas_30yr_anomaly_seasonal_agree_model_ensemble-30yr-model_ensemble-tas-anomaly-rcp85-tw1-DJF"
            useTime="setTimestatus"
            useUncertainty={true}
          />
        </LayersControl.Overlay>
      </LayersControl>

      <CustomControlMap
        position="bottomleft"
        className=" leaflet-time-info"
        style={{
          position: 'absolute',
          margin: 0,
          backgroundColor: 'transparent',
          height: '20px',
          width: '20px',
          bottom: '61px',
          left: '385px',
          display: timeStatus,
          padding: 0,
        }}
      >
        <Button innerRef={ref5} className="m-3">
          <InfoIcon></InfoIcon>
        </Button>
        <UncontrolledTooltip placement="top" target={ref5}>
          Si tratta di proiezioni climatiche e non di previsioni a lungo
          termine. Il valore annuale ha validità in un contesto di trend
          trentennale.
        </UncontrolledTooltip>
      </CustomControlMap>
    </MapContainer>
  );
};

export default Map;
