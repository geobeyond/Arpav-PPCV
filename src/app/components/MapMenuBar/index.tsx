import * as React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import {
  FormControl,
  Box,
  Toolbar,
  Button,
  IconButton,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SnowIcon from '@mui/icons-material/AcUnit';
import MenuIcon from '@mui/icons-material/Menu';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useTheme } from '@mui/material/styles';
import { useDispatch } from 'react-redux';

import { MultiRadioSelect } from '../MultiRadioSelect';

import {
  FirstRowStyle,
  GridContainerStyle,
  LeftSpaceStyle,
  MapMenuBarStyle,
  SecondRowStyle,
  SelectStyle,
  LeftSelectStyle,
  SelectMenuStyle,
  ButtonBoxStyle,
  MenuLabelStyle,
  MenuFormControlStyle,
  MenuR1Style,
  MenuR2Style,
} from './styles';
import { MapState } from '../../pages/MapPage/slice/types';
import DownloadDataDialog from '../DownloadDataDialog';
import { useEffect, useState, useRef } from 'react';
import { useMapSlice } from '../../pages/MapPage/slice';
import { MenuSelectionMobileStyle } from './styles';
import SnowSunIcon from '../../icons/SnowSunIcon';
import {
  DropdownMenu,
  DropdownToggle,
  LinkList,
  LinkListItem,
} from 'design-react-kit';

export interface MapMenuBar {
  onDownloadMapImg?: Function;
  onMenuChange?: Function;
  mode: string;
  data: string;
  menus: any;
  combinations: any;
  current_map?: any;
  foundLayers: number;
  setCurrentMap: Function;
  openError: Function;
}

