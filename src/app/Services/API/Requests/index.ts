import { AxiosResponse } from 'axios';
import { Http } from '../Http';
import { P } from 'app/pages/NotFoundPage/P';

export interface AuthResponse {
  [key: string]: {};
}

export interface ListResults<T> {
  count: number;
  next: string;
  previous: string;
  results: T[];
}

export interface iNetcdfDownload {
  id: number;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  public?: number;
  reason?: string;
  other_reason?: string;
  place?: string;
  membership?: string;
  accept_disclaimer?: boolean;
}

const zip = (a, b) => a.map((k, i) => [k, b[i]]);

export class RequestApi extends Http {
  /**
   * Fetches forecast data from the API.
   * @param {any} configuration Configuration of the request.
   * @param {any} dataSet Additional data to be used in the request.
   * @returns {Promise<AxiosResponse<any>>} The response of the request.
   */
  getForecastData(configuration: any, dataSet?: any, language: string = 'it') {
    let configs = [];
    return this.getConfigurationParams().then(configs => {
      const labelsf = configs.map((config: any) =>
        config.allowed_values.map(x => [
          x.name,
          [
            config.name,
            language === 'it' ? x.display_name_italian : x.display_name_english,
          ],
        ]),
      );
      const labels = Object.fromEntries(labelsf.flat());
      const innerConf = { ...configuration };
      delete innerConf.archive;
      if (innerConf.aggregation_period === 'annual') {
        delete innerConf.time_window;
      }
      return this.instance
        .get<any>(
          //'https://arpav.geobeyond.dev/api/v2/coverages/forecast-data?',
          process.env.REACT_APP_BACKEND_PUBLIC_URL +
            '/api/v2/coverages/forecast-data?',
          {
            params: { offset: 0, limit: 100, ...innerConf },
            paramsSerializer: { indexes: null },
            timeout: 30000,
          },
        )
        .then((found: any) => {
          /**
           * Maps the array of coverage download links to an array of objects containing the URL and label of the coverage.
           * @param {string} x The coverage download link.
           * @returns {object} An object containing the URL and label of the coverage.
           */
          const mapCoverageLinks = (x: string) => {
            const url =
              x +
              (dataSet
                ? `?coords=POLYGON ((${dataSet.east} ${dataSet.south}, ${dataSet.west} ${dataSet.south}, ${dataSet.west} ${dataSet.north}, ${dataSet.east} ${dataSet.north}, ${dataSet.east} ${dataSet.south}))&datetime=${dataSet.time_start}-01-01/${dataSet.time_end}-12-31`
                : '');
            const label = x.split('/')[x.split('/').length - 1];
            const tlabel = label.split('-');
            const flabel = tlabel
              .map(x => {
                if (Object.keys(labels).indexOf(x) >= 0) return labels[x];
                else return null;
              })
              .filter(x => x);
            const dconf: any = {
              ...{ time_window: null },
              ...Object.fromEntries(flabel),
            };
            const labelout =
              `${
                dconf.climatological_variable
                  ? dconf.climatological_variable
                  : dconf.historical_variable
              } - ${dconf.archive} - ${dconf.climatological_model} - ${
                dconf.scenario
              } - ${dconf.aggregation_period} - ${dconf.measure} - ` +
              (dconf.time_period ? `${dconf.time_period} - ` : '') +
              `${dconf.year_period}` +
              (dconf.uncertainty_type ? ` - ${dconf.uncertainty_type}` : '');
            return { url, rawLabel: label, label: labelout };
          };
          return found.coverage_download_links.map(mapCoverageLinks);
        });
    });
  }

  protected static classInstance?: RequestApi;
  public static getInstance() {
    if (!this.classInstance) {
      this.classInstance = new RequestApi();
    }
    return this.classInstance;
  }

  public getCities = () => {
    if (localStorage.getItem('municipality-centroids')) {
      // @ts-ignore
      return JSON.parse(localStorage.getItem('municipality-centroids'));
    } else {
      this.instance
        .get<any>(
          //'https://arpav.geobeyond.dev/api/v2/municipalities/municipality-centroids',
          process.env.REACT_APP_BACKEND_PUBLIC_URL +
            '/api/v2/municipalities/municipality-centroids',
        )
        .then((x: any) => x.features)
        .then(x => {
          return x.map(c => ({
            label: c.properties.name,
            id: c.id,
            latlng: {
              lat: c.geometry.coordinates[1],
              lng: c.geometry.coordinates[0],
            },
          }));
        })
        .then(x => {
          localStorage.setItem('municipality-centroids', JSON.stringify(x));
        });
      // @ts-ignore
      return JSON.parse(localStorage.getItem('municipality-centroids'));
    }
  };

