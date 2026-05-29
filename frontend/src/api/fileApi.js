import { requestBlob } from './httpClient';

export const fileApi = {
  getBlob(path, options = {}, config = { auth: true }) {
    return requestBlob(path, options, config);
  },
};