const MAP_MODES = {
  future: 'Proiezioni',
  past: 'Storico',
  advanced: 'Avanzata',
  simple: 'Semplice',
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export function MapMenuBar(props: MapMenuBar) {
  const map_mode = props.mode;
  const onMenuChange = props.onMenuChange;
  const map_data = props.data;
  const current_map = props.current_map;
  const forecast_parameters = props.menus;
  const foundLayers = props.foundLayers;
  const setCurrentMap = props.setCurrentMap;
  const combinations = props.combinations || [];
  const openError = props.openError;

  const activeCombinations = useRef(
    Object.keys(combinations).length > 0 ? combinations['tas::30yr'] : {},
  );

  const setActiveCombinations = combo => {
    activeCombinations.current = { ...combo };
  };

  const onDownloadMapImg = props.onDownloadMapImg ?? (() => { });
  //const {
  //  selected_map,
  //  forecast_parameters,
  //  selectactable_parameters,
  //  timeserie,
  //  // @ts-ignore
  //} = useSelector(state => state?.map as MapState);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const actions = useMapSlice();

  const [first, setFirst] = useState(true);

  const mapParameters = (mapKey, parameterListKey) => {
    if (forecast_parameters) {
      const fp = forecast_parameters.filter(x => x.name === mapKey)[0];
      const items = fp.allowed_values.map(item => {
        return {
          ...item,
          disabled: false,
          selected: false, //currentMap[mapKey] === item.name,
        };
      });
      //const needsSelection =
      //  selected_map[mapKey] == null &&
      //  items.filter(x => x.disabled === false).length > 0;
      //return { items, needsSelection };
      return { items, needsSelection: false };
    } else {
      return { items: [], needsSelection: false };
    }
  };

  const setItemMenus = () => ({
    variableMenuSet: [
      // COLUMNS:
      {
        rows: [
          {
            key: 'climatological_variable',
            groupName: '',
            ...mapParameters(
              'climatological_variable',
              'climatological_variable',
            ),
            disableable: false,
            criteria: x => [],
          },
        ],
      },
    ],
    modelAndScenarioMenuSet:
      map_data === 'past'
        ? []
        : [
          // COLUMNS:
          {
            rows: [
              {
                key: 'climatological_model',
                groupName: t('app.map.menu.models'),
                ...mapParameters(
                  'climatological_model',
                  'climatological_model',
                ),
                disableable: false,
                criteria: x => [],
              },
            ],
          },
          {
            rows: [
              {
                key: 'scenario',
                disableable: false,
                groupName: t('app.map.menu.scenarios'),
                ...mapParameters('scenario', 'scenario'),
                criteria: x => [],
              },
            ],
          },
        ],
    periodMenuSet: [
      // COLUMNS:
      {
        rows: [
          {
            key: 'aggregation_period',
            groupName: t('app.map.menu.dataSeries'),
            ...mapParameters('aggregation_period', 'aggregation_period'),
            disableable: true,
            criteria: x => {
              return x?.aggregation_period;
            },
          },
          {
            key: 'measure',
            groupName: t('app.map.menu.valueTypes'),
            ...mapParameters('measure', 'measure'),
            disableable: true,
            criteria: x => x?.measure,
          },
          {
            key: 'time_window',
            groupName: t('app.map.menu.timeWindows'),
            ...mapParameters('time_window', 'time_window'),
            disableable: true,
            criteria: x => x?.time_window,
          },
        ],
      },
    ],
    seasonMenuSet: [
      // COLUMNS:
      {
        rows: [
          {
            key: 'year_period',
            groupName: '',
            ...mapParameters('year_period', 'year_period'),
            disableable: true,
            criteria: x => x?.year_period,
          },
        ],
      },
    ],
  });

  const [menus, setMenus] = useState(setItemMenus());

  useEffect(() => {
    // console.log('PASSO')
    setMenus(setItemMenus());
  }, [forecast_parameters, setItemMenus]);

  // const [selectedValues, setSelectedValues] = React.useState<IGrpItm[][] | []>(
  //   [],
  // );

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('def'));

  // const actualState = useSelector(state => state);
  //@ts-ignore
  // const forecastParams = actualState?.map?.forecast_parameters;

  const [isDownloadDataOpen, setDownloadDataOpen] =
    React.useState<boolean>(false);

  const all_meas = ['absolute', 'anomaly'];
  const all_pers = ['annual', '30yr'];
  const all_indx = [
    'tas',
    'cdds',
    'hdds',
    'pr',
    'snwdays',
    'su30',
    'tasmax',
    'tasmin',
    'tr',
    'fd',
  ];

  const changeables = ['measure', 'year_period', 'time_window'];
  /* ********************************************************************************************************** */
  // MENU 0
  /* ********************************************************************************************************** */

  const toDefault = object => {
    let ret: any = {};
    for (let k of Object.keys(object)) {
      if (object[k].length > 0) {
        ret[k] = object[k][object[k].length - 1];
      } else {
        ret[k] = null;
      }
    }

    ret.aggregation_period = '30yr';
    ret.measure = 'anomaly';
    ret.time_window = 'tw1';

    return ret;
  };

  const handleChange = (key: string, value: string) => {
    if (key === 'climatological_variable') {
      setFirst(true);
      console.log('activatingCV', value, combinations[value]);
      setActiveCombinations(combinations[value]);
      setCurrentMap(toDefault(combinations[value]));
      setFirst(false);
    } else {
      const steps = [
        'climatological_variable',
        'aggregation_period',
        'measure',
      ];
      console.log('handleChange', key, value);
      console.log(combinations);
      const idx = steps.indexOf(key);
      let ckey = '{climatological_variable}';
      if (idx >= 0) {
        if (idx > 0) ckey = ckey + '::{metric}';
        if (idx > 0) {
          ckey = ckey.replace(
            '{climatological_variable}',
            current_map.climatological_variable,
          );
          ckey = ckey.replace('{metric}', value);
        } else {
          ckey = ckey.replace('{climatological_variable}', value);
        }
        if (Object.keys(combinations).indexOf(ckey) >= 0) {
          //if (current_map[key] in combinations[ckey]) {
          console.log(
            'activating Combo',
            ckey,
            combinations[ckey][current_map[key]],
          );
          setActiveCombinations(combinations[ckey]);
          //}
        } else if (
          Object.keys(combinations).indexOf(
            current_map.climatological_variable,
          ) >= 0
        ) {
          setActiveCombinations(
            combinations[current_map.climatological_variable],
          );
        }
      }
    }
    if (onMenuChange) {
      onMenuChange({ key, value });
    }
  };

  //setActiveCombinations(combinations['tas']);

  const findValueName = (key: string, listKey: string) => {
    return '';
  };

  const hasMissingValues = items => {
    return (
      items.filter(h => h.rows.filter(x => x.needsSelection).length > 0)
        .length > 0
    );
  };

  useEffect(() => {
    if (foundLayers !== 1) {
      if (!first) {
        openError('wrong_config');
      } else {
        setFirst(false);
      }

      let nm = { ...current_map };
      let kk = current_map.climatological_variable;

      let pkk = kk + '::' + current_map.aggregation_period;
      let mkk = kk + '::' + current_map.measure;
      if (kk in combinations) {
        let opts = { ...combinations[kk] };
        if (pkk in combinations) {
          opts = { ...combinations[pkk] };
        } else if (mkk in combinations) {
        }
        console.log(opts);
        if (opts) {
          for (let k of Object.keys(current_map)) {
            if (changeables.indexOf(k) >= 0) {
              if (
                opts[k].indexOf(current_map[k]) < 0 ||
                k.indexOf('measure') >= 0
              ) {
                if (opts[k].length > 0) {
                  nm[k] = opts[k][opts[k].length - 1];
                } else {
                  nm[k] = null;
                }
              } else {
                opts[k] = all_meas.filter(gg => gg !== current_map.measure)[0];
              }
            }
          }
        }
        console.log(nm);
        setCurrentMap(nm);
      }

      setActiveCombinations(combinations[current_map.climatological_variable]);
    }
  }, [foundLayers]);

  return (
    <FormControl sx={MenuFormControlStyle}>
      <Toolbar disableGutters sx={MapMenuBarStyle}>
        <Grid
          container
          rowSpacing={0}
          columnSpacing={{ xs: 0 }}
          columns={{ xs: 7, def: 21 }}
          sx={GridContainerStyle}
        >
          {isMobile ? (
            <></>
          ) : (
            <>
              <Grid xs={4} sx={FirstRowStyle}>
                <Box sx={LeftSpaceStyle}>
                  <Typography sx={MenuLabelStyle}>
                    {t('app.map.menuBar.indicator')}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={4} sx={FirstRowStyle}>
                <Box>
                  <Typography sx={MenuLabelStyle}>
                    {t('app.map.menuBar.model')}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={4} sx={FirstRowStyle}>
                <Box>
                  <Typography sx={MenuLabelStyle}>
                    {t('app.map.menuBar.period')}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={4} sx={FirstRowStyle}>
                <Box>
                  <Typography sx={MenuLabelStyle}>
                    {t('app.map.menuBar.season')}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={4} sx={FirstRowStyle}>
                <Box>
                  <Typography sx={MenuLabelStyle}>
                    {MAP_MODES[map_data]} - {MAP_MODES[map_mode]}
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={1} sx={FirstRowStyle}>
                <Box>
                  <Typography sx={MenuLabelStyle}>{foundLayers}</Typography>
                </Box>
              </Grid>
            </>
          )}
          <Grid xs={1} def={4} sx={SecondRowStyle}>
            <MultiRadioSelect
              valueSet={menus.variableMenuSet}
              current_map={current_map}
              onChange={handleChange}
              sx={LeftSelectStyle}
              menuSx={SelectMenuStyle}
              mobileIcon={<ThermostatIcon />}
              label={t('app.map.menuBar.indicator')}
            />
          </Grid>
          <Grid xs={1} def={4} sx={SecondRowStyle}>
            <MultiRadioSelect
              valueSet={menus.modelAndScenarioMenuSet}
              current_map={current_map}
              onChange={handleChange}
              sx={SelectStyle}
              menuSx={SelectMenuStyle}
              mobileIcon={<ShowChartIcon />}
              className={
                hasMissingValues(menus.modelAndScenarioMenuSet)
                  ? 'NeedsSelection'
                  : ''
              }
              // label={'Model and Scenario'}
              label={t('app.map.menuBar.model')}
            />
          </Grid>
          <Grid xs={1} def={4} sx={SecondRowStyle}>
            <MultiRadioSelect
              valueSet={menus.periodMenuSet}
              current_map={current_map}
              onChange={handleChange}
              sx={SelectStyle}
              menuSx={SelectMenuStyle}
              activeCombinations={activeCombinations.current}
              mobileIcon={<DateRangeIcon />}
              className={
                hasMissingValues(menus.periodMenuSet) ? 'NeedsSelection' : ''
              }
              // label={'Period'}
              label={t('app.map.menuBar.period')}
            />
          </Grid>
          <Grid xs={1} def={4} sx={SecondRowStyle}>
            <MultiRadioSelect
              valueSet={menus.seasonMenuSet}
              current_map={current_map}
              onChange={handleChange}
              sx={SelectStyle}
              menuSx={SelectMenuStyle}
              mobileIcon={<SnowSunIcon />}
              className={
                hasMissingValues(menus.seasonMenuSet) ? 'NeedsSelection' : ''
              }
              activeCombinations={activeCombinations.current}
              label={t('app.map.menuBar.season')}
            // label={'Season'}
            />
          </Grid>
          <Grid xs={1} def={2} sx={SecondRowStyle}>
            <Box sx={ButtonBoxStyle}>
              {isMobile ? (
                <IconButton
                  onClick={() => setDownloadDataOpen(true)}
                  disabled={true}
                  aria-label={t('app.map.menuBar.downloadData')}
                >
                  <FileDownloadIcon />
                </IconButton>
              ) : (
                <Button
                  startIcon={<FileDownloadIcon />}
                  onClick={() => setDownloadDataOpen(true)}
                  aria-label={t('app.map.menuBar.downloadData')}
                >
                  {t('app.map.menuBar.downloadData')}
                </Button>
              )}
              <DownloadDataDialog
                menus={forecast_parameters}
                open={isDownloadDataOpen}
                setOpen={setDownloadDataOpen}
                configuration={current_map}
              />
            </Box>
          </Grid>
          <Grid xs={1} def={2} sx={SecondRowStyle}>
            <Box sx={ButtonBoxStyle}>
              {isMobile ? (
                <IconButton
                  onClick={() => onDownloadMapImg()}
                  aria-label={t('app.map.menuBar.downloadMap')}
                >
                  <PhotoCameraIcon />
                </IconButton>
              ) : (
                <Button
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => onDownloadMapImg()}
                  aria-label={t('app.map.menuBar.downloadMap')}
                >
                  {t('app.map.menuBar.downloadMap')}
                </Button>
              )}
            </Box>
          </Grid>
          <Grid xs={1} def={1} sx={SecondRowStyle}>
            <Box sx={ButtonBoxStyle}>
              <DropdownToggle>
                <MenuIcon />
              </DropdownToggle>
              <DropdownMenu style={{ zIndex: 100000000 }}>
                <LinkList>
                  <LinkListItem inDropdown href="/">
                    {t('app.index.sections.barometer')}
                  </LinkListItem>
                  <LinkListItem divider />
                  <LinkListItem header inDropdown>
                    {t('app.index.sections.proj')}
                  </LinkListItem>
                  <LinkListItem disabled inDropdown href="/proiezioni-semplice">
                    {t('app.index.sections.simple')}
                  </LinkListItem>
                  <LinkListItem inDropdown href="/proiezioni-avanzata">
                    {t('app.index.sections.advanced')}
                  </LinkListItem>
                  <LinkListItem divider />
                  <LinkListItem header inDropdown>
                    {t('app.index.sections.hist')}
                  </LinkListItem>
                  <LinkListItem disabled inDropdown href="/storico-semplice">
                    {t('app.index.sections.simple')}
                  </LinkListItem>
                  <LinkListItem disabled inDropdown href="/storico-avanzata">
                    {t('app.index.sections.advanced')}
                  </LinkListItem>
                </LinkList>
              </DropdownMenu>
            </Box>
          </Grid>
        </Grid>
      </Toolbar>
      {isMobile && (
        <Toolbar sx={MenuSelectionMobileStyle}>
          <Typography variant={'caption'}></Typography>
        </Toolbar>
      )}
    </FormControl>
  );
}

export default MapMenuBar;