  public getLayer = (
    variable?,
    model?,
    scenario?,
    measure?,
    time_period?,
    aggregation_period?,
    season?,
  ) => {
    if (model.indexOf('model_ensemble') < 0) {
      return Promise.all([
        this.doGetLayer(
          variable,
          model,
          scenario,
          measure,
          time_period,
          aggregation_period,
          season,
        ),
        this.doGetLayer(
          variable,
          'model_ensemble',
          scenario,
          measure,
          time_period,
          aggregation_period,
          season,
        ),
      ]).then(x => {
        if (x[0].items.length > 0) {
          x[0].items[0]['ensemble_data'] = x[1].items[0];
        }
        return x[0];
      });
    } else {
      return this.doGetLayer(
        variable,
        model,
        scenario,
        measure,
        time_period,
        aggregation_period,
        season,
      );
    }
  };

  public getLayers = (
    variable?: string,
    model?: string | string[],
    scenario?: string | string[],
    measure?: string,
    time_period?: string,
    aggregation_period?: string,
    season?: string,
  ) => {
    const items = {
      climatological_variable: variable,
      climatological_model: model,
      scenario: scenario,
      measure: measure,
      time_period: time_period,
      aggregation_period: aggregation_period,
      year_period: season,
    };
    let titems: any[] = [];

    for (let k of Object.keys(items)) {
      if (items[k]) {
        if (typeof items[k] !== 'object') {
          titems.push({ [k]: [items[k]] });
        } else {
          titems.push({ [k]: items[k] });
        }
      }
    }
    const combs: any[] = this.cartesianProduct(titems);
    let reqs: any = [];
    for (let c of combs) {
      reqs.push(
        this.doGetLayer(
          c.climatological_variable,
          c.climatological_model,
          c.scenario,
          c.measure,
          c.time_period,
          c.aggregation_period,
          c.year_period,
        ),
      );
    }

    return Promise.all(reqs).then(lyrs => {
      let ret: any[] = [];
      for (let lyr of lyrs) {
        ret = [...ret, ...lyr.items];
      }
      return { ...lyrs[0], ...{ items: ret } };
    });
  };

  /**
   * Fetches the layer configuration from the API, based on the given filters.
   * @param {string} [variable] The variable to filter by.
   * @param {string} [model] The model to filter by.
   * @param {string} [scenario] The scenario to filter by.
   * @param {string} [measure] The measure to filter by.
   * @param {string} [time_period] The time period to filter by.
   * @param {string} [aggregation_period] The aggregation period to filter by.
   * @param {string} [season] The season to filter by.
   * @returns {Promise<AxiosResponse<any>>} The response of the request.
   */
  public doGetLayer = (
    variable?: string,
    model?: string,
    scenario?: string,
    measure?: string,
    time_period?: string,
    aggregation_period?: string,
    season?: string,
  ) => {
    // Create the filter string based on the given parameters.
    let filter = '';
    if (variable) {
      filter += 'possible_value=climatological_variable:' + variable + '&';
    }
    if (model) {
      filter += 'possible_value=climatological_model:' + model + '&';
    }
    if (scenario) {
      filter += 'possible_value=scenario:' + scenario + '&';
    }
    if (measure) {
      filter += 'possible_value=measure:' + measure + '&';
    }
    if (time_period && aggregation_period !== 'annual') {
      filter += 'possible_value=time_window:' + time_period + '&';
    }
    if (aggregation_period) {
      filter += 'possible_value=aggregation_period:' + aggregation_period + '&';
    }
    if (season) {
      filter += 'possible_value=year_period:' + season + '&';
    }

    const fullUrl =
      //'https://arpav.geobeyond.dev/api/v2/coverages/coverage-identifiers?' +
      process.env.REACT_APP_BACKEND_PUBLIC_URL +
      '/api/v2/coverages/coverage-identifiers?' +
      filter;

    console.log(fullUrl);
    const d = localStorage.getItem(fullUrl);
    if (d) {
      return Promise.resolve(JSON.parse(d)).then((x: any) => {
        console.log(x);
        // If the response contains items, filter out the ones with uncertainty.
        if (x.items.length > 0) {
          let xx = x.items.filter(
            itm =>
              JSON.stringify(itm.possible_values).indexOf('uncertainty') < 0,
          );
          return { items: xx };
        } else return x;
      });
    }

    // Make the request to the API.
    return this.instance
      .get<any>(
        //'https://arpav.geobeyond.dev/api/v2/coverages/coverage-identifiers?' +
        process.env.REACT_APP_BACKEND_PUBLIC_URL +
          '/api/v2/coverages/coverage-identifiers?' +
          filter,
      )
      .then((x: any) => {
        localStorage.setItem(fullUrl, JSON.stringify(x));
        console.log(x);
        // If the response contains items, filter out the ones with uncertainty.
        if (x.items.length > 0) {
          let xx = x.items.filter(
            itm =>
              JSON.stringify(itm.possible_values).indexOf('uncertainty') < 0,
          );
          return { items: xx };
        } else return x;
      });
  };
  /**
   * Retrieves layer configuration from the API.
   * @param {any} conf The configuration object containing URLs for fetching data.
   * @returns {Promise<any>} The resolved configuration data, potentially with ensemble data included.
   */
  public getLayerConf = (conf: any): Promise<any> => {
    console.log('getLayerConf');
    console.log(conf);
    if ('ensemble_data' in conf) {
      // Fetch both the main and ensemble data configurations concurrently
      return Promise.all([
        this.instance.get<any>(conf.related_coverage_configuration_url),
        this.instance.get<any>(
          conf.ensemble_data.related_coverage_configuration_url,
        ),
      ]).then(responses => {
        console.log('getLayerConf: Fetched both main and ensemble data');
        console.log(responses);
        // Attach ensemble data to the main configuration
        responses[0].ensemble_data = responses[1];
        return responses[0];
      });
    } else {
      const lc = localStorage.getItem(conf.related_coverage_configuration_url);
      if (lc) {
        return Promise.resolve(JSON.parse(lc));
      } else {
        // Fetch only the main data configuration
        return this.instance
          .get<any>(conf.related_coverage_configuration_url)
          .then(response => {
            localStorage.setItem(
              conf.related_coverage_configuration_url,
              JSON.stringify(response),
            );
            console.log('getLayerConf: Fetched only main data');
            console.log(response);
            return response;
          });
      }
    }
  };

