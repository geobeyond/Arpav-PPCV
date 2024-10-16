/* eslint-disable react-hooks/exhaustive-deps */
/**
 *
 * MapPage
 *
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Backdrop, CircularProgress, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { MapLoadingContainerStyle, mapStyle } from './styles';
import Map from '../../components/Map';
import MapMenuBar from '../../components/MapMenuBar';
import { LatLng, Map as LMap } from 'leaflet';
import {
  SimpleMapScreenshoter,
  PluginOptions,
} from 'leaflet-simple-map-screenshoter';
//import { find_keys, full_find_keys, useMapSlice } from './slice';
import { useDispatch, useSelector } from 'react-redux';
import TimeSeriesDialog from '../../components/TimeSeriesDialog';
import { useSearchParams } from 'react-router-dom';
//import { selectMap } from './slice/selectors';
//import { Filters, iCityItem } from './slice/types';
import { saveAs } from 'file-saver';
import useCustomSnackbar from '../../../utils/useCustomSnackbar';
import HeaderBar from '../../components/HeaderBar';
import { RequestApi } from 'app/Services';

interface MapPageProps {
  map_mode: string;
  map_data: string;
}

const defaultMap: any = {
  climatological_variable: 'tas',
  climatological_model: 'model_ensemble',
  scenario: 'rcp85',
  measure: 'anomaly',
  time_window: 'tw1',
  aggregation_period: '30yr',
  year_period: 'winter',

  data_series: 'no',
};

//let currentMap = defaultMap;

export function MapPage(props: MapPageProps) {
  const map_mode = props.map_mode;
  const map_data = props.map_data;
  if (map_data === 'future') {
    defaultMap['archive'] = 'forecast';
  }
  //const actions = useMapSlice();
  const dispatch = useDispatch();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { enqueueCSnackbar } = useCustomSnackbar();

  const [inProgress, setInProgress] = React.useState(false); //TODO only for debug?
  const [tSOpen, setTSOpen] = React.useState(false);
  const mapRef = React.useRef<LMap | undefined>(undefined);
  const coordRef = React.useRef<LatLng>(new LatLng(0, 0, 0));
  //const { layers, selected_map, cities, forecast_parameters, error } =
  //  useSelector(selectMap);
  const [loading, setLoading] = useState(false);
  const [menus, setMenus] = useState();
  const [combinations, setCombinations] = useState({});
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [mapScreen, setMapScreen] = useState<any>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('def'));
  const api = new RequestApi();

  const [currentMap, setCurrentMap] = useState(defaultMap);
  const [currentLayer, setCurrentLayer] = useState('');
  const [currentLayerConfig, setCurrentLayerConfig] = useState({});
  const [currentTimeSerie, setCurrentTimeSerie] = useState({});

  const [foundLayers, setFoundLayers] = useState(0);

  const handleMapReady = (map: LMap) => {
    mapRef.current = map;
    const mapScreenPlugin = new SimpleMapScreenshoter(PLUGIN_OPTIONS);
    //@ts-ignore
    mapScreenPlugin.addTo(mapRef.current);
    setMapScreen(mapScreenPlugin);
  };

  const [searchParams, setSearchParams] = useSearchParams();

  const joinNames = (names: string[]) => names.filter(name => name).join(' - ');

  const findValueName = (key: string, listKey: string) => {
    //const id = selected_map[key];
    let name = '';
    //if (id)
    //  name = forecast_parameters[listKey]?.find(item => item.id === id)?.name;
    return name ?? '';
  };

  useEffect(() => {
    api.getAttributes().then(x => {
      setCombinations(
        x.combinations.reduce((prev, cur) => {
          for (let k of Object.keys(defaultMap)) {
            if (!(k in cur.other_parameters)) {
              cur.other_parameters[k] = [];
              if (k in cur) {
                cur.other_parameters[k].push(cur[k]);
              }
            }
          }
          const kk = cur.variable + '::' + cur.aggregation_period;
          const ki = cur.variable;
          cur.kk = kk;
          cur.ki = ki;
          if (ki in prev) {
            prev[ki].other_parameters.aggregation_period.push(
              cur.aggregation_period,
            );
            prev[ki].other_parameters.measure.push(cur.measure);
          } else {
            prev[ki] = { ...cur };
            prev[ki].other_parameters.aggregation_period = [
              cur.aggregation_period,
            ];
            prev[ki].other_parameters.measure = [cur.measure];
          }
          if (kk in prev) {
            prev[kk][cur.measure] = cur;
          } else {
            prev = {
              ...prev,
              [cur.variable + '::' + cur.aggregation_period]: {
                [cur.measure]: cur,
              },
            };
          }
          return prev;
        }, {}),
      );
      setMenus(x.items);
    });

    setSearchParams(currentMap);
    try {
      api
        .getLayer(
          currentMap.climatological_variable,
          currentMap.climatological_model,
          currentMap.scenario,
          currentMap.measure,
          currentMap.time_window,
          currentMap.aggregation_period,
          currentMap.year_period,
        )
        .then((x: any) => {
          console.log(x);
          setFoundLayers(x.items.length);
          if (x.items.length === 1) {
            api
              .getLayerConf(x.items[0].related_coverage_configuration_url)
              .then(conf => {
                setCurrentLayer(x.items[0].identifier);
                setCurrentLayerConfig(conf);
              });
          } else {
            let nm = { ...currentMap };
            const kk =
              currentMap.climatological_variable +
              '::' +
              currentMap.aggregation_period;
            let opts = combinations[kk][currentMap.measure]?.other_parameters;
            console.log(opts);
            if (opts) {
              if (Object.keys(opts).indexOf(currentMap.measure) >= 0) {
                opts = opts[currentMap.measure];
                console.log(opts);
              }
            } else {
              opts =
                combinations[currentMap.climatological_variable]
                  .other_parameters;
              nm.measure = opts.measure[0];
              console.log(opts);
            }
          }
        });
    } catch (e) {
      console.log(e);
    }
  }, [currentMap]);

  useEffect(() => {
    if (currentLayer.length > 0 && selectedPoint) {
      api
        .getTimeserieV2(
          currentLayer,
          selectedPoint.latlng.lat,
          selectedPoint.latlng.lng,
          false,
          false,
          false,
          false,
        )
        .then(data => {
          setCurrentTimeSerie(data.series[0]);
        });
    }
  }, [selectedPoint, currentLayer]);

  const PLUGIN_OPTIONS: PluginOptions = {
    cropImageByInnerWH: true, // crop blank opacity from image borders
    hidden: true, // hide screen icon
    domtoimageOptions: {
      cacheBust: true,
    }, // see options for dom-to-image
    position: 'topleft', // position of take screen icon
    screenName: `${findValueName('variable', 'variables')}`, // string or function
    // iconUrl: ICON_SVG_BASE64, // screen btn icon base64 or url
    hideElementsWithSelectors: [
      // '.leaflet-control-legend',
      '.leaflet-control',
      '.leaflet-control-search',
      '.leaflet-control-zoom',
      '.leaflet-control-coordinates',
      '.leaflet-bar-timecontrol',
      '.leaflet-control-layers',
    ], // by default hide map controls All els must be child of _map._container
    mimeType: 'image/jpeg', // used if format == image,
    caption: `${findValueName('variable', 'variables')}
- ${joinNames([
      findValueName('forecast_model', 'forecast_models'),
      findValueName('scenario', 'scenarios'),
    ])}
- ${joinNames([
      findValueName('data_series', 'data_series'),
      findValueName('value_type', 'value_types'),
      findValueName('time_window', 'time_windows'),
    ])}
- ${findValueName('year_period', 'year_periods')}
      `, // streeng or function, added caption to bottom of screen
    captionFontSize: 15,
    captionFont: 'Arial',
    captionColor: theme.palette.success.contrastText,
    captionBgColor: theme.palette.success.dark,
    captionOffset: 5,
  };

  const updateCurrentMap = ({ key, value }) => {
    let cm = { ...currentMap };
    cm[key] = value;
    setCurrentMap(cm);
  };

  const handleDownloadMapImg = () => {
    //    const format = 'image';
    //    let year = '';
    //    try {
    //      year =
    //        currentMap.data_series === 'yes'
    //          ? new Date((mapRef.current as any).timeDimension?.getCurrentTime())
    //            .getFullYear()
    //            .toString()
    //          : '';
    //    } catch (e) {
    //      // console.log('no year');
    //    }
    //
    //    setInProgress(true);
    //    const caption = `${isMobile
    //        ? currentMap.climatological_variable
    //        : findValueName('variable', 'variables')
    //      }
    //- ${joinNames([
    //        findValueName('forecast_model', 'forecast_models'),
    //        findValueName('scenario', 'scenarios'),
    //      ])}
    //- ${joinNames([
    //        findValueName('data_series', 'data_series'),
    //        findValueName('value_type', 'value_types'),
    //        findValueName('time_window', 'time_windows'),
    //      ])}
    //- ${findValueName('year_period', 'year_periods')}
    //${year ? ` - Anno ${year}` : ''}   © ARPAV - Arpa FVG`; // string or function, added caption to bottom of screen
    //    const filename = `Screenshot ${findValueName(
    //      'variable',
    //      'variables',
    //    )} - ${joinNames([
    //      findValueName('forecast_model', 'forecast_models'),
    //      findValueName('scenario', 'scenarios'),
    //    ])} - ${joinNames([
    //      findValueName('data_series', 'data_series'),
    //      findValueName('value_type', 'value_types'),
    //      findValueName('time_window', 'time_windows'),
    //    ])} - ${findValueName('year_period', 'year_periods')} ${year ? ` Anno ${year}` : ''
    //      }.png`;
    //    mapScreen
    //      .takeScreen(format, {
    //        captionFontSize: isMobile ? 10 : 12,
    //        screenName: `${findValueName('variable', 'variables')}`,
    //        caption: caption,
    //      })
    //      .then(blob => {
    //        setInProgress(false);
    //        saveAs(blob as Blob, filename);
    //      })
    //      .catch(e => {
    //        setInProgress(false);
    //        console.error(e);
    //      });
  };

  const openCharts = (latLng: LatLng) => {
    coordRef.current = latLng;
    setTSOpen(true);
  };

  const setPoint = (props: any) => {
    // console.log('==================== setPoint ====================');
    // console.log(props);
    setSelectedPoint(props);
    // console.log('setPoint', props);
  };

  return (
    <Box sx={mapStyle}>
      <HeaderBar />
      <MapMenuBar
        onDownloadMapImg={handleDownloadMapImg}
        mode={map_mode}
        data={map_data}
        menus={menus}
        combinations={combinations}
        onMenuChange={updateCurrentMap}
        current_map={currentMap}
        foundLayers={foundLayers}
        setCurrentMap={setCurrentMap}
      />

      <Map
        onReady={handleMapReady}
        openCharts={openCharts}
        setPoint={setPoint}
        selectedPoint={selectedPoint}
        layerConf={currentLayerConfig}
        currentLayer={currentLayer}
        currentMap={currentMap}
        currentTimeserie={currentTimeSerie}
        setCurrentMap={setCurrentMap}
      />
      {loading && (
        <Box sx={MapLoadingContainerStyle}>
          <CircularProgress size={80} />
        </Box>
      )}
      <TimeSeriesDialog
        selectedPoint={selectedPoint}
        open={tSOpen}
        setOpen={setTSOpen}
        currentLayer={currentLayerConfig}
        currentMap={currentMap}
      />

      {/*TODO Backdrop only for debug?*/}
      <Backdrop
        sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }}
        open={inProgress}
      >
        <CircularProgress color="inherit" size={80} />
      </Backdrop>
    </Box>
  );
}
