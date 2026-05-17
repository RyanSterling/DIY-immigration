import { parse, stringify } from 'qs';

type QueryParamValue =
  | string
  | number
  | boolean
  | object
  | null
  | undefined
  | QueryParamValue[]
  | { [key: string]: QueryParamValue };

export type QueryParams = Record<string, QueryParamValue>;

export const parseParams = (queryString: string): QueryParams =>
  parse(queryString, { allowDots: true }) as QueryParams;

export const stringifyParams = (params: QueryParams): string =>
  stringify(params, {
    skipNulls: true,
    addQueryPrefix: true,
    allowDots: true,
    encode: false,
  });