  public cartesianProduct = (input, current?) => {
    if (!input || !input.length) {
      return [];
    }

    let head = input[0];
    let tail = input.slice(1);
    let output: any[] = [];

    for (var key in head) {
      if (head[key]) {
        for (var i = 0; i < head[key].length; i++) {
          var newCurrent = this.copy(current);
          newCurrent[key] = head[key][i];
          if (tail.length) {
            var productOfTail = this.cartesianProduct(tail, newCurrent);
            output = output.concat(productOfTail);
          } else output.push(newCurrent);
        }
      }
    }
    return output;
  };

  private copy: any = obj => {
    const res: any = {};
    for (const p in obj) res[p] = obj[p];
    return res;
  };

  public createIds(pattern: string, items: any) {
    let ret: string[] = [];
    let titems: any[] = [];

    for (let k of Object.keys(items)) {
      if (items[k]) {
        if (typeof items[k] !== 'object') {
          titems.push({ [k]: [items[k]] });
        } else {
          titems.push({ [k]: items[k] });
        }
      }
    }
    const combs = this.cartesianProduct(titems);
    for (const c of combs) {
      let tpattern = pattern;
      for (let j of Object.keys(c)) {
        tpattern = tpattern.replaceAll('{' + j + '}', c[j]);
      }
      ret.push(tpattern);
    }
    return ret;
  }

  public getTimeseriesV2 = (
    series: string[],
    lat: number,
    lng: number,
    withStation: boolean = true,
  ) => {
    const ret: Promise<AxiosResponse<any, any>>[] = [];
    for (let id of series) {
      ret.push(this.getTimeserieV2(id, lat, lng, withStation));
      if (withStation) {
        withStation = false;
      }
    }
    return Promise.all(ret).then(x => {
      return this.merge.apply(this, x);
    });
  };

  private merge = (...objs) =>
    [...objs].reduce(
      (acc, obj) =>
        Object.keys(obj).reduce((a, k) => {
          acc[k] = acc.hasOwnProperty(k)
            ? [].concat(acc[k]).concat(obj[k])
            : obj[k];
          return acc;
        }, {}),
      {},
    );

  public getTimeserieV2 = (
    serie: string,
    lat: number,
    lng: number,
    withStation: boolean = true,
    related: boolean = true,
    smoothing: boolean = true,
    uncertainty: boolean = true,
  ) => {
    //let url = `https://arpav.geobeyond.dev/api/v2/coverages/time-series/${serie}?coords=POINT(${lng.toFixed(
    let url =
      process.env.REACT_APP_BACKEND_PUBLIC_URL +
      `/api/v2/coverages/time-series/${serie}?coords=POINT(${lng.toFixed(
        4,
      )} ${lat.toFixed(
        4,
      )})&datetime=..%2F..&include_coverage_data=true&coverage_data_smoothing=NO_SMOOTHING`;
    if (smoothing) {
      url +=
        '&coverage_data_smoothing=MOVING_AVERAGE_11_YEARS&coverage_data_smoothing=LOESS_SMOOTHING';
    }
    if (uncertainty) {
      url += '&include_coverage_uncertainty=true';
    } else {
      url += '&include_coverage_uncertainty=false';
    }
    if (related) {
      url += '&include_coverage_related_data=true';
    } else {
      url += '&include_coverage_related_data=false';
    }
    if (withStation) {
      url += `&include_observation_data=true&observation_data_smoothing=NO_SMOOTHING&observation_data_smoothing=MOVING_AVERAGE_5_YEARS`;
    } else {
      url += '&include_observation_data=false';
    }

    return this.instance.get<any>(url).then((x: any) => {
      x.series.map(a => {
        console.log('timeseries: ', a.name);
      });
      return x;
    });
  };

