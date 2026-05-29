import { requestData } from './httpClient';

const authConfig = { auth: true };

export const supervisionApi = {
  getTestingOverview() {
    return requestData('/assignments/testing-overview', {}, authConfig);
  },
};
