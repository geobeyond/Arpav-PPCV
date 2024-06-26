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
import { useEffect, useState } from 'react';
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
  mode: string;
  data: string;
}

const MAP_MODES = {
  future: 'Proiezioni',
  past: 'Dati Storici',
  advanced: 'Vista avanzata',
  simple: 'Vista semplificata',
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export function MapMenuBar(props: MapMenuBar) {
  const map_mode = props.mode;
  const map_data = props.data;
  const onDownloadMapImg = props.onDownloadMapImg ?? (() => {});
  const {
    selected_map,
    forecast_parameters,
    selectactable_parameters,
    timeserie,
    // @ts-ignore
  } = useSelector(state => state?.map as MapState);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const actions = useMapSlice();

  const mapParameters = (mapKey, parameterListKey) => {
    const items = forecast_parameters[parameterListKey].map(item => {
      return {
        ...item,
        disabled: !(
          Array.isArray(selectactable_parameters[parameterListKey]) &&
          selectactable_parameters[parameterListKey].includes(item?.id)
        ),
        selected: selected_map[mapKey] === item.id,
      };
    });
    const needsSelection =
      selected_map[mapKey] == null &&
      items.filter(x => x.disabled === false).length > 0;
    return { items, needsSelection };
  };

  const setItemMenus = () => ({
    variableMenuSet: [
      // COLUMNS:
      {
        rows: [
          {
            key: 'variable',
            groupName: '',
            ...mapParameters('variable', 'variables'),
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
                  key: 'forecast_model',
                  groupName: t('app.map.menu.models'),
                  ...mapParameters('forecast_model', 'forecast_models'),
                },
              ],
            },
            {
              rows: [
                {
                  key: 'scenario',
                  groupName: t('app.map.menu.scenarios'),
                  ...mapParameters('scenario', 'scenarios'),
                },
              ],
            },
          ],
    periodMenuSet: [
      // COLUMNS:
      {
        rows: [
          {
            key: 'data_series',
            groupName: t('app.map.menu.dataSeries'),
            ...mapParameters('data_series', 'data_series'),
          },
          {
            key: 'value_type',
            groupName: t('app.map.menu.valueTypes'),
            ...mapParameters('value_type', 'value_types'),
          },
          {
            key: 'time_window',
            groupName: t('app.map.menu.timeWindows'),
            ...mapParameters('time_window', 'time_windows'),
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
            ...mapParameters('year_period', 'year_periods'),
          },
        ],
      },
    ],
  });

  const [menus, setMenus] = useState(setItemMenus());

  useEffect(() => {
    // console.log('PASSO')
    setMenus(setItemMenus());
  }, [forecast_parameters, selectactable_parameters, selected_map]);

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

  /* ********************************************************************************************************** */
  // MENU 0

  /* ********************************************************************************************************** */

  // const handleChange = (menuIdx: number, groupSelection: IGrpItm[]) => {
  const handleChange = (key: string, value: string) => {
    // console.log("ciao2", key, value)
    dispatch(actions.actions.changeSelection({ key, value }));
    // const selTmp = [...selectedValues];
    // selTmp[menuIdx] = groupSelection;
    // setSelectedValues(selTmp);
  };

  const findValueName = (key: string, listKey: string) => {
    const id = selected_map[key];
    let name = '';
    if (id)
      name = forecast_parameters[listKey]?.find(item => item.id === id)?.name;
    return name ?? '';
  };

  const selectedValuesToString = () => {
    const keys = [
      ['variable', 'variables'],
      ['forecast_model', 'forecast_models'],
      ['scenario', 'scenarios'],
      ['data_series', 'data_series'],
      ['value_type', 'value_types'],
      ['time_window', 'time_windows'],
      ['year_period', 'year_periods'],
    ];

    const values = keys.map(key => findValueName(key[0], key[1]));
    const label = values.filter(valSet => valSet).join(', ');

    return label;
  };

  const hasMissingValues = items => {
    return (
      items.filter(h => h.rows.filter(x => x.needsSelection).length > 0)
        .length > 0
    );
  };

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
              <Grid xs={5} sx={FirstRowStyle}>
                <Box>
                  <Typography sx={MenuLabelStyle}>
                    {MAP_MODES[map_data]} - {MAP_MODES[map_mode]}
                  </Typography>
                </Box>
              </Grid>
            </>
          )}
          <Grid xs={1} def={4} sx={SecondRowStyle}>
            <MultiRadioSelect
              valueSet={menus.variableMenuSet}
              // value={selectedValues[0]}
              onChange={handleChange}
              sx={LeftSelectStyle}
              menuSx={SelectMenuStyle}
              mobileIcon={<ThermostatIcon />}
              className={
                hasMissingValues(menus.variableMenuSet) ? 'NeedsSelection' : ''
              }
              label={t('app.map.menuBar.indicator')}
            />
          </Grid>
          <Grid xs={1} def={4} sx={SecondRowStyle}>
            <MultiRadioSelect
              valueSet={menus.modelAndScenarioMenuSet}
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
              onChange={handleChange}
              sx={SelectStyle}
              menuSx={SelectMenuStyle}
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
              onChange={handleChange}
              sx={SelectStyle}
              menuSx={SelectMenuStyle}
              mobileIcon={<SnowSunIcon />}
              className={
                hasMissingValues(menus.seasonMenuSet) ? 'NeedsSelection' : ''
              }
              label={t('app.map.menuBar.season')}
              // label={'Season'}
            />
          </Grid>
          <Grid xs={1} def={2} sx={SecondRowStyle}>
            <Box sx={ButtonBoxStyle}>
              {isMobile ? (
                <IconButton
                  onClick={() => setDownloadDataOpen(true)}
                  disabled={timeserie.length === 0}
                  aria-label={t('app.map.menuBar.downloadData')}
                >
                  <FileDownloadIcon />
                </IconButton>
              ) : (
                <Button
                  startIcon={<FileDownloadIcon />}
                  onClick={() => setDownloadDataOpen(true)}
                  disabled={timeserie.length === 0}
                  aria-label={t('app.map.menuBar.downloadData')}
                >
                  {t('app.map.menuBar.downloadData')}
                </Button>
              )}
              <DownloadDataDialog
                open={isDownloadDataOpen}
                setOpen={setDownloadDataOpen}
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
                    Home
                  </LinkListItem>
                  <LinkListItem inDropdown href="/barometer">
                    Barometro Climatico
                  </LinkListItem>
                  <LinkListItem divider />
                  <LinkListItem header inDropdown>
                    Proiezioni
                  </LinkListItem>
                  <LinkListItem inDropdown href="/fs">
                    Proiezioni - Semplificata
                  </LinkListItem>
                  <LinkListItem inDropdown href="/fa">
                    Proiezioni - Avanzata
                  </LinkListItem>
                  <LinkListItem divider />
                  <LinkListItem header inDropdown>
                    Dati storici
                  </LinkListItem>
                  <LinkListItem inDropdown href="/ps">
                    Storico - Semplificata
                  </LinkListItem>
                  <LinkListItem inDropdown href="/pa">
                    Storico - Avanzata
                  </LinkListItem>
                </LinkList>
              </DropdownMenu>
            </Box>
          </Grid>
        </Grid>
      </Toolbar>
      {isMobile && (
        <Toolbar sx={MenuSelectionMobileStyle}>
          <Typography variant={'caption'}>
            {selectedValuesToString()}
          </Typography>
        </Toolbar>
      )}
    </FormControl>
  );
}

export default MapMenuBar;