  public getTimeSeriesDataPoint = (
    serie: string,
    lat: number,
    lng: number,
    year: number,
  ) => {
    //let url = `https://arpav.geobeyond.dev/api/v2/coverages/time-series/${serie}?coords=POINT(${lng.toFixed(
    let url =
      process.env.REACT_APP_BACKEND_PUBLIC_URL +
      `/api/v2/coverages/time-series/${serie}?coords=POINT(${lng.toFixed(
        4,
      )} ${lat.toFixed(4)})&datetime=${year + 1}%2F${
        year - 1
      }&include_coverage_data=true&coverage_data_smoothing=MOVING_AVERAGE_11_YEARS&include_coverage_related_data=true`;

    return this.instance.get<any>(url);
  };

  public getBarometroClimatico = () => {
    //let url = `https://arpav.geobeyond.dev/api/v2/coverages/time-series/climate-barometer?data_smoothing=MOVING_AVERAGE_11_YEARS&include_uncertainty=true`;
    let url =
      process.env.REACT_APP_BACKEND_PUBLIC_URL +
      `/api/v2/coverages/time-series/climate-barometer?data_smoothing=MOVING_AVERAGE_11_YEARS&include_uncertainty=true`;
    console.log(url);
    return this.instance.get<any>(url);
  };

  public findMunicipality = (lat, lng) => {
    return this.instance.get<any>(
      //`https://arpav.geobeyond.dev/api/v2/municipalities/municipalities?coords=POINT(${lng} ${lat})`,
      process.env.REACT_APP_BACKEND_PUBLIC_URL +
        `/api/v2/municipalities/municipalities?coords=POINT(${lng} ${lat})`,
    );
  };

  public downloadTimeseries = params =>
    this.instance.post<any>(`/maps/ncss/timeserie/`, params, {
      responseType: 'blob',
    });

  public getNetcdf = (params: iNetcdfDownload) =>
    this.instance.post<any>(`/maps/ncss/netcdf/`, params, {
      responseType: 'blob',
    });

  // public getNetcdf = (params) => {
  //   return this.instance.get<any>(`/maps/ncss/netcdf/?${(new URLSearchParams(params)).toString()}`, {responseType: 'blob'});
  // }

  public getConfigurationParams = (force: boolean = false) => {
    const c = localStorage.getItem('configs');
    if (c) {
      return Promise.resolve(JSON.parse(c));
    }
    return this.instance
      .get<any>(
        //'https://arpav.geobeyond.dev/api/v2/coverages/configuration-parameters?offset=0&limit=100',
        process.env.REACT_APP_BACKEND_PUBLIC_URL +
          '/api/v2/coverages/configuration-parameters?offset=0&limit=100',
      )
      .then((d: any) => {
        return d.items;
      })
      .then((d: any) => {
        localStorage.setItem('configs', JSON.stringify(d));
        return d;
      });
  };

  public getAttributes = (
    mode: string = 'forecast',
    force: boolean = false,
  ) => {
    let reqs: any[] = [];

    const ret = this.instance
      .get<any>(
        //'https://arpav.geobeyond.dev/api/v2/coverages/configuration-parameters?offset=0&limit=100',
        process.env.REACT_APP_BACKEND_PUBLIC_URL +
          '/api/v2/coverages/configuration-parameters?offset=0&limit=100',
      )
      .then((d: any) => {
        return d.items;
      });
    reqs.push(ret);
    if (mode === 'forecast') {
      const cret = this.instance.get<any>(
        //'https://arpav.geobeyond.dev/api/v2/coverages/forecast-variable-combinations',
        process.env.REACT_APP_BACKEND_PUBLIC_URL +
          '/api/v2/coverages/forecast-variable-combinations',
      );
      reqs.push(cret);
    } else {
      const cret = this.instance.get<any>(
        //'https://arpav.geobeyond.dev/api/v2/coverages/historical-variable-combinations',
        process.env.REACT_APP_BACKEND_PUBLIC_URL +
          '/api/v2/coverages/historical-variable-combinations',
      );
      reqs.push(cret);
    }

    const p = Promise.all(reqs).then(x => {
      localStorage.setItem('configs', JSON.stringify(x[0]));
      localStorage.setItem('combs::' + mode, JSON.stringify(x[1]));
      return {
        items: x[0],
        combinations: x[1].combinations,
      };
    });
    return p;
  };

  public getForecastAttribute = (attribute, params = {}) => {};
}
